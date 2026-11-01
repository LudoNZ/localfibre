"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import EditModal from "@/components/ui/EditModal";
import {
  SERVICE_PART_STATES,
  SERVICE_PART_STATE_LABELS,
  ServiceNote,
  ServicePart,
  ServicePartState,
  SewingMachine,
  dedupe,
  machineLabel,
  sameName,
  serviceHours,
} from "@/lib/sewingMachines";
import { FundingPool, Purchase, money } from "@/lib/funding";
import PurchaseForm, { PurchasePrefill } from "./PurchaseForm";
import { AdminApi, MachineLibrary, formatDate, openReceipt } from "./machineShared";
import { today } from "./csv";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

interface ServiceModalProps {
  api: AdminApi;
  user: User | null;
  machine: SewingMachine;
  machines: SewingMachine[];
  library: MachineLibrary;
  pools: FundingPool[];
  purchases: Purchase[];
  payers: string[];
  reloadLibrary: () => Promise<void>;
  reloadMachines: () => Promise<void>;
  reloadFunding: () => Promise<void>;
}

const emptyNote = () => ({ date: today(), text: "", volunteer: "", hours: "" });

/** Faulty parts, purchases and service notes for one machine. Changes save as you go. */
export default function ServicePanel({
  api,
  user,
  machine,
  machines,
  library,
  pools,
  purchases,
  payers,
  reloadLibrary,
  reloadMachines,
  reloadFunding,
}: ServiceModalProps) {
  const [parts, setParts] = useState<ServicePart[]>(machine.serviceParts || []);
  const [log, setLog] = useState<ServiceNote[]>(machine.serviceLog || []);
  const [newPart, setNewPart] = useState("");
  const [newPartDefault, setNewPartDefault] = useState(false);
  const [note, setNote] = useState(emptyNote);
  const [purchaseForm, setPurchaseForm] = useState<{ editing: Purchase | null; prefill?: PurchasePrefill } | null>(
    null
  );
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const editable = machine.status === "servicing";
  const type = library.types.find((t) => t.id === machine.typeId);
  const offered = dedupe([...(type?.serviceParts ?? []), ...parts.map((p) => p.name)]);
  const isFlagged = (name: string) => parts.some((p) => sameName(p.name, name));
  const machinePurchases = purchases.filter((p) => p.machineId === machine.id);
  const poolName = (id: string) => pools.find((p) => p.id === id)?.name ?? "Unknown pool";
  const volunteers = dedupe(
    machines.flatMap((m) => (m.serviceLog || []).map((n) => n.volunteer)).filter(Boolean)
  );

  const save = async (nextParts: ServicePart[], nextLog: ServiceNote[]) => {
    setParts(nextParts);
    setLog(nextLog);
    setSavingState("saving");
    setError("");
    try {
      await api(`/api/machines/${machine.id}`, {
        method: "PUT",
        body: JSON.stringify({ serviceParts: nextParts, serviceLog: nextLog }),
      });
      setSavingState("saved");
      await reloadMachines();
    } catch (err) {
      setSavingState("idle");
      setError(err instanceof Error ? err.message : "Failed to save the service record");
    }
  };

  const toggleFlag = (name: string) =>
    save(
      isFlagged(name)
        ? parts.filter((p) => !sameName(p.name, name))
        : [...parts, { name, state: "problem", note: "" }],
      log
    );

  const updatePart = (name: string, changes: Partial<ServicePart>) =>
    save(
      parts.map((p) => (p.name === name ? { ...p, ...changes } : p)),
      log
    );

  const addPart = async () => {
    const name = newPart.trim();
    if (!name) return;
    setError("");
    try {
      if (newPartDefault && type && !type.serviceParts.some((p) => sameName(p, name))) {
        await api(`/api/machine-library/types/${type.id}`, {
          method: "PUT",
          body: JSON.stringify({ serviceParts: [...type.serviceParts, name] }),
        });
        await reloadLibrary();
      }
      setNewPart("");
      if (!isFlagged(name)) await save([...parts, { name, state: "problem", note: "" }], log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add part");
    }
  };

  const addNote = async () => {
    const hours = note.hours.trim() === "" ? null : Number(note.hours);
    if (!note.text.trim() && !hours) return;
    if (hours !== null && !(hours > 0)) {
      setError("Hours must be a number above 0");
      return;
    }
    const entry: ServiceNote = {
      id: Math.random().toString(36).slice(2, 10),
      date: note.date || today(),
      text: note.text.trim(),
      volunteer: note.volunteer.trim(),
      hours,
    };
    await save(parts, [...log, entry].sort((a, b) => a.date.localeCompare(b.date)));
    // Keep the volunteer and date for the next line; they're usually the same
    setNote((n) => ({ ...emptyNote(), date: n.date, volunteer: n.volunteer }));
  };

  // Put a note back into the add box to change it
  const editNote = (entry: ServiceNote) => {
    setNote({
      date: entry.date,
      text: entry.text,
      volunteer: entry.volunteer,
      hours: entry.hours ? String(entry.hours) : "",
    });
    save(
      parts,
      log.filter((n) => n.id !== entry.id)
    );
  };

  const onPurchaseSaved = async () => {
    const prefillPart = purchaseForm?.prefill?.part;
    setPurchaseForm(null);
    await reloadFunding();
    // A part that's been ordered is waiting for it
    if (prefillPart && purchaseForm?.prefill?.status === "ordered") {
      const part = parts.find((p) => sameName(p.name, prefillPart));
      if (part && part.state !== "waiting") await updatePart(part.name, { state: "waiting" });
    }
  };

  const hours = serviceHours({ serviceLog: log });
  const spent = machinePurchases.reduce((total, p) => total + p.amount, 0);

  return (
    <div className={styles.service}>
      {error && <div className={adminStyles.error}>{error}</div>}
      {!editable && (
        <p className={styles.hint}>
          Service history. Parts and notes can be changed while the machine is Being serviced.
        </p>
      )}

      {/* Faulty parts */}
      <section className={styles.serviceSection}>
        <div className={styles.labelRow}>
          <h3 className={styles.libraryHeading}>Parts</h3>
          {savingState !== "idle" && (
            <span className={styles.saveState}>{savingState === "saving" ? "Saving…" : "Saved"}</span>
          )}
        </div>
        {editable && (
          <>
            <p className={styles.hint}>Tap the parts that have a problem.</p>
            <div className={styles.chips}>
              {offered.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.chip} ${isFlagged(name) ? styles.chipProblem : ""}`}
                  aria-pressed={isFlagged(name)}
                  onClick={() => toggleFlag(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        {parts.length > 0 ? (
          <ul className={styles.partList}>
            {parts.map((part) => (
              <li key={part.name} className={`${styles.partRow} ${styles[`part_${part.state}`]}`}>
                <div className={styles.customItemHead}>
                  <strong>{part.name}</strong>
                  {editable && (
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => toggleFlag(part.name)}
                      aria-label={`Remove ${part.name}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {editable ? (
                  <>
                    <div className={styles.segmented} role="radiogroup" aria-label={`${part.name} state`}>
                      {SERVICE_PART_STATES.map((state) => (
                        <button
                          key={state}
                          type="button"
                          role="radio"
                          aria-checked={part.state === state}
                          className={part.state === state ? styles.segmentActive : undefined}
                          onClick={() => updatePart(part.name, { state: state as ServicePartState })}
                        >
                          {SERVICE_PART_STATE_LABELS[state]}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className={styles.inlineInput}
                      defaultValue={part.note}
                      placeholder="Note, e.g. cracked, ordered 10mm"
                      aria-label={`Note for ${part.name}`}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== part.note) updatePart(part.name, { note: e.target.value.trim() });
                      }}
                    />
                    {part.state === "waiting" &&
                      !machinePurchases.some((p) => sameName(p.part, part.name)) && (
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() =>
                            setPurchaseForm({
                              editing: null,
                              prefill: {
                                machineId: machine.id,
                                part: part.name,
                                description: part.name,
                                status: "ordered",
                              },
                            })
                          }
                        >
                          + Log the order for this part
                        </button>
                      )}
                  </>
                ) : (
                  <p className={styles.hint}>
                    {SERVICE_PART_STATE_LABELS[part.state]}
                    {part.note && ` · ${part.note}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          !editable && <p className={styles.hint}>No parts flagged.</p>
        )}

        {editable && (
          <div className={styles.addPart}>
            <div className={styles.addItemRow}>
              <input
                type="text"
                value={newPart}
                onChange={(e) => setNewPart(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPart();
                  }
                }}
                placeholder="Another part, e.g. Bobbin winder"
                aria-label="Add a part"
              />
              <button type="button" className="btn-secondary" onClick={addPart} disabled={!newPart.trim()}>
                Add
              </button>
            </div>
            {newPart.trim() && type && (
              <div className={styles.segmented} role="radiogroup" aria-label="Save the new part for">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!newPartDefault}
                  className={!newPartDefault ? styles.segmentActive : undefined}
                  onClick={() => setNewPartDefault(false)}
                >
                  Just this machine
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={newPartDefault}
                  className={newPartDefault ? styles.segmentActive : undefined}
                  onClick={() => setNewPartDefault(true)}
                >
                  Add to the {type.name.toLowerCase()} parts list
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Purchases */}
      <section className={styles.serviceSection}>
        <div className={styles.labelRow}>
          <h3 className={styles.libraryHeading}>Purchases {spent > 0 && `· ${money(spent)}`}</h3>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setPurchaseForm({ editing: null, prefill: { machineId: machine.id } })}
          >
            + Log purchase
          </button>
        </div>
        {machinePurchases.length === 0 ? (
          <p className={styles.hint}>Nothing bought for this machine yet.</p>
        ) : (
          <ul className={styles.purchaseList}>
            {machinePurchases.map((p) => (
              <li key={p.id} className={styles.purchaseItem}>
                <div>
                  <strong>{p.description}</strong> · {money(p.amount)}
                  <span className={styles.applicantMeta}>
                    {formatDate(p.date)} · {poolName(p.poolId)} · {p.status === "ordered" ? "Ordered" : "Received"}
                    {p.supplier && ` · ${p.supplier}`}
                  </span>
                </div>
                <div className={styles.purchaseActions}>
                  {p.receipt ? (
                    <button type="button" className={styles.textButton} onClick={() => openReceipt(user, p.receipt!)}>
                      Receipt
                    </button>
                  ) : (
                    <span className={styles.missingReceipt}>No receipt</span>
                  )}
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setPurchaseForm({ editing: p })}
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Service notes and volunteer time */}
      <section className={styles.serviceSection}>
        <h3 className={styles.libraryHeading}>Service notes {hours > 0 && `· ${hours} h`}</h3>
        {log.length === 0 ? (
          <p className={styles.hint}>No notes yet.</p>
        ) : (
          <ul className={styles.noteList}>
            {log.map((entry) => (
              <li key={entry.id} className={styles.noteItem}>
                <div>
                  <span className={styles.noteText}>{entry.text || "Time logged"}</span>
                  <span className={styles.applicantMeta}>
                    {formatDate(entry.date)}
                    {entry.volunteer && ` · ${entry.volunteer}`}
                    {entry.hours && ` · ${entry.hours} h`}
                  </span>
                </div>
                {editable && (
                  <div className={styles.purchaseActions}>
                    <button type="button" className={styles.textButton} onClick={() => editNote(entry)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() =>
                        save(
                          parts,
                          log.filter((n) => n.id !== entry.id)
                        )
                      }
                      aria-label="Delete note"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && (
          <div className={styles.noteForm}>
            <input
              type="text"
              value={note.text}
              onChange={(e) => setNote((n) => ({ ...n, text: e.target.value }))}
              placeholder="What was done, e.g. fixed timing, new belt"
              aria-label="Service note"
            />
            <div className={styles.noteFormRow}>
              <input
                type="date"
                value={note.date}
                onChange={(e) => setNote((n) => ({ ...n, date: e.target.value }))}
                aria-label="Date"
              />
              <input
                type="text"
                list="volunteer-names"
                value={note.volunteer}
                onChange={(e) => setNote((n) => ({ ...n, volunteer: e.target.value }))}
                placeholder="Volunteer"
                aria-label="Volunteer"
              />
              <datalist id="volunteer-names">
                {volunteers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={note.hours}
                onChange={(e) => setNote((n) => ({ ...n, hours: e.target.value }))}
                placeholder="Hours"
                aria-label="Hours"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={addNote}
                disabled={!note.text.trim() && !note.hours.trim()}
              >
                Add note
              </button>
            </div>
          </div>
        )}
      </section>

      <EditModal
        isOpen={!!purchaseForm}
        onClose={() => setPurchaseForm(null)}
        title={purchaseForm?.editing ? "Edit purchase" : `Purchase for ${machineLabel(machine)}`}
        wide
      >
        {purchaseForm && (
          <PurchaseForm
            api={api}
            user={user}
            pools={pools}
            machines={machines}
            payers={payers}
            editing={purchaseForm.editing}
            prefill={purchaseForm.prefill}
            onSaved={onPurchaseSaved}
          />
        )}
      </EditModal>
    </div>
  );
}

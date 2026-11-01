"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import EditModal from "@/components/ui/EditModal";
import {
  MACHINE_CONDITION_LABELS,
  MACHINE_STATUS_LABELS,
  MachineStatus,
  OPEN_STATUSES,
  SewingMachine,
  WorkshopStatus,
  isAwaitingParts,
  isoToDay,
  machineLabel,
  machineReadyMailto,
  openServiceParts,
  serviceSummary,
} from "@/lib/sewingMachines";
import { FundingPool, Purchase } from "@/lib/funding";
import ServicePanel from "./ServiceModal";
import { today } from "./csv";
import AssignFields from "./AssignFields";
import MachineForm from "./MachineForm";
import MachineLibraryEditor from "./MachineLibraryEditor";
import MachinesReport from "./MachinesReport";
import {
  AssignChoice,
  MachineLibrary,
  WaitingApplication,
  assignBody,
  formatDate,
  useAdminApi,
} from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

type Filter = MachineStatus | "assigned" | "awaitingParts" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "servicing", label: "Being serviced" },
  { id: "awaitingParts", label: "Awaiting parts" },
  { id: "ready", label: "Ready to go" },
  { id: "assigned", label: "Assigned" },
  { id: "repurposed", label: "Handed over" },
];

// Promised to someone but not handed over yet
const isAssigned = (m: SewingMachine) => !!m.recipient && m.status !== "repurposed";

const matchesFilter = (m: SewingMachine, filter: Filter) =>
  filter === "all"
    ? true
    : filter === "assigned"
      ? isAssigned(m)
      : filter === "awaitingParts"
        ? m.status === "servicing" && isAwaitingParts(m)
        : m.status === filter;

// The next step in the workshop for each status
const NEXT_STEP: Partial<Record<MachineStatus, { status: WorkshopStatus; label: string }>> = {
  incoming: { status: "servicing", label: "Mark received" },
  servicing: { status: "ready", label: "Mark ready" },
};

export default function MachinesPanel({ user }: { user: User | null }) {
  const [machines, setMachines] = useState<SewingMachine[]>([]);
  const [applications, setApplications] = useState<WaitingApplication[]>([]);
  const [library, setLibrary] = useState<MachineLibrary>({ types: [], brands: [] });
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"machines" | "report">("machines");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add/edit modal (the key remounts the form with fresh state each time it opens)
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<SewingMachine | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [servicingId, setServicingId] = useState<string | null>(null);
  const [handingOver, setHandingOver] = useState<{ machine: SewingMachine; date: string } | null>(null);

  // Funding pools and purchases, for logging what servicing costs
  const [pools, setPools] = useState<FundingPool[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Assign modal
  const [assigning, setAssigning] = useState<SewingMachine | null>(null);
  const [assignChoice, setAssignChoice] = useState<AssignChoice>({ mode: "none" });
  const [assignedEmail, setAssignedEmail] = useState<{ name: string; href: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const api = useAdminApi(user);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [machineData, appData] = await Promise.all([
        api("/api/machines"),
        api("/api/sewing-machines"),
      ]);
      setMachines((machineData.machines as SewingMachine[]) || []);
      setApplications((appData.applications as WaitingApplication[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machines");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadLibrary = useCallback(async () => {
    try {
      const data = await api("/api/machine-library");
      setLibrary(data as unknown as MachineLibrary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the machine library");
    }
  }, [api]);

  const loadFunding = useCallback(async () => {
    try {
      const [poolData, purchaseData] = await Promise.all([api("/api/funding-pools"), api("/api/purchases")]);
      setPools((poolData.pools as FundingPool[]) || []);
      setPurchases((purchaseData.purchases as Purchase[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load funding");
    }
  }, [api]);

  useEffect(() => {
    loadData();
    loadLibrary();
    loadFunding();
  }, [loadData, loadLibrary, loadFunding]);

  // Renaming a brand or model also renames logged machines, so refresh both
  const reloadLibraryAndMachines = useCallback(async () => {
    await Promise.all([loadLibrary(), loadData()]);
  }, [loadLibrary, loadData]);

  // People still waiting without a machine, oldest application first
  const openApplications = applications.filter((app) => OPEN_STATUSES.includes(app.status as never));
  const queueNumbers = new Map(openApplications.map((app, i) => [app.id, i + 1]));
  const assignable = openApplications.filter((app) => !app.machineId);

  const countFor = (id: Filter) => machines.filter((m) => matchesFilter(m, id)).length;
  const visible = machines.filter((m) => matchesFilter(m, filter));

  const openForm = (machine: SewingMachine | null) => {
    setEditing(machine);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const setStatus = async (machine: SewingMachine, status: WorkshopStatus) => {
    const open = openServiceParts(machine);
    if (status === "ready" && open.length) {
      const list = open.map((p) => `${p.name} (${p.state === "waiting" ? "waiting for a part" : "problem"})`);
      if (!confirm(`Still to sort: ${list.join(", ")}. Mark ${machineLabel(machine)} ready anyway?`)) return;
    }
    setError("");
    try {
      await api(`/api/machines/${machine.id}`, { method: "PUT", body: JSON.stringify({ status }) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update machine");
    }
  };

  const handOver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handingOver) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/machines/${handingOver.machine.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "repurposed", date: handingOver.date }),
      });
      setHandingOver(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update machine");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (machine: SewingMachine, action: "unassign", confirmText: string) => {
    if (!confirm(confirmText)) return;
    setError("");
    try {
      await api(`/api/machines/${machine.id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update machine");
    }
  };

  const handleDelete = async (machine: SewingMachine) => {
    const promised = machine.recipient ? ` It's promised to ${machine.recipient.fullName}.` : "";
    if (!confirm(`Delete ${machineLabel(machine)}?${promised} This can't be undone.`)) return;
    setError("");
    try {
      await api(`/api/machines/${machine.id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete machine");
    }
  };

  const openAssign = (machine: SewingMachine) => {
    setAssigning(machine);
    setAssignChoice(
      assignable.length
        ? { mode: "waiting", applicationId: assignable[0].id }
        : { mode: "manual", fullName: "", phone: "", email: "", area: "" }
    );
    setAssignedEmail(null);
  };

  const closeAssign = () => {
    setAssigning(null);
    setAssignedEmail(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = assignBody(assignChoice);
    if (!assigning || !body) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/machines/${assigning.id}`, { method: "PATCH", body: JSON.stringify(body) });
      const recipient =
        assignChoice.mode === "waiting"
          ? (() => {
              const app = applications.find((a) => a.id === assignChoice.applicationId)!;
              return { ...app, applicationId: app.id, phone: "" };
            })()
          : assignChoice.mode === "manual"
            ? { ...assignChoice, applicationId: null, groupName: null }
            : null;
      if (recipient) {
        // Only offer the "it's ready" email once the machine actually is
        const href =
          assigning.status === "ready" && recipient.email ? machineReadyMailto(assigning, recipient) : null;
        setAssignedEmail({ name: recipient.fullName, href });
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign machine");
    } finally {
      setSaving(false);
    }
  };

  const servicingMachine = machines.find((m) => m.id === servicingId) ?? null;
  // People who've paid for things themselves before
  const payers = [...new Set(purchases.map((p) => p.paidBy).filter((p) => p && p !== "pool"))];

  const readyCount = machines.filter((m) => m.status === "ready").length;
  const handedOverCount = machines.filter((m) => m.status === "repurposed").length;
  const canSubmitAssign =
    assignChoice.mode === "waiting"
      ? !!assignChoice.applicationId
      : assignChoice.mode === "manual" && !!assignChoice.fullName.trim();

  return (
    <div className={adminStyles.section}>
      <div className={adminStyles.sectionHeader}>
        <h2>Sewing Machines</h2>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={() => setLibraryOpen(true)}>
            Library
          </button>
          <button className="btn-primary" onClick={() => openForm(null)} disabled={!library.types.length}>
            Add Machine
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{readyCount}</span>
          <span className={styles.statLabel}>Ready to go</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{assignable.length}</span>
          <span className={styles.statLabel}>People waiting</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{handedOverCount}</span>
          <span className={styles.statLabel}>Handed over</span>
        </div>
      </div>

      <div className={styles.segmented} role="tablist" aria-label="Machines view">
        {(
          [
            ["machines", "Machines"],
            ["report", "Report"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            className={view === id ? styles.segmentActive : undefined}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && !formOpen && !assigning && !handingOver && <div className={adminStyles.error}>{error}</div>}

      {loading ? (
        <p>Loading machines...</p>
      ) : view === "report" ? (
        <MachinesReport machines={machines} purchases={purchases} />
      ) : (
        <>
          <div className={adminStyles.filterGroup} role="group" aria-label="Filter machines">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                className={`${adminStyles.filterChip} ${filter === id ? adminStyles.filterChipActive : ""}`}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label} ({countFor(id)})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className={adminStyles.empty}>
              {machines.length === 0 ? "No machines yet. Add your first machine above." : "No machines here."}
            </p>
          ) : (
            <div className={styles.machineList}>
              {visible.map((machine) => {
                const next = NEXT_STEP[machine.status];
                const handedOver = machine.status === "repurposed";
                return (
                  <article key={machine.id} className={styles.machineCard}>
                    {machine.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={machine.photos[0]} alt={machineLabel(machine)} className={styles.machinePhoto} />
                    ) : (
                      <div className={styles.photoPlaceholder} aria-hidden="true">
                        No photo
                      </div>
                    )}

                    <div className={styles.machineBody}>
                      <div className={styles.machineTitleRow}>
                        <h3>{machineLabel(machine)}</h3>
                        <span className={`${styles.statusBadge} ${styles[machine.status]}`}>
                          {MACHINE_STATUS_LABELS[machine.status] ?? machine.status}
                        </span>
                        {isAssigned(machine) && (
                          <span className={`${styles.statusBadge} ${styles.assigned}`}>Assigned</span>
                        )}
                        {machine.status === "servicing" && isAwaitingParts(machine) && (
                          <span className={`${styles.statusBadge} ${styles.awaiting}`}>
                            Waiting:{" "}
                            {machine.serviceParts
                              .filter((p) => p.state === "waiting")
                              .map((p) => p.name.toLowerCase())
                              .join(", ")}
                          </span>
                        )}
                      </div>

                      <dl className={styles.specs}>
                        {machine.typeName && (
                          <>
                            <dt>Type</dt>
                            <dd>{machine.typeName}</dd>
                          </>
                        )}
                        {machine.condition && (
                          <>
                            <dt>Condition</dt>
                            <dd className={styles.conditionDisplay}>
                              <span className={styles.pips} aria-hidden="true">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <span key={n} className={n <= machine.condition! ? styles.pipOn : styles.pip} />
                                ))}
                              </span>
                              {MACHINE_CONDITION_LABELS[machine.condition]}
                            </dd>
                          </>
                        )}
                        {machine.serialNumber && (
                          <>
                            <dt>Serial</dt>
                            <dd>{machine.serialNumber}</dd>
                          </>
                        )}
                        {machine.comesWith?.length > 0 && (
                          <>
                            <dt>Comes with</dt>
                            <dd>{machine.comesWith.join(", ")}</dd>
                          </>
                        )}
                        {machine.notes && (
                          <>
                            <dt>Notes</dt>
                            <dd>{machine.notes}</dd>
                          </>
                        )}
                        {machine.photos?.length > 1 && (
                          <>
                            <dt>Photos</dt>
                            <dd>{machine.photos.length}</dd>
                          </>
                        )}
                      </dl>

                      {machine.status !== "servicing" && serviceSummary(machine) && (
                        <button
                          type="button"
                          className={styles.historyLine}
                          onClick={() => setServicingId(machine.id)}
                        >
                          <span className={styles.recipientLabel}>Service history</span>
                          <span>{serviceSummary(machine)}</span>
                        </button>
                      )}

                      {machine.recipient && (
                        <div className={styles.recipient}>
                          <p className={styles.recipientLabel}>{handedOver ? "Given to" : "Assigned to"}</p>
                          <p className={styles.recipientName}>
                            {machine.recipient.fullName}
                            {machine.recipient.groupName && ` (${machine.recipient.groupName})`}
                          </p>
                          <p className={styles.recipientContact}>
                            {machine.recipient.email && (
                              <a href={`mailto:${machine.recipient.email}`}>{machine.recipient.email}</a>
                            )}
                            {machine.recipient.phone && (
                              <a href={`tel:${machine.recipient.phone.replace(/[^\d+]/g, "")}`}>
                                {machine.recipient.phone}
                              </a>
                            )}
                            {machine.recipient.area && <span>{machine.recipient.area}</span>}
                          </p>
                          <p className={styles.recipientDates}>
                            {machine.recipient.applicationId ? "From the waiting list · " : ""}
                            Assigned {formatDate(machine.assignedAt)}
                            {machine.repurposedAt && ` · Handed over ${formatDate(machine.repurposedAt)}`}
                          </p>
                        </div>
                      )}

                      <div className={styles.machineActions}>
                        {next && (
                          <button className="btn-primary" onClick={() => setStatus(machine, next.status)}>
                            {next.label}
                          </button>
                        )}
                        {!machine.recipient && !handedOver && (
                          <button
                            className={next ? "btn-secondary" : "btn-primary"}
                            onClick={() => openAssign(machine)}
                          >
                            Assign
                          </button>
                        )}
                        {machine.status === "ready" && machine.recipient && (
                          <>
                            {machine.recipient.email && (
                              <a className="btn-primary" href={machineReadyMailto(machine, machine.recipient)}>
                                Email recipient
                              </a>
                            )}
                            <button
                              className="btn-secondary"
                              onClick={() => setHandingOver({ machine, date: today() })}
                            >
                              Mark handed over
                            </button>
                          </>
                        )}
                        {machine.status === "servicing" && (
                          <button className="btn-secondary" onClick={() => setServicingId(machine.id)}>
                            Service
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => openForm(machine)}>
                          Edit
                        </button>
                        {machine.status === "ready" && (
                          <button className={styles.textButton} onClick={() => setStatus(machine, "servicing")}>
                            Back to servicing
                          </button>
                        )}
                        {isAssigned(machine) && (
                          <button
                            className={styles.textButton}
                            onClick={() =>
                              runAction(
                                machine,
                                "unassign",
                                `Unassign ${machineLabel(machine)}?${
                                  machine.recipient?.applicationId
                                    ? ` ${machine.recipient.fullName} goes back on the waiting list.`
                                    : ""
                                }`
                              )
                            }
                          >
                            Unassign
                          </button>
                        )}
                        {!handedOver && (
                          <button className={adminStyles.deleteBtn} onClick={() => handleDelete(machine)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / edit machine */}
      <EditModal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? `Edit ${machineLabel(editing)}` : "Add Machine"}
        wide
      >
        <MachineForm
          key={formKey}
          api={api}
          library={library}
          reloadLibrary={reloadLibraryAndMachines}
          editing={editing}
          machines={machines}
          assignable={assignable}
          queueNumbers={queueNumbers}
          onSaved={async () => {
            closeForm();
            await loadData();
          }}
        />
      </EditModal>

      {/* Hand over, on a chosen date */}
      <EditModal
        isOpen={!!handingOver}
        onClose={() => setHandingOver(null)}
        title={handingOver ? `Hand over ${machineLabel(handingOver.machine)}` : "Hand over"}
      >
        {handingOver && (
          <form onSubmit={handOver} className={`${adminStyles.form} ${styles.modalForm}`}>
            {error && <div className={adminStyles.error}>{error}</div>}
            <p className={styles.hint}>
              To <strong>{handingOver.machine.recipient?.fullName}</strong>. This adds it to the handed-over log.
            </p>
            <div className={adminStyles.formGroup}>
              <label htmlFor="handover-date">Handed over on</label>
              <input
                id="handover-date"
                type="date"
                value={handingOver.date}
                min={isoToDay(handingOver.machine.createdAt)}
                max={today()}
                onChange={(e) => setHandingOver((h) => (h ? { ...h, date: e.target.value } : h))}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving || !handingOver.date}>
              {saving ? "Saving..." : "Mark handed over"}
            </button>
          </form>
        )}
      </EditModal>

      {/* Faulty parts, purchases and service notes */}
      <EditModal
        isOpen={!!servicingMachine}
        onClose={() => setServicingId(null)}
        title={servicingMachine ? `Service ${machineLabel(servicingMachine)}` : "Service"}
        wide
      >
        {servicingMachine && (
          <ServicePanel
            key={servicingMachine.id}
            api={api}
            user={user}
            machine={servicingMachine}
            machines={machines}
            library={library}
            pools={pools}
            purchases={purchases}
            payers={payers}
            reloadLibrary={loadLibrary}
            reloadMachines={loadData}
            reloadFunding={loadFunding}
          />
        )}
      </EditModal>

      {/* Brands, models, types and their comes-with lists */}
      <EditModal isOpen={libraryOpen} onClose={() => setLibraryOpen(false)} title="Machine library"
        wide>
        <MachineLibraryEditor
          api={api}
          library={library}
          machines={machines}
          reloadLibrary={reloadLibraryAndMachines}
        />
      </EditModal>

      {/* Promise a machine to someone, at any stage */}
      <EditModal
        isOpen={!!assigning}
        onClose={closeAssign}
        title={assigning ? `Assign ${machineLabel(assigning)}` : "Assign"}
      >
        {assignedEmail ? (
          <div className={styles.assignDone}>
            <p>
              Assigned to <strong>{assignedEmail.name}</strong>.
              {assignChoice.mode === "waiting" && " Their waiting list status is now “Contacted”."}
            </p>
            {assignedEmail.href && (
              <a className="btn-primary" href={assignedEmail.href}>
                Open pre-written email
              </a>
            )}
            <button type="button" className={styles.textButton} onClick={closeAssign}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleAssign} className={styles.assignForm}>
            {error && <div className={adminStyles.error}>{error}</div>}
            <AssignFields
              value={assignChoice}
              onChange={setAssignChoice}
              assignable={assignable}
              queueNumbers={queueNumbers}
            />
            <button type="submit" className="btn-primary" disabled={!canSubmitAssign || saving}>
              {saving ? "Assigning..." : "Assign"}
            </button>
          </form>
        )}
      </EditModal>
    </div>
  );
}

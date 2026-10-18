"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { optimiseImage } from "@/lib/imageUpload";
import EditModal from "@/components/ui/EditModal";
import {
  MACHINE_CONDITIONS,
  MACHINE_STATUS_LABELS,
  MachineStatus,
  OPEN_STATUSES,
  SewingMachine,
  machineLabel,
  machineReadyMailto,
} from "@/lib/sewingMachines";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

interface WaitingApplication {
  id: string;
  fullName: string;
  email: string;
  area: string;
  applicantType: "individual" | "communityGroup";
  groupName: string | null;
  status: string;
  machineId?: string;
  createdAt: string | null;
}

type Filter = MachineStatus | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "servicing", label: "Being serviced" },
  { id: "ready", label: "Ready to go" },
  { id: "assigned", label: "Assigned" },
  { id: "repurposed", label: "Repurposed log" },
];

const emptyForm = {
  brand: "",
  model: "",
  serialNumber: "",
  condition: "",
  accessories: "",
  notes: "",
  photos: [] as string[],
  status: "servicing" as MachineStatus,
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

export default function MachinesPanel({ user }: { user: User | null }) {
  const [machines, setMachines] = useState<SewingMachine[]>([]);
  const [applications, setApplications] = useState<WaitingApplication[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SewingMachine | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assign modal
  const [assigning, setAssigning] = useState<SewingMachine | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [assignedEmail, setAssignedEmail] = useState<{ name: string; href: string } | null>(null);

  const api = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const token = await user?.getIdToken();
      const res = await fetch(url, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");
      return data;
    },
    [user]
  );

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [machineData, appData] = await Promise.all([
        api("/api/machines"),
        api("/api/sewing-machines"),
      ]);
      setMachines(machineData.machines || []);
      setApplications(appData.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machines");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // People still waiting without a machine, oldest application first
  const openApplications = applications.filter((app) => OPEN_STATUSES.includes(app.status as never));
  const queueNumbers = new Map(openApplications.map((app, i) => [app.id, i + 1]));
  const assignable = openApplications.filter((app) => !app.machineId);

  const counts = machines.reduce(
    (acc, m) => ({ ...acc, [m.status]: (acc[m.status] || 0) + 1 }),
    {} as Record<string, number>
  );
  const visible = filter === "all" ? machines : machines.filter((m) => m.status === filter);

  const openAddForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (machine: SewingMachine) => {
    setEditing(machine);
    setForm({
      brand: machine.brand,
      model: machine.model,
      serialNumber: machine.serialNumber,
      condition: machine.condition,
      accessories: machine.accessories,
      notes: machine.notes,
      photos: machine.photos || [],
      status: machine.status,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          // Shrink phone photos before upload so pages and emails stay quick
          const { variants } = await optimiseImage(file, { widths: [1600] });
          const { blob, ext } = variants[variants.length - 1];
          const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "_");
          const storageRef = ref(storage, `sewingMachines/${Date.now()}-${safeName}.${ext}`);
          await uploadBytes(storageRef, blob, { contentType: blob.type });
          return getDownloadURL(storageRef);
        })
      );
      setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { status, ...details } = form;
      const canChangeStatus = !editing || ["servicing", "ready"].includes(editing.status);
      await api(editing ? `/api/machines/${editing.id}` : "/api/machines", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(canChangeStatus ? { ...details, status } : details),
      });
      closeForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save machine");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (machine: SewingMachine, status: "servicing" | "ready") => {
    setError("");
    try {
      await api(`/api/machines/${machine.id}`, { method: "PUT", body: JSON.stringify({ status }) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update machine");
    }
  };

  const runAction = async (machine: SewingMachine, action: "unassign" | "repurposed", confirmText: string) => {
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
    if (!confirm(`Delete ${machineLabel(machine)}? This can't be undone.`)) return;
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
    setSelectedApplicationId(assignable[0]?.id || "");
    setAssignedEmail(null);
  };

  const closeAssign = () => {
    setAssigning(null);
    setAssignedEmail(null);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigning || !selectedApplicationId) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/machines/${assigning.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "assign", applicationId: selectedApplicationId }),
      });
      const app = applications.find((a) => a.id === selectedApplicationId)!;
      const recipient = {
        applicationId: app.id,
        fullName: app.fullName,
        email: app.email,
        phone: "",
        area: app.area,
        groupName: app.groupName,
      };
      setAssignedEmail({ name: app.fullName, href: machineReadyMailto(assigning, recipient) });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign machine");
    } finally {
      setSaving(false);
    }
  };

  const canEditStatus = !editing || ["servicing", "ready"].includes(editing.status);

  return (
    <div className={adminStyles.section}>
      <div className={adminStyles.sectionHeader}>
        <h2>Sewing Machines</h2>
        <button className="btn-primary" onClick={openAddForm}>
          Add Machine
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{counts.ready || 0}</span>
          <span className={styles.statLabel}>Ready to go</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{assignable.length}</span>
          <span className={styles.statLabel}>People waiting</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{counts.repurposed || 0}</span>
          <span className={styles.statLabel}>Repurposed</span>
        </div>
      </div>

      <div className={adminStyles.filterGroup} role="group" aria-label="Filter machines">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            className={`${adminStyles.filterChip} ${filter === id ? adminStyles.filterChipActive : ""}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label} ({id === "all" ? machines.length : counts[id] || 0})
          </button>
        ))}
      </div>

      {error && <div className={adminStyles.error}>{error}</div>}

      {loading ? (
        <p>Loading machines...</p>
      ) : visible.length === 0 ? (
        <p className={adminStyles.empty}>
          {machines.length === 0 ? "No machines yet. Add your first machine above." : "No machines here."}
        </p>
      ) : (
        <div className={styles.machineList}>
          {visible.map((machine) => (
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
                    {MACHINE_STATUS_LABELS[machine.status]}
                  </span>
                </div>

                <dl className={styles.specs}>
                  {machine.condition && (
                    <>
                      <dt>Condition</dt>
                      <dd>{machine.condition}</dd>
                    </>
                  )}
                  {machine.serialNumber && (
                    <>
                      <dt>Serial</dt>
                      <dd>{machine.serialNumber}</dd>
                    </>
                  )}
                  {machine.accessories && (
                    <>
                      <dt>Comes with</dt>
                      <dd>{machine.accessories}</dd>
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

                {machine.recipient && (
                  <div className={styles.recipient}>
                    <p className={styles.recipientLabel}>
                      {machine.status === "repurposed" ? "Given to" : "Assigned to"}
                    </p>
                    <p className={styles.recipientName}>
                      {machine.recipient.fullName}
                      {machine.recipient.groupName && ` (${machine.recipient.groupName})`}
                    </p>
                    <p className={styles.recipientContact}>
                      <a href={`mailto:${machine.recipient.email}`}>{machine.recipient.email}</a>
                      {machine.recipient.phone && (
                        <a href={`tel:${machine.recipient.phone.replace(/[^\d+]/g, "")}`}>
                          {machine.recipient.phone}
                        </a>
                      )}
                      <span>{machine.recipient.area}</span>
                    </p>
                    <p className={styles.recipientDates}>
                      Assigned {formatDate(machine.assignedAt)}
                      {machine.repurposedAt && ` · Handed over ${formatDate(machine.repurposedAt)}`}
                    </p>
                  </div>
                )}

                <div className={styles.machineActions}>
                  {machine.status === "servicing" && (
                    <button className="btn-primary" onClick={() => setStatus(machine, "ready")}>
                      Mark ready
                    </button>
                  )}
                  {machine.status === "ready" && (
                    <button
                      className="btn-primary"
                      onClick={() => openAssign(machine)}
                      disabled={assignable.length === 0}
                      title={assignable.length === 0 ? "Nobody is waiting right now" : undefined}
                    >
                      Assign to applicant
                    </button>
                  )}
                  {machine.status === "assigned" && machine.recipient && (
                    <>
                      <a className="btn-primary" href={machineReadyMailto(machine, machine.recipient)}>
                        Email recipient
                      </a>
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          runAction(
                            machine,
                            "repurposed",
                            `Mark ${machineLabel(machine)} as handed over to ${machine.recipient!.fullName}?`
                          )
                        }
                      >
                        Mark handed over
                      </button>
                    </>
                  )}
                  <button className="btn-secondary" onClick={() => openEditForm(machine)}>
                    Edit
                  </button>
                  {machine.status === "ready" && (
                    <button className={styles.textButton} onClick={() => setStatus(machine, "servicing")}>
                      Back to servicing
                    </button>
                  )}
                  {machine.status === "assigned" && (
                    <button
                      className={styles.textButton}
                      onClick={() =>
                        runAction(
                          machine,
                          "unassign",
                          `Unassign ${machineLabel(machine)}? ${machine.recipient?.fullName} goes back on the waiting list.`
                        )
                      }
                    >
                      Unassign
                    </button>
                  )}
                  {(machine.status === "servicing" || machine.status === "ready") && (
                    <button className={adminStyles.deleteBtn} onClick={() => handleDelete(machine)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add / edit machine */}
      <EditModal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? `Edit ${machineLabel(editing)}` : "Add Machine"}
      >
        <form onSubmit={handleSave} className={adminStyles.form}>
          {error && <div className={adminStyles.error}>{error}</div>}
          <div className={adminStyles.formRow}>
            <div className={adminStyles.formGroup}>
              <label htmlFor="machine-brand">Brand *</label>
              <input
                id="machine-brand"
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Janome"
                required
              />
            </div>
            <div className={adminStyles.formGroup}>
              <label htmlFor="machine-model">Model</label>
              <input
                id="machine-model"
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. 2200XT"
              />
            </div>
            <div className={adminStyles.formGroup}>
              <label htmlFor="machine-serial">Serial number</label>
              <input
                id="machine-serial"
                type="text"
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </div>
          </div>
          <div className={adminStyles.formGroup}>
            <label htmlFor="machine-condition">Condition</label>
            <select
              id="machine-condition"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
            >
              <option value="">Not set</option>
              {MACHINE_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className={adminStyles.formGroup}>
            <label htmlFor="machine-accessories">Comes with</label>
            <input
              id="machine-accessories"
              type="text"
              value={form.accessories}
              onChange={(e) => setForm({ ...form, accessories: e.target.value })}
              placeholder="e.g. foot pedal, power cord, bobbins, cover"
            />
          </div>
          <div className={adminStyles.formGroup}>
            <label htmlFor="machine-notes">Notes</label>
            <textarea
              id="machine-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Features, servicing done, quirks..."
            />
            <p className={styles.hint}>Condition, accessories and notes are included in the email to the recipient.</p>
          </div>
          <div className={adminStyles.formGroup}>
            <label htmlFor="machine-photos">Photos (public)</label>
            <input
              id="machine-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className={adminStyles.fileInput}
              disabled={uploading}
            />
            {uploading && <p className={adminStyles.uploading}>Uploading...</p>}
            {form.photos.length > 0 && (
              <ul className={styles.photoGrid}>
                {form.photos.map((url, i) => (
                  <li key={url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} />
                    <button
                      type="button"
                      className={styles.removePhoto}
                      onClick={() => setForm({ ...form, photos: form.photos.filter((p) => p !== url) })}
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canEditStatus && (
            <div className={adminStyles.formGroup}>
              <label htmlFor="machine-status">Status</label>
              <select
                id="machine-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as MachineStatus })}
              >
                <option value="servicing">{MACHINE_STATUS_LABELS.servicing}</option>
                <option value="ready">{MACHINE_STATUS_LABELS.ready}</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={uploading || saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Machine"}
          </button>
        </form>
      </EditModal>

      {/* Pair a ready machine with someone on the waiting list */}
      <EditModal
        isOpen={!!assigning}
        onClose={closeAssign}
        title={assigning ? `Assign ${machineLabel(assigning)}` : "Assign"}
      >
        {assignedEmail ? (
          <div className={styles.assignDone}>
            <p>
              Assigned to <strong>{assignedEmail.name}</strong>. Their waiting list status is now
              &ldquo;Contacted&rdquo;.
            </p>
            <a className="btn-primary" href={assignedEmail.href}>
              Open pre-written email
            </a>
            <button type="button" className={styles.textButton} onClick={closeAssign}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleAssign} className={styles.assignForm}>
            {error && <div className={adminStyles.error}>{error}</div>}
            <p className={styles.hint}>Waiting list, in queue order:</p>
            <ul className={styles.applicantList}>
              {assignable.map((app) => (
                <li key={app.id}>
                  <label className={styles.applicantOption}>
                    <input
                      type="radio"
                      name="applicant"
                      value={app.id}
                      checked={selectedApplicationId === app.id}
                      onChange={() => setSelectedApplicationId(app.id)}
                    />
                    <span className={styles.applicantQueue}>#{queueNumbers.get(app.id)}</span>
                    <span className={styles.applicantInfo}>
                      <strong>{app.fullName}</strong>
                      {app.groupName && <span> · {app.groupName}</span>}
                      <span className={styles.applicantMeta}>
                        {app.area} · applied {formatDate(app.createdAt)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="submit" className="btn-primary" disabled={!selectedApplicationId || saving}>
              {saving ? "Assigning..." : "Assign & prepare email"}
            </button>
          </form>
        )}
      </EditModal>
    </div>
  );
}

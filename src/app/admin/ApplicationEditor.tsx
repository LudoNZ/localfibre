"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import EditModal from "@/components/ui/EditModal";
import {
  APPLICANT_TYPES,
  APPLICATION_AREAS,
  ApplicationDetails,
  ApplicationMachines,
  assignedMachines,
  DEFAULT_REQUEST,
  OriginalApplication,
  requestSummary,
  requestTotal,
} from "@/lib/sewingMachines";
import MachineRequestPicker, { fitRequest } from "@/components/forms/MachineRequestPicker";
import { useAdminApi } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

type Application = { id: string; original?: OriginalApplication } & ApplicationDetails &
  Omit<ApplicationMachines, "request">;

interface Props {
  user: User | null;
  application: Application | null;
  onClose: () => void;
  onSaved: (id: string, details: ApplicationDetails, original: OriginalApplication) => void;
}

const TYPE_LABELS: Record<(typeof APPLICANT_TYPES)[number], string> = {
  individual: "Individual",
  communityGroup: "Organisation",
};

/** What they first sent, next to the details as they are now */
function OriginalDetails({ original }: { original: OriginalApplication }) {
  const rows: [string, string][] = [
    ["Applying as", TYPE_LABELS[original.applicantType] ?? original.applicantType],
    ...(original.groupName ? [["Organisation", original.groupName] as [string, string]] : []),
    ["Machines", original.request ? requestSummary(original.request) : "Not asked (form before this choice)"],
    ["Full name", original.fullName],
    ["Email", original.email],
    ["Phone", original.phone],
    ["Area", original.area],
  ];
  return (
    <details className={styles.originalDetails}>
      <summary>Original application</summary>
      {original.savedAtFirstEdit && (
        <p className={styles.hint}>Sent before copies were kept, so this is how it read before the first edit.</p>
      )}
      <dl className={styles.specs}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.specRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Correct a waiting-list entry's name and contact details */
export default function ApplicationEditor({ user, application, onClose, onSaved }: Props) {
  return (
    <EditModal isOpen={!!application} onClose={onClose} title={application ? `Edit ${application.fullName}` : "Edit"}>
      {/* Keyed so the form starts fresh for each person */}
      {application && <EditForm key={application.id} user={user} application={application} onSaved={onSaved} />}
    </EditModal>
  );
}

function EditForm({
  user,
  application,
  onSaved,
}: {
  user: User | null;
  application: Application;
  onSaved: Props["onSaved"];
}) {
  const api = useAdminApi(user);
  const [values, setValues] = useState<ApplicationDetails>({
    applicantType: application.applicantType,
    groupName: application.groupName ?? "",
    fullName: application.fullName,
    email: application.email,
    phone: application.phone,
    area: application.area,
    request: application.request ?? DEFAULT_REQUEST,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ApplicationDetails>(key: K, value: ApplicationDetails[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const assigned = assignedMachines(application).length;
  const tooFew = requestTotal(values.request) < assigned;

  // Keep an area that's no longer offered on the public form
  const areas = APPLICATION_AREAS.includes(application.area)
    ? APPLICATION_AREAS
    : [application.area, ...APPLICATION_AREAS];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { details, original } = await api(`/api/sewing-machines/${application.id}`, {
        method: "PATCH",
        body: JSON.stringify({ details: values }),
      });
      onSaved(application.id, details as ApplicationDetails, original as OriginalApplication);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className={`${adminStyles.form} ${styles.modalForm}`}>
      {error && <div className={adminStyles.error}>{error}</div>}

      <div className={adminStyles.formGroup}>
        <span className={styles.label}>Applying as</span>
        <div className={styles.segmented} role="radiogroup" aria-label="Applying as">
          {(
            [
              ["individual", "Individual"],
              ["communityGroup", "Organisation"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={values.applicantType === id}
              className={values.applicantType === id ? styles.segmentActive : undefined}
              onClick={() => setValues((v) => ({ ...v, applicantType: id, request: fitRequest(v.request, id) }))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {values.applicantType === "communityGroup" && (
        <div className={adminStyles.formGroup}>
          <label htmlFor="app-group">Organisation name *</label>
          <input
            id="app-group"
            type="text"
            value={values.groupName ?? ""}
            onChange={(e) => set("groupName", e.target.value)}
            required
          />
        </div>
      )}

      <div className={adminStyles.formGroup}>
        <span className={styles.label}>
          {values.applicantType === "communityGroup" ? "Machines wanted *" : "Machine wanted *"}
        </span>
        <MachineRequestPicker
          applicantType={values.applicantType}
          value={values.request}
          onChange={(request) => set("request", request)}
          idPrefix="app-request"
        />
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="app-name">Full name *</label>
        <input
          id="app-name"
          type="text"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          required
        />
      </div>

      <div className={adminStyles.formRow}>
        <div className={adminStyles.formGroup}>
          <label htmlFor="app-email">Email *</label>
          <input
            id="app-email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
        <div className={adminStyles.formGroup}>
          <label htmlFor="app-phone">Phone *</label>
          <input
            id="app-phone"
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </div>
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="app-area">Area *</label>
        <select id="app-area" value={values.area} onChange={(e) => set("area", e.target.value)} required>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {tooFew && (
        <p className={adminStyles.error}>
          {assigned} machines are already assigned to them. Unassign some from the Machines tab to ask for fewer.
        </p>
      )}

      <p className={styles.hint}>
        Their place in the queue stays the same. If they&apos;ve been paired with machines, those records are updated
        too. The original application is always kept.
      </p>

      {application.original && <OriginalDetails original={application.original} />}

      <button
        type="submit"
        className="btn-primary"
        disabled={saving || requestTotal(values.request) === 0 || tooFew}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

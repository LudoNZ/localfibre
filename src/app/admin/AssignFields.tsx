"use client";

import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";
import { assignedMachines, requestSummary } from "@/lib/sewingMachines";
import { AssignChoice, WaitingApplication, formatDate } from "./machineShared";

interface AssignFieldsProps {
  value: AssignChoice;
  onChange: (choice: AssignChoice) => void;
  // People still waiting without a machine, oldest first
  assignable: WaitingApplication[];
  queueNumbers: Map<string, number>;
  // Shown in the add/edit form; the standalone assign modal always needs someone
  allowNone?: boolean;
}

const emptyManual = { mode: "manual", fullName: "", phone: "", email: "", area: "" } as const;

/** Pick who a machine goes to: someone on the waiting list, or someone entered by hand */
export default function AssignFields({ value, onChange, assignable, queueNumbers, allowNone }: AssignFieldsProps) {
  const modes: { id: AssignChoice["mode"]; label: string }[] = [
    ...(allowNone ? [{ id: "none" as const, label: "Not yet" }] : []),
    { id: "waiting", label: `Waiting list (${assignable.length})` },
    { id: "manual", label: "Someone else" },
  ];

  const pickMode = (mode: AssignChoice["mode"]) => {
    if (mode === value.mode) return;
    if (mode === "none") onChange({ mode: "none" });
    else if (mode === "waiting") onChange({ mode: "waiting", applicationId: assignable[0]?.id || "" });
    else onChange({ ...emptyManual });
  };

  return (
    <div className={styles.assignFields}>
      <div className={styles.segmented} role="radiogroup" aria-label="Assign to">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value.mode === id}
            className={value.mode === id ? styles.segmentActive : undefined}
            onClick={() => pickMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {value.mode === "waiting" &&
        (assignable.length === 0 ? (
          <p className={styles.hint}>Nobody is waiting right now.</p>
        ) : (
          <>
            <p className={styles.hint}>In queue order:</p>
            <ul className={styles.applicantList}>
              {assignable.map((app) => (
                <li key={app.id}>
                  <label className={styles.applicantOption}>
                    <input
                      type="radio"
                      name="applicant"
                      value={app.id}
                      checked={value.applicationId === app.id}
                      onChange={() => onChange({ mode: "waiting", applicationId: app.id })}
                    />
                    <span className={styles.applicantQueue}>#{queueNumbers.get(app.id)}</span>
                    <span className={styles.applicantInfo}>
                      <strong>{app.fullName}</strong>
                      {app.groupName && <span> · {app.groupName}</span>}
                      <span className={styles.applicantMeta}>
                        Wants {requestSummary(app.request).toLowerCase()}
                        {assignedMachines(app).length > 0 &&
                          ` (has ${assignedMachines(app)
                            .map((m) => `#${m.number}`)
                            .join(", ")})`}{" "}
                        · {app.area} · applied{" "}
                        {formatDate(app.createdAt)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ))}

      {value.mode === "manual" && (
        <div className={adminStyles.formRow}>
          {(
            [
              ["fullName", "Name *", "text", "name"],
              ["phone", "Phone", "tel", "tel"],
              ["email", "Email", "email", "email"],
              ["area", "Area", "text", "address-level2"],
            ] as const
          ).map(([field, label, type, autoComplete]) => (
            <div key={field} className={adminStyles.formGroup}>
              <label htmlFor={`assign-${field}`}>{label}</label>
              <input
                id={`assign-${field}`}
                type={type}
                autoComplete={autoComplete}
                value={value[field]}
                onChange={(e) => onChange({ ...value, [field]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

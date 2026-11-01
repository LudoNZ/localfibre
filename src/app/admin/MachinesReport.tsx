"use client";

import {
  MACHINE_CONDITION_LABELS,
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
  SERVICE_PART_STATE_LABELS,
  SewingMachine,
  serviceHours,
} from "@/lib/sewingMachines";
import { Purchase, money } from "@/lib/funding";
import { downloadCsv, today } from "./csv";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

const average = (values: number[]) =>
  values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "-";

const conditions = (machines: SewingMachine[]) =>
  machines.map((m) => m.condition).filter((c): c is number => typeof c === "number");

const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : null);

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, [...(counts.get(k) || []), item]);
  }
  return [...counts.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

function downloadMachinesCsv(machines: SewingMachine[], purchases: Purchase[]) {
  const header = [
    "Number",
    "Type",
    "Brand",
    "Model",
    "Serial number",
    "Condition (1-5)",
    "Condition",
    "Comes with",
    "Status",
    "Logged",
    "Assigned to",
    "Group",
    "Area",
    "Phone",
    "Email",
    "From waiting list",
    "Assigned",
    "Handed over",
    "Service parts",
    "Volunteer hours",
    "Parts spend (NZD)",
    "Notes",
  ];
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const rows = [...machines]
    .sort((a, b) => a.number - b.number)
    .map((m) => [
      m.number,
      m.typeName,
      m.brand,
      m.model,
      m.serialNumber,
      m.condition ?? "",
      m.condition ? MACHINE_CONDITION_LABELS[m.condition] : "",
      (m.comesWith || []).join("; "),
      MACHINE_STATUS_LABELS[m.status] ?? m.status,
      day(m.createdAt),
      m.recipient?.fullName,
      m.recipient?.groupName,
      m.recipient?.area,
      m.recipient?.phone,
      m.recipient?.email,
      m.recipient ? (m.recipient.applicationId ? "Yes" : "No") : "",
      day(m.assignedAt),
      day(m.repurposedAt),
      (m.serviceParts || []).map((p) => `${p.name} (${SERVICE_PART_STATE_LABELS[p.state]})`).join("; "),
      serviceHours(m) || "",
      purchases.filter((p) => p.machineId === m.id).reduce((total, p) => total + p.amount, 0) || "",
      m.notes,
    ]);

  downloadCsv(`local-fibre-machines-${today()}.csv`, header, rows);
}

/** Summary of the machine log, worked out from the machines already loaded */
export default function MachinesReport({
  machines,
  purchases,
}: {
  machines: SewingMachine[];
  purchases: Purchase[];
}) {
  if (machines.length === 0) {
    return <p className={adminStyles.empty}>No machines logged yet.</p>;
  }

  const assigned = machines.filter((m) => m.recipient && m.status !== "repurposed").length;
  const unassigned = machines.filter((m) => !m.recipient).length;
  const byType = countBy(machines, (m) => m.typeName || "No type");
  const byBrand = countBy(machines, (m) => m.brand || "Unknown");

  // Last 12 months, oldest first
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      logged: machines.filter((m) => monthKey(m.createdAt) === key).length,
      handedOver: machines.filter((m) => monthKey(m.repurposedAt) === key).length,
    };
  });
  const busiest = Math.max(1, ...months.map((m) => Math.max(m.logged, m.handedOver)));

  // Which parts go on which models, counting every machine that had the part flagged
  const faults = countBy(
    machines.flatMap((m) =>
      (m.serviceParts || []).map((p) => ({ part: p.name, model: [m.brand, m.model].filter(Boolean).join(" ") }))
    ),
    (f) => f.part
  );

  // Volunteer time from service notes
  const notes = machines.flatMap((m) => m.serviceLog || []).filter((n) => n.hours);
  const byVolunteer = countBy(notes, (n) => n.volunteer || "Not recorded");
  const totalHours = notes.reduce((total, n) => total + (n.hours ?? 0), 0);
  const partsSpend = purchases.filter((p) => p.machineId).reduce((total, p) => total + p.amount, 0);

  return (
    <div className={styles.report}>
      <div className={styles.reportActions}>
        <button type="button" className="btn-primary" onClick={() => downloadMachinesCsv(machines, purchases)}>
          Download CSV
        </button>
        <span className={styles.hint}>All {machines.length} machines, including recipient contact details.</span>
      </div>

      <section>
        <h3 className={styles.libraryHeading}>By status</h3>
        <div className={styles.reportStats}>
          {MACHINE_STATUSES.map((status) => (
            <div key={status} className={styles.stat}>
              <span className={styles.statNumber}>{machines.filter((m) => m.status === status).length}</span>
              <span className={styles.statLabel}>{MACHINE_STATUS_LABELS[status]}</span>
            </div>
          ))}
          <div className={styles.stat}>
            <span className={styles.statNumber}>{assigned}</span>
            <span className={styles.statLabel}>Assigned, not handed over</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{unassigned}</span>
            <span className={styles.statLabel}>Not assigned</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className={styles.libraryHeading}>By type</h3>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Machines</th>
              <th>Handed over</th>
              <th>Avg condition</th>
            </tr>
          </thead>
          <tbody>
            {byType.map(([type, list]) => (
              <tr key={type}>
                <td>{type}</td>
                <td>{list.length}</td>
                <td>{list.filter((m) => m.status === "repurposed").length}</td>
                <td>{average(conditions(list))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className={styles.libraryHeading}>By brand &amp; model</h3>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Brand / model</th>
              <th>Machines</th>
              <th>Handed over</th>
              <th>Avg condition</th>
            </tr>
          </thead>
          <tbody>
            {byBrand.map(([brand, list]) => [
              <tr key={brand} className={styles.reportGroup}>
                <td>{brand}</td>
                <td>{list.length}</td>
                <td>{list.filter((m) => m.status === "repurposed").length}</td>
                <td>{average(conditions(list))}</td>
              </tr>,
              ...countBy(list, (m) => m.model || "Model not recorded").map(([model, models]) => (
                <tr key={`${brand}/${model}`}>
                  <td className={styles.reportIndent}>{model}</td>
                  <td>{models.length}</td>
                  <td>{models.filter((m) => m.status === "repurposed").length}</td>
                  <td>{average(conditions(models))}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className={styles.libraryHeading}>Common faults</h3>
        {faults.length === 0 ? (
          <p className={styles.hint}>No parts flagged during servicing yet.</p>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Part</th>
                <th>Machines</th>
                <th>Models</th>
              </tr>
            </thead>
            <tbody>
              {faults.map(([part, list]) => (
                <tr key={part}>
                  <td>{part}</td>
                  <td>{list.length}</td>
                  <td>
                    {countBy(list, (f) => f.model || "Unknown")
                      .map(([model, l]) => (l.length > 1 ? `${model} (${l.length})` : model))
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3 className={styles.libraryHeading}>
          Volunteer hours · {totalHours} h{partsSpend > 0 && ` · parts spend ${money(partsSpend)}`}
        </h3>
        {byVolunteer.length === 0 ? (
          <p className={styles.hint}>Add hours to service notes to see them here.</p>
        ) : (
          <table className={styles.reportTable}>
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Hours</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {byVolunteer.map(([name, list]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{list.reduce((total, n) => total + (n.hours ?? 0), 0)}</td>
                  <td>{list.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3 className={styles.libraryHeading}>Last 12 months</h3>
        <div className={styles.legend}>
          <span className={styles.legendLogged}>Logged</span>
          <span className={styles.legendHanded}>Handed over</span>
        </div>
        <div className={styles.months}>
          {months.map((m) => (
            <div key={m.key} className={styles.month} title={`${m.label}: ${m.logged} logged, ${m.handedOver} handed over`}>
              <div className={styles.monthBars}>
                <span className={styles.barLogged} style={{ height: `${(m.logged / busiest) * 100}%` }} />
                <span className={styles.barHanded} style={{ height: `${(m.handedOver / busiest) * 100}%` }} />
              </div>
              <span className={styles.monthLabel}>{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

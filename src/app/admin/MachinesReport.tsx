"use client";

import {
  MACHINE_CONDITION_LABELS,
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
  SewingMachine,
} from "@/lib/sewingMachines";
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

// Quote every cell so commas and line breaks in notes stay in one cell
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(machines: SewingMachine[]) {
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
      m.notes,
    ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `local-fibre-machines-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Summary of the machine log, worked out from the machines already loaded */
export default function MachinesReport({ machines }: { machines: SewingMachine[] }) {
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

  return (
    <div className={styles.report}>
      <div className={styles.reportActions}>
        <button type="button" className="btn-primary" onClick={() => downloadCsv(machines)}>
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

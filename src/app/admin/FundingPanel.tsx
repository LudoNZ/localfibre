"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import EditModal from "@/components/ui/EditModal";
import {
  FundingPool,
  POOL_KINDS,
  POOL_KIND_LABELS,
  PoolKind,
  Purchase,
  inPoolPeriod,
  isOwed,
  money,
} from "@/lib/funding";
import { SewingMachine, machineLabel } from "@/lib/sewingMachines";
import PurchaseForm from "./PurchaseForm";
import { downloadCsv, today } from "./csv";
import { formatDate, openReceipt, useAdminApi } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

type View = "pools" | "purchases" | "report";
type PurchaseFilter = "all" | "owed" | "noReceipt" | "ordered";

const emptyPool = {
  name: "",
  kind: "grant" as PoolKind,
  funder: "",
  amount: "",
  startDate: "",
  endDate: "",
  reference: "",
  notes: "",
  active: true,
};

const sum = (purchases: Purchase[]) => Math.round(purchases.reduce((t, p) => t + p.amount, 0) * 100) / 100;

/** Grants and other money for servicing, what's been bought from each, and reports for funders */
export default function FundingPanel({ user }: { user: User | null }) {
  const api = useAdminApi(user);
  const [pools, setPools] = useState<FundingPool[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [machines, setMachines] = useState<SewingMachine[]>([]);
  const [view, setView] = useState<View>("pools");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [poolForm, setPoolForm] = useState<{ editing: FundingPool | null; values: typeof emptyPool } | null>(null);
  const [savingPool, setSavingPool] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<{ editing: Purchase | null } | null>(null);

  const [poolFilter, setPoolFilter] = useState("");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>("all");
  const [reportPoolId, setReportPoolId] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [poolData, purchaseData, machineData] = await Promise.all([
        api("/api/funding-pools"),
        api("/api/purchases"),
        api("/api/machines"),
      ]);
      setPools((poolData.pools as FundingPool[]) || []);
      setPurchases((purchaseData.purchases as Purchase[]) || []);
      setMachines((machineData.machines as SewingMachine[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load funding");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const poolName = (id: string) => pools.find((p) => p.id === id)?.name ?? "Unknown pool";
  const machineName = (id: string | null) => {
    const machine = machines.find((m) => m.id === id);
    return machine ? machineLabel(machine) : null;
  };
  const payers = [...new Set(purchases.map((p) => p.paidBy).filter((p) => p && p !== "pool"))];
  const owedTotal = sum(purchases.filter(isOwed));

  // ── Pools ──

  const openPoolForm = (pool: FundingPool | null) =>
    setPoolForm({
      editing: pool,
      values: pool
        ? {
            name: pool.name,
            kind: pool.kind,
            funder: pool.funder,
            amount: String(pool.amount),
            startDate: pool.startDate,
            endDate: pool.endDate,
            reference: pool.reference,
            notes: pool.notes,
            active: pool.active,
          }
        : { ...emptyPool },
    });

  const setPoolValue = <K extends keyof typeof emptyPool>(key: K, value: (typeof emptyPool)[K]) =>
    setPoolForm((f) => (f ? { ...f, values: { ...f.values, [key]: value } } : f));

  const savePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolForm) return;
    setSavingPool(true);
    setError("");
    try {
      await api(poolForm.editing ? `/api/funding-pools/${poolForm.editing.id}` : "/api/funding-pools", {
        method: poolForm.editing ? "PUT" : "POST",
        body: JSON.stringify({ ...poolForm.values, amount: Number(poolForm.values.amount) }),
      });
      setPoolForm(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pool");
    } finally {
      setSavingPool(false);
    }
  };

  const deletePool = async (pool: FundingPool) => {
    if (!confirm(`Delete ${pool.name}? This can't be undone.`)) return;
    setError("");
    try {
      await api(`/api/funding-pools/${pool.id}`, { method: "DELETE" });
      setPoolForm(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pool");
    }
  };

  // ── Purchases ──

  const visiblePurchases = purchases.filter(
    (p) =>
      (!poolFilter || p.poolId === poolFilter) &&
      (purchaseFilter === "all" ||
        (purchaseFilter === "owed" && isOwed(p)) ||
        (purchaseFilter === "noReceipt" && !p.receipt) ||
        (purchaseFilter === "ordered" && p.status === "ordered"))
  );

  const updatePurchase = async (purchase: Purchase, changes: Partial<Purchase>) => {
    setError("");
    try {
      await api(`/api/purchases/${purchase.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...purchase, ...changes }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update purchase");
    }
  };

  const deletePurchase = async (purchase: Purchase) => {
    if (!confirm(`Delete "${purchase.description}" (${money(purchase.amount)}) and its receipt?`)) return;
    setError("");
    try {
      await api(`/api/purchases/${purchase.id}`, { method: "DELETE" });
      setPurchaseForm(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete purchase");
    }
  };

  // ── Report ──

  const reportPool = pools.find((p) => p.id === reportPoolId) ?? pools[0];
  const reportPurchases = reportPool ? purchases.filter((p) => p.poolId === reportPool.id) : [];
  const owedByPerson = [...new Set(reportPurchases.filter(isOwed).map((p) => p.paidBy))].map((name) => ({
    name,
    amount: sum(reportPurchases.filter((p) => isOwed(p) && p.paidBy === name)),
  }));
  const periodNotes = reportPool
    ? machines.flatMap((m) =>
        (m.serviceLog || []).filter((n) => inPoolPeriod(reportPool, n.date)).map((n) => ({ ...n, machine: m }))
      )
    : [];
  const periodHours = periodNotes.reduce((t, n) => t + (n.hours ?? 0), 0);
  const servicedInPeriod = new Set([
    ...periodNotes.map((n) => n.machine.id),
    ...reportPurchases.map((p) => p.machineId).filter(Boolean),
  ]);
  const handedOverInPeriod = reportPool
    ? machines.filter((m) => m.status === "repurposed" && inPoolPeriod(reportPool, m.repurposedAt?.slice(0, 10) ?? null))
    : [];

  const downloadReport = () => {
    if (!reportPool) return;
    const header = [
      "Date",
      "Description",
      "Supplier",
      "Amount (NZD incl. GST)",
      "Machine",
      "Part",
      "Status",
      "Paid by",
      "Reimbursed",
      "Receipt",
      "Notes",
    ];
    const rows: unknown[][] = [...reportPurchases]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => [
        p.date,
        p.description,
        p.supplier,
        p.amount.toFixed(2),
        machineName(p.machineId) ?? (p.machineNumber ? `#${p.machineNumber}` : "General"),
        p.part,
        p.status === "ordered" ? "Ordered" : "Received",
        p.paidBy === "pool" ? "Pool" : p.paidBy,
        p.paidBy === "pool" ? "" : p.reimbursed ? `Yes${p.reimbursedAt ? ` (${p.reimbursedAt})` : ""}` : "No",
        p.receipt ? p.receipt.name : "MISSING",
        p.notes,
      ]);
    const summary: unknown[][] = [
      [],
      ["Pool", reportPool.name],
      ["Funder", reportPool.funder],
      ["Reference", reportPool.reference],
      ["Period", `${reportPool.startDate || "…"} to ${reportPool.endDate || "…"}`],
      ["Amount", reportPool.amount.toFixed(2)],
      ["Spent", reportPool.spent.toFixed(2)],
      ["Remaining", reportPool.remaining.toFixed(2)],
      ["Still owed to people", sum(reportPurchases.filter(isOwed)).toFixed(2)],
      ["Volunteer hours in period", periodHours],
      ["Machines serviced in period", servicedInPeriod.size],
      ["Machines handed over in period", handedOverInPeriod.length],
    ];
    const slug = reportPool.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(`local-fibre-${slug}-${today()}.csv`, header, [...rows, ...summary]);
  };

  return (
    <div className={adminStyles.section}>
      <div className={adminStyles.sectionHeader}>
        <h2>Funding</h2>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={() => openPoolForm(null)}>
            Add pool
          </button>
          <button className="btn-primary" onClick={() => setPurchaseForm({ editing: null })} disabled={!pools.length}>
            Log purchase
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{money(pools.filter((p) => p.active).reduce((t, p) => t + p.remaining, 0))}</span>
          <span className={styles.statLabel}>Left in active pools</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{money(sum(purchases))}</span>
          <span className={styles.statLabel}>Spent in total</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{money(owedTotal)}</span>
          <span className={styles.statLabel}>Owed to people</span>
        </div>
      </div>

      <div className={styles.segmented} role="tablist" aria-label="Funding view">
        {(
          [
            ["pools", "Pools"],
            ["purchases", `Purchases (${purchases.length})`],
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

      {error && !poolForm && !purchaseForm && <div className={adminStyles.error}>{error}</div>}

      {loading ? (
        <p>Loading funding...</p>
      ) : view === "pools" ? (
        pools.length === 0 ? (
          <p className={adminStyles.empty}>
            No funding pools yet. Add a grant, a personal contribution or a donation to start logging what servicing
            costs.
          </p>
        ) : (
          <ul className={styles.poolList}>
            {pools.map((pool) => {
              const used = pool.amount ? Math.min(100, (pool.spent / pool.amount) * 100) : 0;
              const poolPurchases = purchases.filter((p) => p.poolId === pool.id);
              return (
                <li key={pool.id} className={`${styles.poolCard} ${pool.active ? "" : styles.poolInactive}`}>
                  <div className={styles.machineTitleRow}>
                    <h3>{pool.name}</h3>
                    <span className={`${styles.statusBadge} ${styles.servicing}`}>{POOL_KIND_LABELS[pool.kind]}</span>
                    {!pool.active && <span className={`${styles.statusBadge} ${styles.incoming}`}>Inactive</span>}
                  </div>
                  <p className={styles.hint}>
                    {[pool.funder, pool.reference, pool.startDate || pool.endDate ? `${pool.startDate ? formatDate(pool.startDate) : "…"} – ${pool.endDate ? formatDate(pool.endDate) : "…"}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className={styles.poolBar} aria-hidden="true">
                    <span style={{ width: `${used}%` }} className={pool.remaining < 0 ? styles.poolBarOver : undefined} />
                  </div>
                  <p className={styles.poolNumbers}>
                    <strong>{money(pool.spent)}</strong> spent of {money(pool.amount)} ·{" "}
                    <span className={pool.remaining < 0 ? styles.overBudget : undefined}>
                      {money(pool.remaining)} left
                    </span>
                    {" · "}
                    {poolPurchases.length} purchase{poolPurchases.length === 1 ? "" : "s"}
                    {poolPurchases.some((p) => !p.receipt) && (
                      <span className={styles.missingReceipt}>
                        {poolPurchases.filter((p) => !p.receipt).length} missing receipt
                      </span>
                    )}
                  </p>
                  <div className={styles.machineActions}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setReportPoolId(pool.id);
                        setView("report");
                      }}
                    >
                      Report
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setPoolFilter(pool.id);
                        setPurchaseFilter("all");
                        setView("purchases");
                      }}
                    >
                      Purchases
                    </button>
                    <button className={styles.textButton} onClick={() => openPoolForm(pool)}>
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : view === "purchases" ? (
        <>
          <div className={styles.purchaseFilters}>
            <select value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)} aria-label="Pool">
              <option value="">All pools</option>
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className={adminStyles.filterGroup} role="group" aria-label="Filter purchases">
              {(
                [
                  ["all", "All"],
                  ["owed", "Owed to people"],
                  ["noReceipt", "Missing receipt"],
                  ["ordered", "On order"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={`${adminStyles.filterChip} ${purchaseFilter === id ? adminStyles.filterChipActive : ""}`}
                  aria-pressed={purchaseFilter === id}
                  onClick={() => setPurchaseFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visiblePurchases.length === 0 ? (
            <p className={adminStyles.empty}>No purchases here.</p>
          ) : (
            <ul className={styles.purchaseList}>
              {visiblePurchases.map((p) => (
                <li key={p.id} className={styles.purchaseItem}>
                  <div>
                    <strong>
                      {p.description} · {money(p.amount)}
                    </strong>
                    <span className={styles.applicantMeta}>
                      {formatDate(p.date)} · {poolName(p.poolId)}
                      {p.supplier && ` · ${p.supplier}`}
                      {` · ${machineName(p.machineId) ?? (p.machineNumber ? `#${p.machineNumber}` : "General")}`}
                      {p.part && ` (${p.part})`}
                      {p.status === "ordered" && " · On order"}
                    </span>
                    {p.paidBy !== "pool" && (
                      <span className={isOwed(p) ? styles.owed : styles.applicantMeta}>
                        Paid by {p.paidBy} · {p.reimbursed ? "paid back" : "to be paid back"}
                      </span>
                    )}
                  </div>
                  <div className={styles.purchaseActions}>
                    {isOwed(p) && (
                      <button className={styles.textButton} onClick={() => updatePurchase(p, { reimbursed: true })}>
                        Mark paid back
                      </button>
                    )}
                    {p.status === "ordered" && (
                      <button className={styles.textButton} onClick={() => updatePurchase(p, { status: "received" })}>
                        Received
                      </button>
                    )}
                    {p.receipt ? (
                      <button className={styles.textButton} onClick={() => openReceipt(user, p.receipt!)}>
                        Receipt
                      </button>
                    ) : (
                      <span className={styles.missingReceipt}>No receipt</span>
                    )}
                    <button className={styles.textButton} onClick={() => setPurchaseForm({ editing: p })}>
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : !reportPool ? (
        <p className={adminStyles.empty}>Add a funding pool to see its report.</p>
      ) : (
        <div className={styles.report}>
          <div className={styles.reportActions}>
            <select
              value={reportPool.id}
              onChange={(e) => setReportPoolId(e.target.value)}
              aria-label="Pool to report on"
              className={styles.reportSelect}
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={downloadReport}>
              Download CSV
            </button>
          </div>

          <div className={styles.reportStats}>
            {(
              [
                [money(reportPool.amount), "Pool amount"],
                [money(reportPool.spent), "Spent"],
                [money(reportPool.remaining), "Remaining"],
                [money(sum(reportPurchases.filter(isOwed))), "Owed to people"],
                [`${periodHours} h`, "Volunteer hours in period"],
                [String(servicedInPeriod.size), "Machines serviced"],
                [String(handedOverInPeriod.length), "Machines handed over"],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className={styles.stat}>
                <span className={styles.statNumber}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            {reportPool.startDate || reportPool.endDate
              ? `Hours and machines counted between ${reportPool.startDate ? formatDate(reportPool.startDate) : "the start"} and ${reportPool.endDate ? formatDate(reportPool.endDate) : "now"}.`
              : "Set start and end dates on the pool to count hours and machines for its period only."}
          </p>

          {owedByPerson.length > 0 && (
            <section>
              <h3 className={styles.libraryHeading}>Still to pay back</h3>
              <ul className={styles.purchaseList}>
                {owedByPerson.map(({ name, amount }) => (
                  <li key={name} className={styles.purchaseItem}>
                    <span>{name}</span>
                    <strong>{money(amount)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className={styles.libraryHeading}>Purchases</h3>
            {reportPurchases.length === 0 ? (
              <p className={styles.hint}>Nothing bought from this pool yet.</p>
            ) : (
              <table className={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Purchase</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {[...reportPurchases]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          {p.description}
                          {p.machineId && ` · ${machineName(p.machineId) ?? ""}`}
                        </td>
                        <td>{formatDate(p.date)}</td>
                        <td>{money(p.amount)}</td>
                        <td>
                          {p.receipt ? (
                            <button className={styles.textButton} onClick={() => openReceipt(user, p.receipt!)}>
                              View
                            </button>
                          ) : (
                            <span className={styles.missingReceipt}>Missing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* Add / edit pool */}
      <EditModal
        isOpen={!!poolForm}
        onClose={() => setPoolForm(null)}
        title={poolForm?.editing ? `Edit ${poolForm.editing.name}` : "Add funding pool"}
      >
        {poolForm && (
          <form onSubmit={savePool} className={adminStyles.form}>
            {error && <div className={adminStyles.error}>{error}</div>}
            <div className={adminStyles.formGroup}>
              <label htmlFor="pool-name">Name *</label>
              <input
                id="pool-name"
                type="text"
                value={poolForm.values.name}
                onChange={(e) => setPoolValue("name", e.target.value)}
                placeholder="e.g. Foundation North 2026"
                required
              />
            </div>
            <div className={adminStyles.formGroup}>
              <span className={styles.label}>Kind</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Kind of pool">
                {POOL_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={poolForm.values.kind === kind}
                    className={poolForm.values.kind === kind ? styles.segmentActive : undefined}
                    onClick={() => setPoolValue("kind", kind)}
                  >
                    {POOL_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </div>
            <div className={adminStyles.formRow}>
              <div className={adminStyles.formGroup}>
                <label htmlFor="pool-amount">Amount (NZD) *</label>
                <input
                  id="pool-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={poolForm.values.amount}
                  onChange={(e) => setPoolValue("amount", e.target.value)}
                  required
                />
              </div>
              <div className={adminStyles.formGroup}>
                <label htmlFor="pool-start">Start date</label>
                <input
                  id="pool-start"
                  type="date"
                  value={poolForm.values.startDate}
                  onChange={(e) => setPoolValue("startDate", e.target.value)}
                />
              </div>
              <div className={adminStyles.formGroup}>
                <label htmlFor="pool-end">End date</label>
                <input
                  id="pool-end"
                  type="date"
                  value={poolForm.values.endDate}
                  onChange={(e) => setPoolValue("endDate", e.target.value)}
                />
              </div>
            </div>
            <div className={adminStyles.formRow}>
              <div className={adminStyles.formGroup}>
                <label htmlFor="pool-funder">
                  {poolForm.values.kind === "personal" ? "From" : "Funder"}
                </label>
                <input
                  id="pool-funder"
                  type="text"
                  value={poolForm.values.funder}
                  onChange={(e) => setPoolValue("funder", e.target.value)}
                  placeholder={poolForm.values.kind === "personal" ? "Who put the money in" : "e.g. Foundation North"}
                />
              </div>
              <div className={adminStyles.formGroup}>
                <label htmlFor="pool-reference">Reference</label>
                <input
                  id="pool-reference"
                  type="text"
                  value={poolForm.values.reference}
                  onChange={(e) => setPoolValue("reference", e.target.value)}
                  placeholder="Grant or application number"
                />
              </div>
            </div>
            <div className={adminStyles.formGroup}>
              <label htmlFor="pool-notes">Notes</label>
              <textarea
                id="pool-notes"
                value={poolForm.values.notes}
                onChange={(e) => setPoolValue("notes", e.target.value)}
                rows={3}
                placeholder="What it can be spent on, reporting deadlines..."
              />
            </div>
            <label className={styles.checkItem}>
              <input
                type="checkbox"
                checked={poolForm.values.active}
                onChange={(e) => setPoolValue("active", e.target.checked)}
              />
              <span>Active (offered when logging purchases)</span>
            </label>
            <div className={styles.removeActions}>
              <button type="submit" className="btn-primary" disabled={savingPool}>
                {savingPool ? "Saving..." : poolForm.editing ? "Save pool" : "Add pool"}
              </button>
              {poolForm.editing && (
                <button type="button" className={adminStyles.deleteBtn} onClick={() => deletePool(poolForm.editing!)}>
                  Delete
                </button>
              )}
            </div>
          </form>
        )}
      </EditModal>

      {/* Log / edit purchase */}
      <EditModal
        isOpen={!!purchaseForm}
        onClose={() => setPurchaseForm(null)}
        title={purchaseForm?.editing ? "Edit purchase" : "Log purchase"}
      >
        {purchaseForm && (
          <>
            <PurchaseForm
              api={api}
              user={user}
              pools={pools}
              machines={machines}
              payers={payers}
              editing={purchaseForm.editing}
              onSaved={async () => {
                setPurchaseForm(null);
                await loadData();
              }}
            />
            {purchaseForm.editing && (
              <button
                type="button"
                className={`${adminStyles.deleteBtn} ${styles.deletePurchase}`}
                onClick={() => deletePurchase(purchaseForm.editing!)}
              >
                Delete purchase
              </button>
            )}
          </>
        )}
      </EditModal>
    </div>
  );
}

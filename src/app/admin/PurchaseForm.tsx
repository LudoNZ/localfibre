"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { FundingPool, Purchase, Receipt, money } from "@/lib/funding";
import { SewingMachine, machineLabel } from "@/lib/sewingMachines";
import { AdminApi, openReceipt, uploadReceipt } from "./machineShared";
import { today } from "./csv";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

export type PurchasePrefill = Partial<Pick<Purchase, "machineId" | "part" | "description" | "status">>;

interface PurchaseFormProps {
  api: AdminApi;
  user: User | null;
  pools: FundingPool[];
  machines: SewingMachine[];
  // People who've paid before, offered as quick picks
  payers: string[];
  editing: Purchase | null;
  prefill?: PurchasePrefill;
  onSaved: () => Promise<void>;
}

/** Log or edit a purchase: what, how much, which pool pays, who paid, and the receipt */
export default function PurchaseForm({
  api,
  user,
  pools,
  machines,
  payers,
  editing,
  prefill,
  onSaved,
}: PurchaseFormProps) {
  const activePools = pools.filter((p) => p.active || p.id === editing?.poolId);
  const [form, setForm] = useState(() => ({
    date: editing?.date ?? today(),
    description: editing?.description ?? prefill?.description ?? "",
    supplier: editing?.supplier ?? "",
    amount: editing ? String(editing.amount) : "",
    poolId: editing?.poolId ?? (activePools.length === 1 ? activePools[0].id : ""),
    paidBy: editing?.paidBy ?? "pool",
    reimbursed: editing?.reimbursed ?? false,
    machineId: editing?.machineId ?? prefill?.machineId ?? "",
    part: editing?.part ?? prefill?.part ?? "",
    status: editing?.status ?? prefill?.status ?? "received",
    notes: editing?.notes ?? "",
  }));
  const [receipt, setReceipt] = useState<Receipt | null>(editing?.receipt ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const paidByPerson = form.paidBy !== "pool";
  const pool = pools.find((p) => p.id === form.poolId);
  const amount = Number(form.amount);
  // What's left in the pool after this purchase (its old amount is already counted when editing)
  const leftAfter = pool ? pool.remaining - (amount || 0) + (editing?.poolId === pool.id ? editing.amount : 0) : null;
  const linkable = machines.filter((m) => m.status !== "repurposed" || m.id === form.machineId);

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setReceipt(await uploadReceipt(api, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!form.poolId) throw new Error("Choose which funding pool pays for it");
      if (!(amount >= 0) || form.amount.trim() === "") throw new Error("Enter what it cost");
      await api(editing ? `/api/purchases/${editing.id}` : "/api/purchases", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          amount,
          paidBy: form.paidBy.trim() || "pool",
          receipt,
          machineId: form.machineId || null,
          reimbursedAt: editing?.reimbursed ? editing.reimbursedAt : undefined,
          receivedAt: editing?.status === "received" ? editing.receivedAt : undefined,
        }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  if (pools.length === 0) {
    return (
      <p className={styles.hint}>
        Add a funding pool first (Funding tab → Add pool), so purchases have something to come out of.
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className={`${adminStyles.form} ${styles.modalForm}`}>
      {error && <div className={adminStyles.error}>{error}</div>}

      <div className={adminStyles.formGroup}>
        <label htmlFor="purchase-description">What was bought *</label>
        <input
          id="purchase-description"
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Replacement drive belt"
          required
        />
      </div>

      <div className={adminStyles.formRow}>
        <div className={adminStyles.formGroup}>
          <label htmlFor="purchase-amount">Cost (NZD incl. GST) *</label>
          <input
            id="purchase-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
          />
        </div>
        <div className={adminStyles.formGroup}>
          <label htmlFor="purchase-date">Date *</label>
          <input
            id="purchase-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
          />
        </div>
        <div className={adminStyles.formGroup}>
          <label htmlFor="purchase-supplier">Supplier</label>
          <input
            id="purchase-supplier"
            type="text"
            value={form.supplier}
            onChange={(e) => set("supplier", e.target.value)}
            placeholder="e.g. Spotlight"
          />
        </div>
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="purchase-pool">Paid from (funding pool) *</label>
        <select id="purchase-pool" value={form.poolId} onChange={(e) => set("poolId", e.target.value)} required>
          <option value="">Choose a pool</option>
          {activePools.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {money(p.remaining)} left
            </option>
          ))}
        </select>
        {pool && leftAfter !== null && (
          <p className={`${styles.hint} ${leftAfter < 0 ? styles.overBudget : ""}`}>
            {leftAfter < 0 ? `This puts ${pool.name} ${money(-leftAfter)} over.` : `${money(leftAfter)} left after this.`}
          </p>
        )}
      </div>

      <div className={adminStyles.formGroup}>
        <span className={styles.label}>Who paid?</span>
        <div className={styles.segmented} role="radiogroup" aria-label="Who paid">
          <button
            type="button"
            role="radio"
            aria-checked={!paidByPerson}
            className={!paidByPerson ? styles.segmentActive : undefined}
            onClick={() => set("paidBy", "pool")}
          >
            The pool directly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={paidByPerson}
            className={paidByPerson ? styles.segmentActive : undefined}
            onClick={() => set("paidBy", paidByPerson ? form.paidBy : "")}
          >
            Someone personally
          </button>
        </div>
        {paidByPerson && (
          <>
            {payers.length > 0 && (
              <div className={styles.chips}>
                {payers.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`${styles.chip} ${form.paidBy === name ? styles.chipActive : ""}`}
                    onClick={() => set("paidBy", name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={form.paidBy}
              onChange={(e) => set("paidBy", e.target.value)}
              placeholder="Who paid, to be reimbursed"
              aria-label="Who paid"
            />
            <label className={styles.checkItem}>
              <input
                type="checkbox"
                checked={form.reimbursed}
                onChange={(e) => set("reimbursed", e.target.checked)}
              />
              <span>They&rsquo;ve been paid back</span>
            </label>
          </>
        )}
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="purchase-receipt">Receipt (photo or PDF, private)</label>
        {receipt ? (
          <div className={styles.receiptRow}>
            <button type="button" className={styles.textButton} onClick={() => openReceipt(user, receipt)}>
              📄 {receipt.name}
            </button>
            <button type="button" className={styles.textButton} onClick={() => setReceipt(null)}>
              Remove
            </button>
          </div>
        ) : (
          <input
            id="purchase-receipt"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleReceipt}
            className={adminStyles.fileInput}
            disabled={uploading}
          />
        )}
        {uploading && <p className={adminStyles.uploading}>Uploading...</p>}
        {!receipt && !uploading && <p className={styles.hint}>Needed as proof of purchase for funding reports.</p>}
      </div>

      <div className={adminStyles.formRow}>
        <div className={adminStyles.formGroup}>
          <label htmlFor="purchase-machine">For machine</label>
          <select id="purchase-machine" value={form.machineId} onChange={(e) => set("machineId", e.target.value)}>
            <option value="">General (not one machine)</option>
            {linkable.map((m) => (
              <option key={m.id} value={m.id}>
                {machineLabel(m)}
              </option>
            ))}
          </select>
        </div>
        {form.machineId && (
          <div className={adminStyles.formGroup}>
            <label htmlFor="purchase-part">Part</label>
            <input
              id="purchase-part"
              type="text"
              value={form.part}
              onChange={(e) => set("part", e.target.value)}
              placeholder="e.g. Belt"
            />
          </div>
        )}
        <div className={adminStyles.formGroup}>
          <span className={styles.label}>Status</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Order status">
            {(["ordered", "received"] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={form.status === status}
                className={form.status === status ? styles.segmentActive : undefined}
                onClick={() => set("status", status)}
              >
                {status === "ordered" ? "Ordered" : "Received"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="purchase-notes">Notes</label>
        <textarea
          id="purchase-notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Order number, tracking, anything for the funding report"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={uploading || saving}>
        {saving ? "Saving..." : editing ? "Save purchase" : "Log purchase"}
      </button>
    </form>
  );
}

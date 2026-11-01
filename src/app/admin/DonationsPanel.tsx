"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  DonationPhoto,
  DonationStatus,
  HANDOVER_OPTIONS,
  MachineDonation,
  WORKING_OPTIONS,
} from "@/lib/donations";
import { formatDate, openReceipt, useAdminApi } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

type Filter = DonationStatus | "all";

/** A private donation photo, fetched with the admin's token */
function PrivatePhoto({ user, photo, alt }: { user: User | null; photo: DonationPhoto; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/receipts?path=${encodeURIComponent(photo.path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || cancelled) return;
      url = URL.createObjectURL(await res.blob());
      setSrc(url);
    })().catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [user, photo.path]);

  return (
    <button
      type="button"
      className={styles.donationPhoto}
      onClick={() => openReceipt(user, { path: photo.path, name: alt, contentType: photo.contentType })}
      aria-label={`Open ${alt}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : (
        <span aria-hidden="true">…</span>
      )}
    </button>
  );
}

/** Machines people have offered through the "Donate a machine" form */
export default function DonationsPanel({ user }: { user: User | null }) {
  const api = useAdminApi(user);
  const [donations, setDonations] = useState<MachineDonation[]>([]);
  const [filter, setFilter] = useState<Filter>("new");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/api/machine-donations");
      setDonations((data.donations as MachineDonation[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (donation: MachineDonation, work: () => Promise<string | void>) => {
    setBusyId(donation.id);
    setError("");
    setMessage("");
    try {
      const note = await work();
      if (note) setMessage(note);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (donation: MachineDonation, status: DonationStatus) =>
    run(donation, async () => {
      await api(`/api/machine-donations/${donation.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    });

  const saveNotes = (donation: MachineDonation, adminNotes: string) =>
    adminNotes !== donation.adminNotes &&
    run(donation, async () => {
      await api(`/api/machine-donations/${donation.id}`, { method: "PUT", body: JSON.stringify({ adminNotes }) });
    });

  const addToLog = (donation: MachineDonation) => {
    const many = donation.count > 1;
    if (!confirm(`Add ${many ? `${donation.count} machines` : "this machine"} to the machine log as Incoming?`)) return;
    run(donation, async () => {
      const { numbers } = await api(`/api/machine-donations/${donation.id}`, { method: "POST" });
      return `Added to the machine log as ${(numbers as number[]).map((n) => `#${n}`).join(", ")}. Fill in brand and model from the Machines tab.`;
    });
  };

  const remove = (donation: MachineDonation) => {
    if (!confirm(`Delete the offer from ${donation.name} and its photos? This can't be undone.`)) return;
    run(donation, async () => {
      await api(`/api/machine-donations/${donation.id}`, { method: "DELETE" });
    });
  };

  const count = (f: Filter) => (f === "all" ? donations.length : donations.filter((d) => d.status === f).length);
  const visible = filter === "all" ? donations : donations.filter((d) => d.status === filter);

  return (
    <div className={adminStyles.section}>
      <div className={adminStyles.sectionHeader}>
        <h2>Donations</h2>
      </div>
      <p className={styles.hint}>
        Machines offered through the{" "}
        <a href="/donate-machine" target="_blank" rel="noreferrer">
          Donate a machine
        </a>{" "}
        form. Photos are only visible to admins.
      </p>

      <div className={adminStyles.filterGroup} role="group" aria-label="Filter donations">
        {(["new", "contacted", "received", "declined", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            className={`${adminStyles.filterChip} ${filter === f ? adminStyles.filterChipActive : ""}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : DONATION_STATUS_LABELS[f]} ({count(f)})
          </button>
        ))}
      </div>

      {error && <div className={adminStyles.error}>{error}</div>}
      {message && <div className={styles.donationMessage}>{message}</div>}

      {loading ? (
        <p>Loading donations...</p>
      ) : visible.length === 0 ? (
        <p className={adminStyles.empty}>{donations.length === 0 ? "No machines offered yet." : "None here."}</p>
      ) : (
        <ul className={styles.poolList}>
          {visible.map((d) => (
            <li key={d.id} className={styles.poolCard} aria-busy={busyId === d.id}>
              <div className={styles.machineTitleRow}>
                <h3>
                  {d.count > 1 ? `${d.count} machines` : "1 machine"} from {d.name}
                </h3>
                <span className={`${styles.statusBadge} ${styles.servicing}`}>
                  {DONATION_STATUS_LABELS[d.status]}
                </span>
                {d.machineIds?.length > 0 && (
                  <span className={`${styles.statusBadge} ${styles.ready}`}>In machine log</span>
                )}
              </div>

              {d.photos?.length > 0 && (
                <div className={styles.donationPhotos}>
                  {d.photos.map((photo, i) => (
                    <PrivatePhoto key={photo.path} user={user} photo={photo} alt={`Photo ${i + 1} from ${d.name}`} />
                  ))}
                </div>
              )}

              <dl className={styles.specs}>
                <dt>Offered</dt>
                <dd>{formatDate(d.createdAt)}</dd>
                {d.kinds?.length > 0 && (
                  <>
                    <dt>Kind</dt>
                    <dd>{d.kinds.join(", ")}</dd>
                  </>
                )}
                {d.details && (
                  <>
                    <dt>Brand / model</dt>
                    <dd>{d.details}</dd>
                  </>
                )}
                <dt>Works?</dt>
                <dd>{WORKING_OPTIONS[d.working] ?? d.working}</dd>
                <dt>Getting it</dt>
                <dd>{HANDOVER_OPTIONS[d.handover] ?? d.handover}</dd>
                {d.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{d.notes}</dd>
                  </>
                )}
                <dt>Contact</dt>
                <dd className={styles.recipientContact}>
                  <a href={`mailto:${d.email}`}>{d.email}</a>
                  {d.phone && <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`}>{d.phone}</a>}
                  <span>{d.suburb}</span>
                </dd>
              </dl>

              <textarea
                className={styles.donationNotes}
                defaultValue={d.adminNotes}
                onBlur={(e) => saveNotes(d, e.target.value.trim())}
                placeholder="Notes for the team, e.g. picking up Saturday"
                aria-label="Team notes"
                rows={2}
              />

              <div className={styles.machineActions}>
                {!d.machineIds?.length && d.status !== "declined" && (
                  <button className="btn-primary" onClick={() => addToLog(d)} disabled={busyId === d.id}>
                    Add to machine log
                  </button>
                )}
                <select
                  value={d.status}
                  onChange={(e) => setStatus(d, e.target.value as DonationStatus)}
                  aria-label="Status"
                  className={styles.reportSelect}
                  disabled={busyId === d.id}
                >
                  {DONATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DONATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button className={adminStyles.deleteBtn} onClick={() => remove(d)} disabled={busyId === d.id}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

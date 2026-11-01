"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import EditModal from "@/components/ui/EditModal";
import { deleteStoredFiles } from "@/lib/imageUpload";
import type { Organisation, OrgGroup } from "@/lib/organisations";
import { useAdminApi } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

// Kept here rather than imported, so the server-only organisations module stays out of the browser
const GROUPS: { id: OrgGroup; label: string; hint: string }[] = [
  {
    id: "partner",
    label: "Partners & supporters",
    hint: "Shown under “Thank you” on the home and About pages.",
  },
  {
    id: "recipient",
    label: "Organisations given machines",
    hint: "Shown on the Repair Programme page and the home page’s programme section.",
  },
];

const emptyForm = { name: "", role: "", url: "", group: "partner" as OrgGroup };

/** Add, edit, reorder and remove the organisations shown on the site */
export default function PartnersPanel({ user }: { user: User | null }) {
  const api = useAdminApi(user);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ editing: Organisation | null; values: typeof emptyForm } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api("/api/organisations");
      setOrganisations((data.organisations as Organisation[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organisations");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (org: Organisation | null, group: OrgGroup = "partner") =>
    setForm({
      editing: org,
      values: org ? { name: org.name, role: org.role, url: org.url, group: org.group } : { ...emptyForm, group },
    });

  const setValue = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => (f ? { ...f, values: { ...f.values, [key]: value } } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      await api(form.editing ? `/api/organisations/${form.editing.id}` : "/api/organisations", {
        method: form.editing ? "PUT" : "POST",
        body: JSON.stringify(form.values),
      });
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const move = async (org: Organisation, direction: "up" | "down") => {
    setError("");
    try {
      await api(`/api/organisations/${org.id}`, { method: "PUT", body: JSON.stringify({ move: direction }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const remove = async (org: Organisation) => {
    if (!confirm(`Remove ${org.name} from the website? Its logo is removed too.`)) return;
    setError("");
    try {
      const { previousPaths } = await api(`/api/organisations/${org.id}`, { method: "DELETE" });
      // Tidying up the old logo files is best effort
      if (Array.isArray(previousPaths) && previousPaths.length) {
        deleteStoredFiles(previousPaths as string[]).catch(() => {});
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  return (
    <div className={adminStyles.section}>
      <div className={adminStyles.sectionHeader}>
        <h2>Partners</h2>
        <button className="btn-primary" onClick={() => openForm(null)}>
          Add partner
        </button>
      </div>
      <p className={styles.hint}>
        Logos are added on the website itself: while logged in as an admin, each badge has an &ldquo;Add logo&rdquo;
        button.
      </p>

      {error && !form && <div className={adminStyles.error}>{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        GROUPS.map(({ id, label, hint }) => {
          const list = organisations.filter((o) => o.group === id);
          return (
            <section key={id} className={styles.orgSection}>
              <div className={styles.labelRow}>
                <h3 className={styles.libraryHeading}>{label}</h3>
                <button type="button" className={styles.textButton} onClick={() => openForm(null, id)}>
                  + Add
                </button>
              </div>
              <p className={styles.hint}>{hint}</p>
              {list.length === 0 ? (
                <p className={adminStyles.empty}>None yet. This section is hidden on the site until one is added.</p>
              ) : (
                <ul className={styles.purchaseList}>
                  {list.map((org, index) => (
                    <li key={org.id} className={styles.purchaseItem}>
                      <div>
                        <strong>{org.name}</strong>
                        <span className={styles.applicantMeta}>
                          {[org.role, org.url && org.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")]
                            .filter(Boolean)
                            .join(" · ") || "No role or link"}
                        </span>
                      </div>
                      <div className={styles.purchaseActions}>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => move(org, "up")}
                          disabled={index === 0}
                          aria-label={`Move ${org.name} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => move(org, "down")}
                          disabled={index === list.length - 1}
                          aria-label={`Move ${org.name} down`}
                        >
                          ↓
                        </button>
                        <button type="button" className={styles.textButton} onClick={() => openForm(org)}>
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      <EditModal
        isOpen={!!form}
        onClose={() => setForm(null)}
        title={form?.editing ? `Edit ${form.editing.name}` : "Add partner"}
      >
        {form && (
          <form onSubmit={save} className={`${adminStyles.form} ${styles.modalForm}`}>
            {error && <div className={adminStyles.error}>{error}</div>}
            <div className={adminStyles.formGroup}>
              <label htmlFor="org-name">Name *</label>
              <input
                id="org-name"
                type="text"
                value={form.values.name}
                onChange={(e) => setValue("name", e.target.value)}
                placeholder="e.g. EcoMatters"
                required
              />
            </div>
            <div className={adminStyles.formRow}>
              <div className={adminStyles.formGroup}>
                <label htmlFor="org-role">Role</label>
                <input
                  id="org-role"
                  type="text"
                  value={form.values.role}
                  onChange={(e) => setValue("role", e.target.value)}
                  placeholder="e.g. Funder (optional)"
                />
              </div>
              <div className={adminStyles.formGroup}>
                <label htmlFor="org-url">Website</label>
                <input
                  id="org-url"
                  type="text"
                  inputMode="url"
                  value={form.values.url}
                  onChange={(e) => setValue("url", e.target.value)}
                  placeholder="e.g. ecomatters.org.nz (optional)"
                />
              </div>
            </div>
            <div className={adminStyles.formGroup}>
              <span className={styles.label}>Show in</span>
              <div className={styles.segmented} role="radiogroup" aria-label="Show in">
                {GROUPS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={form.values.group === id}
                    className={form.values.group === id ? styles.segmentActive : undefined}
                    onClick={() => setValue("group", id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.removeActions}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : form.editing ? "Save" : "Add"}
              </button>
              {form.editing && (
                <button type="button" className={adminStyles.deleteBtn} onClick={() => remove(form.editing!)}>
                  Remove from website
                </button>
              )}
            </div>
          </form>
        )}
      </EditModal>
    </div>
  );
}

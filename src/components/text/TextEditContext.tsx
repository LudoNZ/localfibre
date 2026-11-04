"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EditModal from "@/components/ui/EditModal";
import { MAX_TEXT_LENGTH, TEXT_SLOTS, TextKey } from "@/lib/siteTextSlots";
import styles from "./EditableText.module.css";

interface TextEditState {
  /** True while an admin has edit mode switched on */
  editing: boolean;
  /** Text saved in this visit, shown straight away while the page refreshes */
  saved: Partial<Record<TextKey, string>>;
  open: (id: TextKey, current: string) => void;
}

const TextEditContext = createContext<TextEditState>({ editing: false, saved: {}, open: () => {} });

export const useTextEdit = () => useContext(TextEditContext);

/** Edit mode for admins: a toggle on every page that shows text and photo editing, and the window for changing text */
export function TextEditProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const [saved, setSaved] = useState<Partial<Record<TextKey, string>>>({});
  const [target, setTarget] = useState<{ id: TextKey; current: string } | null>(null);

  // The admin panel has no page text, so edit mode stays off there
  const available = isAdmin && !pathname.startsWith("/admin");
  const editing = available && on;

  const open = useCallback((id: TextKey, current: string) => setTarget({ id, current }), []);

  return (
    <TextEditContext.Provider value={{ editing, saved, open }}>
      {children}
      {available && (
        <button
          type="button"
          className={`${styles.toggle} ${editing ? styles.toggleOn : ""}`}
          aria-pressed={editing}
          onClick={() => setOn((v) => !v)}
        >
          {editing ? "✓ Done editing" : "✎ Edit page"}
        </button>
      )}
      {editing && (
        <p className={styles.banner} role="status">
          Edit mode: tap outlined text, or a photo’s edit button
        </p>
      )}
      <EditModal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        title={target ? TEXT_SLOTS[target.id].label : "Edit text"}
      >
        {target && (
          <TextForm
            key={target.id}
            id={target.id}
            current={target.current}
            onSaved={(text) => {
              setSaved((s) => ({ ...s, [target.id]: text }));
              setTarget(null);
            }}
          />
        )}
      </EditModal>
    </TextEditContext.Provider>
  );
}

function TextForm({ id, current, onSaved }: { id: TextKey; current: string; onSaved: (text: string) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const slot = TEXT_SLOTS[id];
  const multiline = !!slot.multiline;
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = value.trim() !== current;
  const isOriginal = current === slot.text;

  const save = async (text: string) => {
    setSaving(true);
    setError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/site-text", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: id, text: multiline ? text : text.replace(/\s*\n\s*/g, " ") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save");
      onSaved(data.text);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      {error && <p className={styles.error}>{error}</p>}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter saves a one-line text; Ctrl/Cmd+Enter saves any
          if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save(value);
          }
        }}
        rows={multiline ? Math.min(14, Math.max(4, Math.ceil(value.length / 60) + 1)) : 2}
        maxLength={MAX_TEXT_LENGTH}
        aria-label={slot.label}
        className={styles.textarea}
        autoFocus
        onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
      />
      <p className={styles.hint}>
        {multiline && "Leave a blank line between paragraphs. "}
        Add a link like this: [link text](/repair-programme) or [email us](mailto:hello@localfibre.co.nz).
      </p>

      {!isOriginal && (
        <details className={styles.original}>
          <summary>Original wording</summary>
          <p>{slot.text}</p>
        </details>
      )}

      <div className={styles.actions}>
        <button type="submit" className="btn-primary" disabled={saving || !changed || !value.trim()}>
          {saving ? "Saving..." : "Save"}
        </button>
        {!isOriginal && (
          <button type="button" className={styles.reset} onClick={() => save("")} disabled={saving}>
            Restore original
          </button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { MachineRequest } from "@/lib/sewingMachines";
import {
  defaultPausedMessage,
  isBuiltInKind,
  kindIdFor,
  MAX_KIND_NAME,
  MAX_KINDS,
  MAX_REQUEST_OPTION_MESSAGE,
  pluralise,
  REQUEST_OPTION_MODE_LABELS,
  REQUEST_OPTION_MODES,
  RequestKindDef,
} from "@/lib/requestOptions";
import { setRequestKinds, useRequestKinds } from "@/lib/useRequestKinds";
import { useAdminApi } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./RequestOptionsPanel.module.css";

const MODE_HINTS = {
  open: "People can ask for it.",
  paused: "Shown greyed out with your message, so people know it's coming back.",
  hidden: "Not shown on the form at all.",
} as const;

const sameList = (a: RequestKindDef[], b: RequestKindDef[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The kinds of machine on the public waiting-list form: add new ones, rename and
 * reorder them, and open, grey out or hide each. Past requests are never changed,
 * and a kind can only be deleted while nobody has asked for it.
 */
export default function RequestOptionsPanel({
  user,
  requests,
}: {
  user: User | null;
  /** What every application (any status) asked for, to count each kind's history */
  requests: MachineRequest[];
}) {
  const api = useAdminApi(user);
  const { kinds: saved, loaded } = useRequestKinds();
  // null until the admin changes something, so it follows the saved list until then
  const [edits, setEdits] = useState<RequestKindDef[] | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  const draft = edits ?? saved;
  const changed = !!edits && !sameList(edits, saved);
  const notOpen = saved.filter((kind) => kind.mode !== "open");
  const history = (id: string) => requests.filter((request) => (request[id] ?? 0) > 0).length;

  const change = (next: RequestKindDef[]) => {
    setEdits(next);
    setStatus("idle");
    setError("");
  };
  const update = (id: string, patch: Partial<RequestKindDef>) =>
    change(draft.map((kind) => (kind.id === id ? { ...kind, ...patch } : kind)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...draft];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    change(next);
  };

  const trimmedNew = newName.trim();
  const duplicate = draft.find((kind) => kind.one.toLowerCase() === trimmedNew.toLowerCase());
  const addKind = () => {
    if (!trimmedNew || duplicate || draft.length >= MAX_KINDS) return;
    const one = trimmedNew[0].toUpperCase() + trimmedNew.slice(1);
    const id = kindIdFor(one, draft.map((k) => k.id));
    change([...draft, { id, one, many: pluralise(one), mode: "open", message: "" }]);
    setNewName("");
  };

  const save = async () => {
    setStatus("saving");
    setError("");
    try {
      const data = await api("/api/request-options", {
        method: "PUT",
        body: JSON.stringify({ kinds: draft }),
      });
      setRequestKinds(data.kinds as RequestKindDef[]);
      setEdits(null);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setStatus("idle");
    }
  };

  if (!loaded) return null;

  return (
    <details className={styles.panel} open={notOpen.length > 0 || changed || undefined}>
      <summary className={styles.summary}>
        <span className={styles.summaryTitle}>Machines people can ask for</span>
        <span className={styles.summaryState}>
          {notOpen.length === 0
            ? `${saved.length} open`
            : notOpen.map((kind) => `${kind.one}: ${kind.mode === "paused" ? "paused" : "hidden"}`).join(" · ")}
        </span>
      </summary>

      <p className={styles.intro}>
        Changes only affect new requests on the public form. Everyone already on the list keeps what they asked
        for, and you can still edit their requests here.
      </p>

      <div className={styles.kinds}>
        {draft.map((kind, index) => {
          const count = history(kind.id);
          const builtIn = isBuiltInKind(kind.id);
          const isNew = !saved.some((k) => k.id === kind.id);
          const canDelete = !builtIn && count === 0;
          return (
            <fieldset key={kind.id} className={styles.kind}>
              <legend className={styles.kindName}>
                {kind.one || "New machine"}
                {isNew && <span className={styles.newTag}>New, not saved yet</span>}
                {count > 0 && (
                  <span className={styles.history}>
                    {count} past {count === 1 ? "request" : "requests"} kept
                  </span>
                )}
              </legend>

              <div className={styles.kindTools}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${kind.one} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  aria-label={`Move ${kind.one} down`}
                >
                  ↓
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => change(draft.filter((k) => k.id !== kind.id))}
                  >
                    Delete
                  </button>
                ) : (
                  !builtIn && <span className={styles.hint}>Has history, so it can be hidden but not deleted.</span>
                )}
              </div>

              <div className={adminStyles.formRow}>
                <div className={adminStyles.formGroup}>
                  <label htmlFor={`kind-${kind.id}-one`}>Name</label>
                  <input
                    id={`kind-${kind.id}-one`}
                    value={kind.one}
                    maxLength={MAX_KIND_NAME}
                    onChange={(e) => update(kind.id, { one: e.target.value })}
                  />
                </div>
                <div className={adminStyles.formGroup}>
                  <label htmlFor={`kind-${kind.id}-many`}>Plural, in sentences</label>
                  <input
                    id={`kind-${kind.id}-many`}
                    value={kind.many}
                    maxLength={MAX_KIND_NAME}
                    placeholder={pluralise(kind.one)}
                    onChange={(e) => update(kind.id, { many: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modes} role="radiogroup" aria-label={`${kind.one} on the form`}>
                {REQUEST_OPTION_MODES.map((mode) => (
                  <label key={mode} className={`${styles.mode} ${kind.mode === mode ? styles.modeActive : ""}`}>
                    <input
                      type="radio"
                      name={`request-option-${kind.id}`}
                      checked={kind.mode === mode}
                      onChange={() => update(kind.id, { mode })}
                    />
                    <span>
                      <strong>{REQUEST_OPTION_MODE_LABELS[mode]}</strong>
                      <small>{MODE_HINTS[mode]}</small>
                    </span>
                  </label>
                ))}
              </div>

              {kind.mode === "paused" && (
                <div className={adminStyles.formGroup}>
                  <label htmlFor={`kind-${kind.id}-message`}>Message shown under it</label>
                  <textarea
                    id={`kind-${kind.id}-message`}
                    value={kind.message}
                    maxLength={MAX_REQUEST_OPTION_MESSAGE}
                    placeholder={defaultPausedMessage({ many: kind.many || pluralise(kind.one) })}
                    onChange={(e) => update(kind.id, { message: e.target.value })}
                    rows={3}
                  />
                  <small className={styles.hint}>Leave empty to use the wording shown in grey.</small>
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      <div className={styles.addKind}>
        <div className={adminStyles.formGroup}>
          <label htmlFor="new-kind-name">Add a machine people can ask for</label>
          <div className={styles.addRow}>
            <input
              id="new-kind-name"
              value={newName}
              maxLength={MAX_KIND_NAME}
              placeholder="e.g. Embroidery machine"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKind();
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={addKind}
              disabled={!trimmedNew || !!duplicate || draft.length >= MAX_KINDS}
            >
              Add
            </button>
          </div>
          {duplicate && <small className={styles.hint}>{duplicate.one} is already on the list.</small>}
        </div>
      </div>

      {error && <p className={adminStyles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn-primary"
          onClick={save}
          disabled={!changed || status === "saving" || draft.some((kind) => !kind.one.trim())}
        >
          {status === "saving" ? "Saving..." : "Save"}
        </button>
        {changed && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setEdits(null);
              setError("");
            }}
          >
            Undo changes
          </button>
        )}
        {status === "saved" && !changed && (
          <span className={styles.savedNote} role="status">
            Saved. The form is updated.
          </span>
        )}
        <a href="/sewing-machines" target="_blank" rel="noreferrer" className={styles.previewLink}>
          View the form ↗
        </a>
      </div>
    </details>
  );
}

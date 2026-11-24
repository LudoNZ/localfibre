"use client";

import { Fragment } from "react";
import { ApplicantType, MachineRequest, MAX_REQUEST_PER_KIND, requestTotal } from "@/lib/sewingMachines";
import { openKinds, pausedMessage, RequestKindDef, visibleKinds } from "@/lib/requestOptions";
import styles from "./MachineRequestPicker.module.css";

/** One machine for an individual; organisations pick how many of each */
export function fitRequest(request: MachineRequest, applicantType: ApplicantType | ""): MachineRequest {
  if (applicantType === "communityGroup" || requestTotal(request) <= 1) return request;
  const first = Object.keys(request).find((kind) => request[kind] > 0);
  return first ? { [first]: 1 } : {};
}

const capitalise = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text);

interface Props {
  applicantType: ApplicantType | "";
  value: MachineRequest;
  onChange: (value: MachineRequest) => void;
  /** The kinds of machine, in order */
  kinds: RequestKindDef[];
  /**
   * The public form: hidden kinds are left out and paused ones greyed out with their
   * message. Otherwise (admins) every kind is offered, so past requests can be corrected.
   */
  publicForm?: boolean;
  disabled?: boolean;
  /** Prefix for input ids, so two pickers can share a page */
  idPrefix?: string;
}

export default function MachineRequestPicker({
  applicantType,
  value,
  onChange,
  kinds,
  publicForm,
  disabled,
  idPrefix = "request",
}: Props) {
  const shown = publicForm ? visibleKinds(kinds) : kinds;
  const isPaused = (kind: RequestKindDef) => !!publicForm && kind.mode === "paused";
  const noneOpen = !!publicForm && openKinds(kinds).length === 0;
  const count = (kind: RequestKindDef) => value[kind.id] ?? 0;
  const notice = (kind: RequestKindDef) => (
    <p id={`${idPrefix}-${kind.id}-paused`} className={styles.pausedMessage}>
      {pausedMessage(kind)}
    </p>
  );
  const closedNote = noneOpen ? (
    <p className={styles.warning}>We&apos;re not taking new requests right now. Please check back soon.</p>
  ) : null;

  if (applicantType !== "communityGroup") {
    const chosen = shown.find((kind) => count(kind) > 0)?.id;
    return (
      <div className={styles.kindList}>
        <div className={styles.options} role="radiogroup" aria-label="Machine">
          {shown.map((kind) => (
            <label
              key={kind.id}
              className={`${styles.option} ${chosen === kind.id ? styles.optionActive : ""} ${
                isPaused(kind) ? styles.optionPaused : ""
              }`}
            >
              <input
                type="radio"
                name={`${idPrefix}-kind`}
                checked={chosen === kind.id}
                onChange={() => onChange({ [kind.id]: 1 })}
                disabled={disabled || isPaused(kind)}
                aria-describedby={isPaused(kind) ? `${idPrefix}-${kind.id}-paused` : undefined}
                required
              />
              {kind.one}
              {isPaused(kind) && <span className={styles.pausedTag}>Paused</span>}
            </label>
          ))}
        </div>
        {shown.filter(isPaused).map((kind) => (
          <Fragment key={kind.id}>{notice(kind)}</Fragment>
        ))}
        {closedNote}
      </div>
    );
  }

  const set = (kind: RequestKindDef, n: number) =>
    onChange({ ...value, [kind.id]: Math.min(MAX_REQUEST_PER_KIND, Math.max(0, Math.round(n) || 0)) });

  return (
    <div className={styles.counts}>
      {shown.map((kind) => {
        const id = `${idPrefix}-${kind.id}`;
        if (isPaused(kind)) {
          return (
            <div key={kind.id} className={`${styles.countRow} ${styles.countRowPaused}`}>
              <span className={styles.pausedLabel}>
                {capitalise(kind.many)} <span className={styles.pausedTag}>Paused</span>
              </span>
              {notice(kind)}
            </div>
          );
        }
        return (
          <div key={kind.id} className={styles.countRow}>
            <label htmlFor={id}>{capitalise(kind.many)}</label>
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => set(kind, count(kind) - 1)}
                disabled={disabled || count(kind) <= 0}
                aria-label={`One fewer ${kind.one.toLowerCase()}`}
              >
                −
              </button>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_REQUEST_PER_KIND}
                value={count(kind)}
                onChange={(e) => set(kind, Number(e.target.value))}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => set(kind, count(kind) + 1)}
                disabled={disabled || count(kind) >= MAX_REQUEST_PER_KIND}
                aria-label={`One more ${kind.one.toLowerCase()}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
      {closedNote ?? (requestTotal(value) === 0 && <p className={styles.warning}>Choose at least one machine.</p>)}
    </div>
  );
}

"use client";

import {
  ApplicantType,
  MachineRequest,
  MAX_REQUEST_PER_KIND,
  REQUEST_KINDS,
  RequestKind,
  requestTotal,
} from "@/lib/sewingMachines";
import styles from "./MachineRequestPicker.module.css";

const KINDS = Object.keys(REQUEST_KINDS) as RequestKind[];

/** One machine for an individual; organisations pick how many of each */
export function fitRequest(request: MachineRequest, applicantType: ApplicantType | ""): MachineRequest {
  if (applicantType === "communityGroup" || requestTotal(request) <= 1) return request;
  const first = KINDS.find((kind) => request[kind] > 0) ?? "sewingMachine";
  return Object.fromEntries(KINDS.map((kind) => [kind, kind === first ? 1 : 0])) as MachineRequest;
}

interface Props {
  applicantType: ApplicantType | "";
  value: MachineRequest;
  onChange: (value: MachineRequest) => void;
  disabled?: boolean;
  /** Prefix for input ids, so two pickers can share a page */
  idPrefix?: string;
}

export default function MachineRequestPicker({ applicantType, value, onChange, disabled, idPrefix = "request" }: Props) {
  if (applicantType !== "communityGroup") {
    const chosen = KINDS.find((kind) => value[kind] > 0);
    return (
      <div className={styles.options} role="radiogroup" aria-label="Machine">
        {KINDS.map((kind) => (
          <label key={kind} className={`${styles.option} ${chosen === kind ? styles.optionActive : ""}`}>
            <input
              type="radio"
              name={`${idPrefix}-kind`}
              checked={chosen === kind}
              onChange={() =>
                onChange(Object.fromEntries(KINDS.map((k) => [k, k === kind ? 1 : 0])) as MachineRequest)
              }
              disabled={disabled}
              required
            />
            {REQUEST_KINDS[kind].one}
          </label>
        ))}
      </div>
    );
  }

  const set = (kind: RequestKind, n: number) =>
    onChange({ ...value, [kind]: Math.min(MAX_REQUEST_PER_KIND, Math.max(0, Math.round(n) || 0)) });

  return (
    <div className={styles.counts}>
      {KINDS.map((kind) => {
        const id = `${idPrefix}-${kind}`;
        return (
          <div key={kind} className={styles.countRow}>
            <label htmlFor={id}>{REQUEST_KINDS[kind].one}s</label>
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => set(kind, value[kind] - 1)}
                disabled={disabled || value[kind] <= 0}
                aria-label={`One fewer ${REQUEST_KINDS[kind].one.toLowerCase()}`}
              >
                −
              </button>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_REQUEST_PER_KIND}
                value={value[kind]}
                onChange={(e) => set(kind, Number(e.target.value))}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => set(kind, value[kind] + 1)}
                disabled={disabled || value[kind] >= MAX_REQUEST_PER_KIND}
                aria-label={`One more ${REQUEST_KINDS[kind].one.toLowerCase()}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
      {requestTotal(value) === 0 && <p className={styles.warning}>Choose at least one machine.</p>}
    </div>
  );
}

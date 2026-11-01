"use client";

import { useState } from "react";
import EditModal from "@/components/ui/EditModal";
import { SewingMachine, sameName } from "@/lib/sewingMachines";
import { AdminApi, MachineLibrary } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

// The library list an item is being taken off
export type RemoveItemTarget =
  | { item: string; typeId: string }
  | { item: string; brandId: string; model: string };

interface RemoveItemDialogProps {
  api: AdminApi;
  library: MachineLibrary;
  machines: SewingMachine[];
  target: RemoveItemTarget | null;
  onClose: () => void;
  onRemoved: () => Promise<void>;
}

/** Confirms removing a comes-with item, and asks what happens on machines that have it ticked */
export default function RemoveItemDialog(props: RemoveItemDialogProps) {
  // Remount per item so the choice and error start fresh
  const { target } = props;
  return (
    <EditModal isOpen={!!target} onClose={props.onClose} title="Remove item">
      {target && <RemoveItemBody key={JSON.stringify(target)} {...props} target={target} />}
    </EditModal>
  );
}

function RemoveItemBody({
  api,
  library,
  machines,
  target,
  onClose,
  onRemoved,
}: RemoveItemDialogProps & { target: RemoveItemTarget }) {
  const [keepAs, setKeepAs] = useState<"models" | "custom">("models");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isType = "typeId" in target;
  const type = isType ? library.types.find((t) => t.id === target.typeId) : undefined;
  const brand = !isType ? library.brands.find((b) => b.id === target.brandId) : undefined;
  const listName = isType
    ? `the default list for ${type?.name.toLowerCase() ?? "this type"}s`
    : `${brand?.name ?? ""} ${!isType ? target.model : ""}`.trim();

  // Logged machines that have this item ticked and use this list
  const affected = machines.filter(
    (m) =>
      (m.comesWith || []).some((c) => sameName(c, target.item)) &&
      (isType ? m.typeId === target.typeId : sameName(m.brand, brand?.name ?? "") && sameName(m.model, target.model))
  );
  const models = [...new Set(affected.filter((m) => m.model).map((m) => `${m.brand} ${m.model}`))];
  const withoutModel = affected.filter((m) => !m.model).length;
  const offerModels = isType && models.length > 0;

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/machine-library/remove-item", {
        method: "POST",
        body: JSON.stringify({
          item: target.item,
          ...(isType ? { typeId: target.typeId } : { brandId: target.brandId, model: target.model }),
          keepAs: offerModels ? keepAs : "custom",
        }),
      });
      await onRemoved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove the item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.removeDialog}>
      {error && <div className={adminStyles.error}>{error}</div>}
      <p>
        Remove <strong>{target.item}</strong> from {listName}?
      </p>

      {affected.length === 0 ? (
        <p className={styles.hint}>No logged machines have it ticked.</p>
      ) : (
        <>
          <p className={styles.hint}>
            {affected.length} logged machine{affected.length === 1 ? " has" : "s have"} it ticked
            {models.length > 0 && `: ${models.join(", ")}`}
            {withoutModel > 0 && `${models.length ? "," : ":"} ${withoutModel} without a model`}. They keep it either
            way.
          </p>

          {offerModels && (
            <div className={styles.removeChoices} role="radiogroup" aria-label="What should happen to it">
              <label className={styles.applicantOption}>
                <input type="radio" checked={keepAs === "models"} onChange={() => setKeepAs("models")} />
                <span className={styles.applicantInfo}>
                  <strong>Add it to those models</strong>
                  <span className={styles.applicantMeta}>
                    {models.join(", ")} will still list {target.item}, so the next one of those models gets it too.
                  </span>
                </span>
              </label>
              <label className={styles.applicantOption}>
                <input type="radio" checked={keepAs === "custom"} onChange={() => setKeepAs("custom")} />
                <span className={styles.applicantInfo}>
                  <strong>Keep it as a custom item on those machines only</strong>
                  <span className={styles.applicantMeta}>
                    It stays ticked on the {affected.length} machine{affected.length === 1 ? "" : "s"}, but no list
                    will offer it again.
                  </span>
                </span>
              </label>
            </div>
          )}
          {!offerModels && (
            <p className={styles.hint}>It stays on those machines as a custom item.</p>
          )}
        </>
      )}

      <div className={styles.removeActions}>
        <button type="button" className={adminStyles.deleteBtn} onClick={remove} disabled={busy}>
          {busy ? "Removing..." : "Remove"}
        </button>
        <button type="button" className={styles.textButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

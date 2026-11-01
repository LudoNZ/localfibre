"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { optimiseImage } from "@/lib/imageUpload";
import {
  MACHINE_CONDITION_LABELS,
  MACHINE_STATUS_LABELS,
  SewingMachine,
  WORKSHOP_STATUSES,
  WorkshopStatus,
  checklistFor,
  dedupe,
  isWorkshopStatus,
  sameName,
} from "@/lib/sewingMachines";
import AssignFields from "./AssignFields";
import BrandModelPicker from "./BrandModelPicker";
import {
  AdminApi,
  AssignChoice,
  MachineLibrary,
  WaitingApplication,
  assignBody,
  findBrand,
  findModel,
} from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

interface MachineFormProps {
  api: AdminApi;
  library: MachineLibrary;
  reloadLibrary: () => Promise<void>;
  editing: SewingMachine | null;
  assignable: WaitingApplication[];
  queueNumbers: Map<string, number>;
  onSaved: () => Promise<void>;
}

type FormState = {
  typeId: string;
  brand: string;
  model: string;
  serialNumber: string;
  condition: number | null;
  comesWith: string[];
  notes: string;
  photos: string[];
  status: WorkshopStatus;
};

function initialForm(machine: SewingMachine | null, library: MachineLibrary): FormState {
  if (!machine) {
    return {
      typeId: library.types[0]?.id || "",
      brand: "",
      model: "",
      serialNumber: "",
      condition: null,
      comesWith: [],
      notes: "",
      photos: [],
      status: "incoming",
    };
  }
  return {
    typeId: machine.typeId || "",
    brand: machine.brand,
    model: machine.model,
    serialNumber: machine.serialNumber,
    condition: machine.condition ?? null,
    comesWith: machine.comesWith || [],
    notes: machine.notes,
    photos: machine.photos || [],
    status: isWorkshopStatus(machine.status) ? machine.status : "ready",
  };
}

/** Add or edit a machine. New brands and models are learnt into the library on save. */
export default function MachineForm({
  api,
  library,
  reloadLibrary,
  editing,
  assignable,
  queueNumbers,
  onSaved,
}: MachineFormProps) {
  const [form, setForm] = useState(() => initialForm(editing, library));
  // Items added by hand on this machine, and the ones to remember for its model
  const [extraItems, setExtraItems] = useState<string[]>([]);
  const [rememberItems, setRememberItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [rememberNewItem, setRememberNewItem] = useState(true);
  const [assign, setAssign] = useState<AssignChoice>({ mode: "none" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const brand = findBrand(library, form.brand);
  const libraryModel = findModel(brand, form.model);
  const type = library.types.find((t) => t.id === form.typeId);
  const isHandedOver = editing?.status === "repurposed";
  const canAssign = !editing?.recipient && !isHandedOver;

  // Everything that could be ticked: type list, model extras, and anything already ticked
  const checklist = dedupe([
    ...checklistFor(type, libraryModel),
    ...rememberItems,
    ...extraItems,
    ...form.comesWith,
  ]);
  const isTicked = (item: string) => form.comesWith.some((c) => sameName(c, item));

  // A model from the library brings its type with it
  const chooseBrandModel = (brandName: string, modelName: string) => {
    const model = findModel(findBrand(library, brandName), modelName);
    setForm((f) => ({ ...f, brand: brandName, model: modelName, typeId: model?.typeId || f.typeId }));
  };

  const toggleItem = (item: string) => {
    setForm((f) => ({
      ...f,
      comesWith: isTicked(item) ? f.comesWith.filter((c) => !sameName(c, item)) : [...f.comesWith, item],
    }));
  };

  const addItem = () => {
    const item = newItem.trim();
    if (!item) return;
    const canRemember = !!form.brand.trim() && !!form.model.trim();
    if (rememberNewItem && canRemember) setRememberItems((list) => dedupe([...list, item]));
    else setExtraItems((list) => dedupe([...list, item]));
    setForm((f) => ({ ...f, comesWith: dedupe([...f.comesWith, item]) }));
    setNewItem("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          // Shrink phone photos before upload so pages and emails stay quick
          const { variants } = await optimiseImage(file, { widths: [1600] });
          const { blob, ext } = variants[variants.length - 1];
          const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "_");
          const storageRef = ref(storage, `sewingMachines/${Date.now()}-${safeName}.${ext}`);
          await uploadBytes(storageRef, blob, { contentType: blob.type });
          return getDownloadURL(storageRef);
        })
      );
      setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "storage/unauthorized"
          ? "Photo upload blocked by Firebase Storage permissions. You can still save the machine without photos."
          : err instanceof Error
            ? err.message
            : "Failed to upload photo"
      );
    } finally {
      setUploading(false);
    }
  };

  /** Add a new brand, model or remembered items to the library so next time is quicker */
  const learnIntoLibrary = async () => {
    const brandName = form.brand.trim();
    const modelName = form.model.trim();
    if (!brandName) return false;

    let target = brand;
    let changed = false;
    if (!target) {
      const { item } = (await api("/api/machine-library", {
        method: "POST",
        body: JSON.stringify({ kind: "brand", name: brandName }),
      })) as { item: { id: string; name: string; models: [] } };
      target = item;
      changed = true;
    }
    if (!modelName) return changed;

    const existing = findModel(target, modelName);
    const extras = dedupe([...(existing?.extras ?? []), ...rememberItems]);
    const typeId = existing?.typeId || form.typeId;
    const needsUpdate =
      !existing || extras.length !== existing.extras.length || typeId !== existing.typeId;
    if (!needsUpdate) return changed;

    const models = existing
      ? target.models.map((m) => (m === existing ? { ...m, typeId, extras } : m))
      : [...target.models, { name: modelName, typeId, extras }];
    await api(`/api/machine-library/brands/${target.id}`, {
      method: "PUT",
      body: JSON.stringify({ models }),
    });
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!form.brand.trim()) throw new Error("Select a brand");
      if (assign.mode === "manual" && !assign.fullName.trim()) {
        throw new Error("Enter the name of the person this machine is for");
      }

      const details = {
        typeId: form.typeId,
        typeName: type?.name || "",
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber,
        condition: form.condition,
        comesWith: form.comesWith,
        notes: form.notes,
        photos: form.photos,
        ...(isHandedOver ? {} : { status: form.status }),
      };
      const saved = await api(editing ? `/api/machines/${editing.id}` : "/api/machines", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(details),
      });
      const machineId = editing?.id || (saved.id as string);

      const libraryChanged = await learnIntoLibrary().catch((err) => {
        console.error("Couldn't update the machine library:", err);
        return false;
      });

      const body = canAssign ? assignBody(assign) : null;
      if (body) {
        await api(`/api/machines/${machineId}`, { method: "PATCH", body: JSON.stringify(body) }).catch(
          (err) => {
            throw new Error(`Machine saved, but assigning failed: ${err.message}`);
          }
        );
      }

      if (libraryChanged) await reloadLibrary();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save machine");
    } finally {
      setSaving(false);
    }
  };

  const canRememberItems = !!form.brand.trim() && !!form.model.trim();

  return (
    <form onSubmit={handleSave} className={adminStyles.form}>
      {error && <div className={adminStyles.error}>{error}</div>}

      {/* Brand + model, picked together from the library */}
      <div className={adminStyles.formGroup}>
        <label htmlFor="machine-brand">Brand &amp; model *</label>
        <BrandModelPicker
          api={api}
          library={library}
          reloadLibrary={reloadLibrary}
          brand={form.brand}
          model={form.model}
          typeId={form.typeId}
          onChange={chooseBrandModel}
          onRenamed={(brandName, modelName, newTypeId) =>
            setForm((f) => ({ ...f, brand: brandName, model: modelName, typeId: newTypeId || f.typeId }))
          }
        />
      </div>

      {/* Type */}
      <div className={adminStyles.formGroup}>
        <span className={styles.label}>Type</span>
        <div className={styles.chips} role="radiogroup" aria-label="Machine type">
          {library.types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={form.typeId === t.id}
              className={`${styles.chip} ${form.typeId === t.id ? styles.chipActive : ""}`}
              onClick={() => setForm((f) => ({ ...f, typeId: t.id }))}
            >
              {t.name}
            </button>
          ))}
        </div>
        {libraryModel && libraryModel.typeId && libraryModel.typeId !== form.typeId && (
          <p className={styles.hint}>
            The library lists {form.model} as a{" "}
            {library.types.find((t) => t.id === libraryModel.typeId)?.name.toLowerCase() || "different type"}.
          </p>
        )}
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="machine-serial">Serial number</label>
        <input
          id="machine-serial"
          type="text"
          value={form.serialNumber}
          onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
          autoComplete="off"
        />
      </div>

      {/* Condition, 1-5 */}
      <div className={adminStyles.formGroup}>
        <span className={styles.label} id="machine-condition">
          Condition
        </span>
        <div className={styles.conditionPicker} role="radiogroup" aria-labelledby="machine-condition">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={form.condition === n}
              aria-label={`${n} – ${MACHINE_CONDITION_LABELS[n]}`}
              className={`${styles.conditionDot} ${form.condition !== null && n <= form.condition ? styles.conditionOn : ""}`}
              onClick={() => setForm((f) => ({ ...f, condition: f.condition === n ? null : n }))}
            >
              {n}
            </button>
          ))}
          <span className={styles.conditionLabel}>
            {form.condition ? MACHINE_CONDITION_LABELS[form.condition] : "Not rated"}
          </span>
        </div>
      </div>

      {/* Comes with */}
      <div className={adminStyles.formGroup}>
        <div className={styles.labelRow}>
          <span className={styles.label}>Comes with</span>
          {checklist.length > 0 && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setForm((f) => ({ ...f, comesWith: checklist }))}
            >
              Tick all
            </button>
          )}
        </div>
        {checklist.length > 0 ? (
          <ul className={styles.checklist}>
            {checklist.map((item) => (
              <li key={item}>
                <label className={styles.checkItem}>
                  <input type="checkbox" checked={isTicked(item)} onChange={() => toggleItem(item)} />
                  <span>{item}</span>
                  {(libraryModel?.extras.some((x) => sameName(x, item)) ||
                    rememberItems.some((x) => sameName(x, item))) && (
                    <span className={styles.modelTag}>{form.model.trim()} only</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Pick a type to see its checklist.</p>
        )}
        <div className={styles.addItemRow}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add another item, e.g. walking foot"
            aria-label="Add a comes-with item"
          />
          <button type="button" className="btn-secondary" onClick={addItem} disabled={!newItem.trim()}>
            Add
          </button>
        </div>
        {canRememberItems && (
          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={rememberNewItem}
              onChange={(e) => setRememberNewItem(e.target.checked)}
            />
            <span>
              Remember added items for every {form.brand.trim()} {form.model.trim()}
            </span>
          </label>
        )}
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="machine-notes">Notes</label>
        <textarea
          id="machine-notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          placeholder="Features, servicing done, quirks..."
        />
        <p className={styles.hint}>Condition, comes with and notes are included in the email to the recipient.</p>
      </div>

      <div className={adminStyles.formGroup}>
        <label htmlFor="machine-photos">Photos (optional, public)</label>
        <input
          id="machine-photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className={adminStyles.fileInput}
          disabled={uploading}
        />
        {uploading && <p className={adminStyles.uploading}>Uploading...</p>}
        {form.photos.length > 0 && (
          <ul className={styles.photoGrid}>
            {form.photos.map((url, i) => (
              <li key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} />
                <button
                  type="button"
                  className={styles.removePhoto}
                  onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== url) }))}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isHandedOver && (
        <div className={adminStyles.formGroup}>
          <span className={styles.label}>Status</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Status">
            {WORKSHOP_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={form.status === status}
                className={form.status === status ? styles.segmentActive : undefined}
                onClick={() => setForm((f) => ({ ...f, status }))}
              >
                {MACHINE_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      {canAssign && (
        <div className={adminStyles.formGroup}>
          <span className={styles.label}>Assign to</span>
          <AssignFields
            value={assign}
            onChange={setAssign}
            assignable={assignable}
            queueNumbers={queueNumbers}
            allowNone
          />
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={uploading || saving}>
        {saving ? "Saving..." : editing ? "Save Changes" : "Add Machine"}
      </button>
    </form>
  );
}

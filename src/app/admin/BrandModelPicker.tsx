"use client";

import { useState } from "react";
import EditModal from "@/components/ui/EditModal";
import { MachineBrand, sameName } from "@/lib/sewingMachines";
import { AdminApi, MachineLibrary, findBrand } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

interface BrandModelPickerProps {
  api: AdminApi;
  library: MachineLibrary;
  reloadLibrary: () => Promise<void>;
  brand: string;
  model: string;
  // Default type for new models, usually the type already picked on the machine
  typeId: string;
  onChange: (brand: string, model: string) => void;
  // A rename of the brand or model this machine already uses
  onRenamed: (brand: string, model: string, typeId?: string) => void;
}

/** "+ Add ..." box at the bottom of each list; stays open so several can be added in a row */
function AddSection({
  title,
  placeholder,
  existing,
  onAdd,
  children,
}: {
  title: string;
  placeholder: string;
  existing: string[];
  onAdd: (name: string) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const duplicate = name.trim() ? existing.find((e) => sameName(e, name)) : undefined;

  const add = async () => {
    if (!name.trim() || duplicate) return;
    setAdding(true);
    try {
      await onAdd(name.trim());
      setName("");
    } catch {
      // The picker shows the error; keep the typed name so it can be retried
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.addBrand}>
      <span className={styles.addBrandTitle}>{title}</span>
      <div className={styles.addItemRow}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // Inside the machine form, Enter would otherwise submit it
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={title}
          autoComplete="off"
        />
        {children}
        <button
          type="button"
          className="btn-primary"
          onClick={add}
          disabled={!name.trim() || !!duplicate || adding}
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {duplicate ? (
        <p className={styles.hint}>&ldquo;{duplicate}&rdquo; is already in the list.</p>
      ) : (
        <p className={styles.hint}>
          Add as many as you like, then tap one above to pick it. Use ✎ to fix a name (or a model&rsquo;s type);
          machines already logged under it are updated too.
        </p>
      )}
    </div>
  );
}

/** A brand or model tile with a pencil button that turns it into a rename box */
function Tile({
  name,
  meta,
  selected,
  onPick,
  onRename,
  types,
  typeId = "",
}: {
  name: string;
  meta: string;
  selected: boolean;
  onPick: () => void;
  onRename: (name: string, typeId: string) => Promise<void>;
  // Models also get a type choice in their edit box
  types?: MachineLibrary["types"];
  typeId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [draftType, setDraftType] = useState(typeId);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim() || (draft.trim() === name && draftType === typeId)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(draft.trim(), draftType);
      setEditing(false);
    } catch {
      // The picker shows the error; leave the box open to fix it
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={styles.tileEdit}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              // Cancel the rename without closing the picker
              e.stopPropagation();
              setEditing(false);
            }
          }}
          aria-label={`Rename ${name}`}
          autoFocus
        />
        {types && (
          <div className={styles.chips} role="radiogroup" aria-label={`Type of ${name}`}>
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={draftType === t.id}
                className={`${styles.chip} ${draftType === t.id ? styles.chipActive : ""}`}
                onClick={() => setDraftType(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className={styles.tileEditActions}>
          <button type="button" className="btn-primary" onClick={save} disabled={!draft.trim() || saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className={styles.textButton} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tile}>
      <button
        type="button"
        className={`${styles.brandOption} ${selected ? styles.brandOptionSelected : ""}`}
        aria-pressed={selected}
        onClick={onPick}
      >
        <span className={styles.brandName}>{name}</span>
        <span className={styles.brandMeta}>{meta}</span>
      </button>
      <button
        type="button"
        className={`${styles.tileRename} ${selected ? styles.tileRenameOnDark : ""}`}
        onClick={() => {
          setDraft(name);
          setDraftType(typeId);
          setEditing(true);
        }}
        aria-label={`Edit ${name}`}
        title="Edit"
      >
        ✎
      </button>
    </div>
  );
}

/** One button for brand + model. The modal lists brands, then the chosen brand's models. */
export default function BrandModelPicker({
  api,
  library,
  reloadLibrary,
  brand,
  model,
  typeId,
  onChange,
  onRenamed,
}: BrandModelPickerProps) {
  const [open, setOpen] = useState(false);
  // null shows the brand list, otherwise that brand's models
  const [brandId, setBrandId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [newModelType, setNewModelType] = useState(typeId);
  const [error, setError] = useState("");

  const current = brandId ? library.brands.find((b) => b.id === brandId) : undefined;
  const query = search.trim().toLowerCase();
  const brands = library.brands.filter((b) => !query || b.name.toLowerCase().includes(query));
  const typeName = (id: string) => library.types.find((t) => t.id === id)?.name;

  const openPicker = () => {
    // Pick up where the machine is: straight to its brand's models if it has one
    setBrandId(findBrand(library, brand)?.id ?? null);
    setSearch("");
    setAdded([]);
    setError("");
    setNewModelType(typeId || library.types[0]?.id || "");
    setOpen(true);
  };

  const showBrand = (b: MachineBrand) => {
    setBrandId(b.id);
    setSearch("");
    setError("");
  };

  const choose = (brandName: string, modelName: string) => {
    onChange(brandName, modelName);
    setOpen(false);
  };

  const withErrors = async (work: () => Promise<void>) => {
    setError("");
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the library");
      throw err;
    }
  };

  const addBrand = (name: string) =>
    withErrors(async () => {
      await api("/api/machine-library", { method: "POST", body: JSON.stringify({ kind: "brand", name }) });
      await reloadLibrary();
      setAdded((list) => [...list, name]);
      setSearch("");
    });

  const addModel = (name: string) =>
    withErrors(async () => {
      if (!current) return;
      await api(`/api/machine-library/brands/${current.id}`, {
        method: "PUT",
        body: JSON.stringify({ models: [...current.models, { name, typeId: newModelType, extras: [] }] }),
      });
      await reloadLibrary();
      setAdded((list) => [...list, `${current.id}/${name}`]);
    });

  // Renames also update logged machines, so keep this machine's form in step too
  const renameBrand = (b: MachineBrand, name: string) =>
    withErrors(async () => {
      await api(`/api/machine-library/brands/${b.id}`, { method: "PUT", body: JSON.stringify({ name }) });
      await reloadLibrary();
      if (sameName(b.name, brand)) onRenamed(name, model);
    });

  const renameModel = (b: MachineBrand, from: string, to: string, newTypeId: string) =>
    withErrors(async () => {
      await api(`/api/machine-library/brands/${b.id}`, {
        method: "PUT",
        body: JSON.stringify({ renameModel: { from, to, typeId: newTypeId } }),
      });
      await reloadLibrary();
      if (sameName(b.name, brand) && sameName(from, model)) onRenamed(brand, to, newTypeId);
    });

  const label = brand ? [brand, model].filter(Boolean).join(" · ") : "";

  return (
    <>
      <button
        type="button"
        id="machine-brand"
        className={`${styles.pickerButton} ${brand ? styles.pickerChosen : ""}`}
        onClick={openPicker}
      >
        <span>
          {label || "Select brand & model"}
          {brand && !model && <span className={styles.pickerNote}> (model not set)</span>}
        </span>
        <span className={styles.pickerAction}>{brand ? "Change" : "▾"}</span>
      </button>

      <EditModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={current ? `${current.name} models` : "Select brand"}
      >
        <div className={styles.brandPicker}>
          {error && <div className={adminStyles.error}>{error}</div>}

          {!current ? (
            <>
              {library.brands.length > 8 && (
                <input
                  type="search"
                  className={styles.pickerSearch}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search brands"
                  aria-label="Search brands"
                />
              )}

              {library.brands.length === 0 ? (
                <p className={styles.hint}>No brands yet. Add your first one below.</p>
              ) : brands.length === 0 ? (
                <p className={styles.hint}>No brands match &ldquo;{search}&rdquo;.</p>
              ) : (
                <ul className={styles.brandGrid}>
                  {brands.map((b) => (
                    <li key={b.id}>
                      <Tile
                        name={b.name}
                        meta={
                          added.some((a) => sameName(a, b.name))
                            ? "Just added"
                            : `${b.models.length} model${b.models.length === 1 ? "" : "s"} ›`
                        }
                        selected={sameName(b.name, brand)}
                        onPick={() => showBrand(b)}
                        onRename={(name) => renameBrand(b, name)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <AddSection
                title="+ Add brand"
                placeholder="e.g. Bernina"
                existing={library.brands.map((b) => b.name)}
                onAdd={addBrand}
              />
            </>
          ) : (
            <>
              <button type="button" className={styles.backButton} onClick={() => setBrandId(null)}>
                ‹ All brands
              </button>

              {current.models.length === 0 ? (
                <p className={styles.hint}>No {current.name} models yet. Add one below.</p>
              ) : (
                <ul className={styles.brandGrid}>
                  {current.models.map((m) => (
                    <li key={m.name}>
                      <Tile
                        name={m.name}
                        meta={
                          (added.includes(`${current.id}/${m.name}`) ? "Just added" : typeName(m.typeId) || "No type") +
                          (m.extras.length > 0 ? ` · +${m.extras.length} item${m.extras.length === 1 ? "" : "s"}` : "")
                        }
                        selected={sameName(current.name, brand) && sameName(m.name, model)}
                        onPick={() => choose(current.name, m.name)}
                        onRename={(name, newTypeId) => renameModel(current, m.name, name, newTypeId)}
                        types={library.types}
                        typeId={m.typeId}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" className={styles.textButton} onClick={() => choose(current.name, "")}>
                Use {current.name} without a model
              </button>

              <AddSection
                title={`+ Add ${current.name} model`}
                placeholder="e.g. 2200XT"
                existing={current.models.map((m) => m.name)}
                onAdd={addModel}
              >
                <select
                  value={newModelType}
                  onChange={(e) => setNewModelType(e.target.value)}
                  aria-label="Type of the new model"
                >
                  {library.types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </AddSection>
            </>
          )}
        </div>
      </EditModal>
    </>
  );
}

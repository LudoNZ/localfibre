"use client";

import { useState } from "react";
import { MachineBrand, MachineModel, dedupe } from "@/lib/sewingMachines";
import { AdminApi, MachineLibrary } from "./machineShared";
import adminStyles from "./Admin.module.css";
import styles from "./MachinesPanel.module.css";

interface LibraryEditorProps {
  api: AdminApi;
  library: MachineLibrary;
  reloadLibrary: () => Promise<void>;
}

/** Editable list of tags (comes-with items) with remove buttons and an add box */
function TagEditor({
  items,
  onChange,
  placeholder,
  label,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [value, setValue] = useState("");
  const add = () => {
    if (!value.trim()) return;
    onChange(dedupe([...items, value.trim()]));
    setValue("");
  };

  return (
    <div className={styles.tagEditor}>
      {items.length > 0 && (
        <ul className={styles.tags}>
          {items.map((item) => (
            <li key={item} className={styles.tag}>
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={`Remove ${item}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.addItemRow}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={label}
        />
        <button type="button" className="btn-secondary" onClick={add} disabled={!value.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

/** Text input that saves when it loses focus (or on Enter) */
function RenameInput({ value, onSave, label }: { value: string; onSave: (name: string) => void; label: string }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };
  return (
    <input
      type="text"
      className={styles.renameInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label={label}
    />
  );
}

/** Manage machine types, their comes-with lists, and the brand/model library */
export default function MachineLibraryEditor({ api, library, reloadLibrary }: LibraryEditorProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [openBrand, setOpenBrand] = useState<string | null>(null);

  const run = async (url: string, init: RequestInit) => {
    setBusy(true);
    setError("");
    try {
      await api(url, init);
      await reloadLibrary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the library");
    } finally {
      setBusy(false);
    }
  };

  const put = (url: string, body: object) => run(url, { method: "PUT", body: JSON.stringify(body) });

  const saveModels = (brand: MachineBrand, models: MachineModel[]) =>
    put(`/api/machine-library/brands/${brand.id}`, { models });

  const updateModel = (brand: MachineBrand, index: number, changes: Partial<MachineModel>) =>
    saveModels(
      brand,
      brand.models.map((m, i) => (i === index ? { ...m, ...changes } : m))
    );

  return (
    <div className={styles.library} aria-busy={busy}>
      {error && <div className={adminStyles.error}>{error}</div>}

      <section>
        <h3 className={styles.libraryHeading}>Machine types</h3>
        <p className={styles.hint}>Each type has its own comes-with checklist.</p>
        <ul className={styles.libraryList}>
          {library.types.map((type) => (
            <li key={type.id} className={styles.libraryItem}>
              <div className={styles.libraryItemHead}>
                <RenameInput
                  value={type.name}
                  label={`Rename ${type.name}`}
                  onSave={(name) => put(`/api/machine-library/types/${type.id}`, { name })}
                />
                <button
                  type="button"
                  className={adminStyles.deleteBtn}
                  onClick={() => {
                    if (confirm(`Remove the ${type.name} type?`)) {
                      run(`/api/machine-library/types/${type.id}`, { method: "DELETE" });
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              <TagEditor
                items={type.comesWith}
                onChange={(comesWith) => put(`/api/machine-library/types/${type.id}`, { comesWith })}
                placeholder="Add an item, e.g. bobbins"
                label={`Add a comes-with item for ${type.name}`}
              />
            </li>
          ))}
        </ul>
        <form
          className={styles.addItemRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newType.trim()) return;
            run("/api/machine-library", {
              method: "POST",
              body: JSON.stringify({ kind: "type", name: newType, comesWith: ["Power cord"] }),
            }).then(() => setNewType(""));
          }}
        >
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="New type, e.g. Coverstitch"
            aria-label="New machine type"
          />
          <button type="submit" className="btn-secondary" disabled={!newType.trim()}>
            Add type
          </button>
        </form>
      </section>

      <section>
        <h3 className={styles.libraryHeading}>Brands &amp; models</h3>
        <p className={styles.hint}>
          Brands can also be added from &ldquo;Select brand&rdquo; when adding a machine. New models are added here
          automatically when you save a machine. Model extras are added to
          that model&rsquo;s checklist on top of its type&rsquo;s list.
        </p>
        {library.brands.length === 0 && <p className={adminStyles.empty}>No brands yet.</p>}
        <ul className={styles.libraryList}>
          {library.brands.map((brand) => (
            <li key={brand.id} className={styles.libraryItem}>
              <div className={styles.libraryItemHead}>
                <RenameInput
                  value={brand.name}
                  label={`Rename ${brand.name}`}
                  onSave={(name) => put(`/api/machine-library/brands/${brand.id}`, { name })}
                />
                <button
                  type="button"
                  className={styles.textButton}
                  aria-expanded={openBrand === brand.id}
                  onClick={() => setOpenBrand(openBrand === brand.id ? null : brand.id)}
                >
                  {brand.models.length} model{brand.models.length === 1 ? "" : "s"}
                </button>
                <button
                  type="button"
                  className={adminStyles.deleteBtn}
                  onClick={() => {
                    if (confirm(`Remove ${brand.name} and its models from the library? Logged machines keep their details.`)) {
                      run(`/api/machine-library/brands/${brand.id}`, { method: "DELETE" });
                    }
                  }}
                >
                  Remove
                </button>
              </div>

              {openBrand === brand.id && (
                <div className={styles.models}>
                  {brand.models.map((model, index) => (
                    <div key={model.name} className={styles.modelRow}>
                      <div className={styles.libraryItemHead}>
                        <RenameInput
                          value={model.name}
                          label={`Rename ${model.name}`}
                          onSave={(name) =>
                            put(`/api/machine-library/brands/${brand.id}`, {
                              renameModel: { from: model.name, to: name },
                            })
                          }
                        />
                        <select
                          value={model.typeId}
                          onChange={(e) =>
                            put(`/api/machine-library/brands/${brand.id}`, {
                              renameModel: { from: model.name, to: model.name, typeId: e.target.value },
                            })
                          }
                          aria-label={`Type of ${model.name}`}
                        >
                          <option value="">No type</option>
                          {library.types.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={adminStyles.deleteBtn}
                          onClick={() => {
                            if (confirm(`Remove ${brand.name} ${model.name} from the library?`)) {
                              saveModels(brand, brand.models.filter((_, i) => i !== index));
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <TagEditor
                        items={model.extras}
                        onChange={(extras) => updateModel(brand, index, { extras })}
                        placeholder="Extra item for this model"
                        label={`Add an extra item for ${model.name}`}
                      />
                    </div>
                  ))}
                  <NewModelRow
                    library={library}
                    onAdd={(model) => saveModels(brand, [...brand.models, model])}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <form
          className={styles.addItemRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newBrand.trim()) return;
            run("/api/machine-library", {
              method: "POST",
              body: JSON.stringify({ kind: "brand", name: newBrand }),
            }).then(() => setNewBrand(""));
          }}
        >
          <input
            type="text"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="New brand, e.g. Bernina"
            aria-label="New brand"
          />
          <button type="submit" className="btn-secondary" disabled={!newBrand.trim()}>
            Add brand
          </button>
        </form>
      </section>
    </div>
  );
}

function NewModelRow({ library, onAdd }: { library: MachineLibrary; onAdd: (model: MachineModel) => void }) {
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState(library.types[0]?.id || "");
  return (
    <div className={styles.addItemRow}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New model"
        aria-label="New model name"
      />
      <select value={typeId} onChange={(e) => setTypeId(e.target.value)} aria-label="New model type">
        {library.types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary"
        disabled={!name.trim()}
        onClick={() => {
          onAdd({ name: name.trim(), typeId, extras: [] });
          setName("");
        }}
      >
        Add model
      </button>
    </div>
  );
}

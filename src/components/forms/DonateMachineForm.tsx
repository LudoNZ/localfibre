"use client";

import { useEffect, useRef, useState } from "react";
import { optimiseImage } from "@/lib/imageUpload";
import {
  DONATION_KINDS,
  HANDOVER_OPTIONS,
  MAX_DONATION_MACHINES,
  MAX_DONATION_PHOTOS,
  WORKING_OPTIONS,
} from "@/lib/donations";
import styles from "./SewingMachineForm.module.css";
import donateStyles from "./DonateMachineForm.module.css";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  suburb: "",
  count: 1,
  kinds: ["Sewing machine"] as string[],
  details: "",
  working: "unsure",
  handover: "unsure",
  notes: "",
  website: "",
};

interface Photo {
  id: string;
  blob: Blob;
  name: string;
  preview: string;
}

/** Shrink phone photos so several fit in one upload; keep the original if it can't be read */
async function prepare(file: File): Promise<Photo> {
  let blob: Blob = file;
  let name = file.name;
  try {
    const { variants } = await optimiseImage(file, { widths: [1280] });
    const variant = variants[variants.length - 1];
    blob = variant.blob;
    name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${variant.ext}`;
  } catch {
    // e.g. HEIC on a desktop browser: the server still accepts it
  }
  return { id: Math.random().toString(36).slice(2), blob, name, preview: URL.createObjectURL(blob) };
}

export default function DonateMachineForm() {
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  // Free the photo previews when leaving the page (not on every change, or they'd go blank)
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleKind = (kind: string) =>
    set("kinds", form.kinds.includes(kind) ? form.kinds.filter((k) => k !== kind) : [...form.kinds, kind]);

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_DONATION_PHOTOS - photos.length);
    e.target.value = "";
    if (!files.length) return;
    setPreparing(true);
    setError("");
    try {
      const prepared = await Promise.all(files.map(prepare));
      setPhotos((list) => [...list, ...prepared].slice(0, MAX_DONATION_PHOTOS));
    } finally {
      setPreparing(false);
    }
  };

  const removePhoto = (id: string) =>
    setPhotos((list) => {
      const photo = list.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return list.filter((p) => p.id !== id);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (photos.length === 0) {
      setError("Please add at least one photo of the machine.");
      return;
    }
    setStatus("loading");
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key === "kinds") form.kinds.forEach((k) => body.append("kinds", k));
        else body.append(key, String(value));
      }
      photos.forEach((p) => body.append("photos", p.blob, p.name));

      const response = await fetch("/api/machine-donations", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");

      setStatus("success");
      setForm(emptyForm);
      setPhotos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={styles.confirmation} role="status">
        <h3>Thank you!</h3>
        <p>We&apos;ve got your details and photos. We&apos;ll be in touch about getting the machine to us.</p>
      </div>
    );
  }

  const disabled = status === "loading";

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Hidden from people; bots fill it in */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
        className={donateStyles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className={styles.formGroup}>
        <span className={styles.label}>Photos of the machine *</span>
        <p className={styles.hint}>
          A photo helps us know what&apos;s coming. Add one of each machine if you&apos;re giving more than one (up to{" "}
          {MAX_DONATION_PHOTOS}).
        </p>
        {photos.length > 0 && (
          <ul className={donateStyles.photos}>
            {photos.map((photo, i) => (
              <li key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt={`Photo ${i + 1}`} />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove photo ${i + 1}`}
                  disabled={disabled}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_DONATION_PHOTOS && (
          <label className={donateStyles.addPhoto}>
            <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={disabled || preparing} />
            {preparing ? "Adding…" : photos.length ? "+ Add another photo" : "📷 Add a photo"}
          </label>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="count" className={styles.label}>
          How many machines? *
        </label>
        <div className={donateStyles.stepper}>
          <button
            type="button"
            onClick={() => set("count", Math.max(1, form.count - 1))}
            disabled={disabled || form.count <= 1}
            aria-label="One fewer"
          >
            −
          </button>
          <input
            id="count"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DONATION_MACHINES}
            value={form.count}
            onChange={(e) =>
              set("count", Math.min(MAX_DONATION_MACHINES, Math.max(1, Math.round(Number(e.target.value) || 1))))
            }
            className={styles.input}
            disabled={disabled}
            required
          />
          <button
            type="button"
            onClick={() => set("count", Math.min(MAX_DONATION_MACHINES, form.count + 1))}
            disabled={disabled || form.count >= MAX_DONATION_MACHINES}
            aria-label="One more"
          >
            +
          </button>
        </div>
      </div>

      <fieldset className={styles.fieldset} disabled={disabled}>
        <legend className={styles.label}>What kind?</legend>
        <div className={styles.radioGroup}>
          {DONATION_KINDS.map((kind) => (
            <label key={kind} className={styles.radioOption}>
              <input type="checkbox" checked={form.kinds.includes(kind)} onChange={() => toggleKind(kind)} />
              {kind}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.formGroup}>
        <label htmlFor="details" className={styles.label}>
          Brand and model, if you know
        </label>
        <input
          id="details"
          type="text"
          value={form.details}
          onChange={(e) => set("details", e.target.value)}
          placeholder={form.count > 1 ? "e.g. a Janome and an old Singer" : "e.g. Janome 2200XT"}
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <fieldset className={styles.fieldset} disabled={disabled}>
        <legend className={styles.label}>Does it work?</legend>
        <div className={styles.radioGroup}>
          {Object.entries(WORKING_OPTIONS).map(([value, label]) => (
            <label key={value} className={styles.radioOption}>
              <input
                type="radio"
                name="working"
                value={value}
                checked={form.working === value}
                onChange={() => set("working", value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset} disabled={disabled}>
        <legend className={styles.label}>Getting it to us</legend>
        <div className={styles.radioGroup}>
          {Object.entries(HANDOVER_OPTIONS).map(([value, label]) => (
            <label key={value} className={styles.radioOption}>
              <input
                type="radio"
                name="handover"
                value={value}
                checked={form.handover === value}
                onChange={() => set("handover", value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          Your name *
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          pattern=".*\S.*"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email *
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone" className={styles.label}>
          Contact number
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="suburb" className={styles.label}>
          Suburb *
        </label>
        <input
          id="suburb"
          type="text"
          autoComplete="address-level2"
          pattern=".*\S.*"
          value={form.suburb}
          onChange={(e) => set("suburb", e.target.value)}
          placeholder="e.g. Titirangi"
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes" className={styles.label}>
          Anything else?
        </label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Accessories, manuals, when suits you..."
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <button type="submit" className={`btn-primary ${styles.button}`} disabled={disabled || preparing}>
        {disabled ? "Sending..." : form.count > 1 ? `Offer ${form.count} machines` : "Offer my machine"}
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

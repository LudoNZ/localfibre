"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EditModal from "./EditModal";
import { deleteStoredFiles, uploadImage, UploadOptions } from "@/lib/imageUpload";
import type { SitePhoto } from "@/lib/sitePhotoSlots";
import styles from "./ImageEditButton.module.css";

interface ImageEditButtonProps {
  /** Admin API for this image, e.g. /api/site-photos/hero1 */
  endpoint: string;
  /** Firebase Storage folder for the uploaded files */
  folder: string;
  /** Shown in the dialog title and button label */
  title: string;
  current: SitePhoto | null;
  options: UploadOptions;
  noun?: "photo" | "logo";
  accept?: string;
  /** Ask for a description (alt text) */
  showAlt?: boolean;
  hint?: string;
  className?: string;
}

/** Admin-only button that opens an upload dialog for one image on the page */
export default function ImageEditButton({
  endpoint,
  folder,
  title,
  current,
  options,
  noun = "photo",
  accept = "image/*",
  showAlt = false,
  hint,
  className = "",
}: ImageEditButtonProps) {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState(current?.alt ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const busy = status !== "";
  // Only images uploaded here (not defaults from the code) can be edited or removed
  const isUploaded = !!current?.paths?.length;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!isAdmin) return null;

  const openModal = () => {
    setFile(null);
    setPreview(null);
    setAlt(current?.alt ?? "");
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    if (!busy) setOpen(false);
  };

  const api = async (method: "PUT" | "DELETE", body?: object) => {
    const token = await user?.getIdToken();
    const res = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Request failed");
    return data as { previousPaths: string[] };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      let payload: SitePhoto;
      if (file) {
        payload = { ...(await uploadImage(file, folder, options, setStatus)), alt };
      } else if (isUploaded && current) {
        payload = { ...current, alt }; // only the description changed
      } else {
        throw new Error(`Choose a ${noun} to upload`);
      }

      setStatus("Saving…");
      const { previousPaths } = await api("PUT", payload);
      await deleteStoredFiles(previousPaths, payload.paths);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setStatus("");
    }
  };

  const handleRemove = async () => {
    setError("");
    setStatus("Removing…");
    try {
      const { previousPaths } = await api("DELETE");
      await deleteStoredFiles(previousPaths);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to remove ${noun}`);
    } finally {
      setStatus("");
    }
  };

  const currentSrc = preview ?? current?.src ?? null;
  const altChanged = alt !== (current?.alt ?? "");

  return (
    <>
      <button
        type="button"
        className={`${styles.editButton} ${className}`}
        onClick={openModal}
        aria-label={`${current ? "Change" : "Add"} ${noun}: ${title}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
        <span>{current ? "Edit" : `Add ${noun}`}</span>
      </button>

      {open &&
        createPortal(
          <EditModal isOpen onClose={closeModal} title={`${noun === "logo" ? "Logo" : "Photo"}: ${title}`}>
            <form onSubmit={handleSave} className={styles.form}>
              <div className={`${styles.preview} ${noun === "logo" ? styles.logoPreview : ""}`}>
                {currentSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentSrc} alt="" />
                ) : (
                  <span>No {noun} yet</span>
                )}
              </div>

              <label className={styles.field}>
                <span>{current ? `Replace with a new ${noun}` : `Choose a ${noun}`}</span>
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                />
              </label>

              {showAlt && (
                <label className={styles.field}>
                  <span>Description (for screen readers and search engines)</span>
                  <input
                    type="text"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="e.g. Two people sewing at a Local Fibre session"
                    maxLength={300}
                    disabled={busy}
                  />
                </label>
              )}

              {hint && <p className={styles.hint}>{hint}</p>}
              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || (!file && !(isUploaded && altChanged))}
                >
                  {status || `Save ${noun}`}
                </button>
                {isUploaded && (
                  <button type="button" className={styles.remove} onClick={handleRemove} disabled={busy}>
                    Remove {noun}
                  </button>
                )}
              </div>
            </form>
          </EditModal>,
          document.body
        )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import EditModal from "./EditModal";
import { PHOTO_SLOTS, PHOTO_WIDTHS, PhotoSlot, SitePhoto } from "@/lib/sitePhotoSlots";
import styles from "./PhotoEditButton.module.css";

interface PhotoEditButtonProps {
  slot: PhotoSlot;
  photo: SitePhoto | null;
}

interface Variant {
  width: number;
  blob: Blob;
  ext: string;
}

const loadBitmap = (file: File) => createImageBitmap(file, { imageOrientation: "from-image" });

/** Resize to each responsive width (never upscaling) as WebP, or JPEG where WebP isn't supported */
async function makeVariants(bitmap: ImageBitmap): Promise<Variant[]> {
  const widths = PHOTO_WIDTHS.filter((w) => w < bitmap.width);
  widths.push(Math.min(bitmap.width, PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1]));
  const unique = [...new Set(widths)].sort((a, b) => a - b);

  const variants: Variant[] = [];
  for (const width of unique) {
    const height = Math.round((bitmap.height * width) / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const toBlob = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = await toBlob("image/webp", 0.82);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob("image/jpeg", 0.85);
      ext = "jpg";
    }
    if (!blob) throw new Error("Could not process this image");
    variants.push({ width, blob, ext });
  }
  return variants;
}

export default function PhotoEditButton({ slot, photo }: PhotoEditButtonProps) {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState(photo?.alt ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const busy = status !== "";
  const isUploaded = !!photo?.srcSet;

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
    setAlt(photo?.alt ?? "");
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    if (!busy) setOpen(false);
  };

  const api = async (method: "PUT" | "DELETE", body?: object) => {
    const token = await user?.getIdToken();
    const res = await fetch(`/api/site-photos/${slot}`, {
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

  // Old sizes are no longer referenced once the new photo is saved
  const cleanUp = async (previousPaths: string[], keep: string[] = []) => {
    await Promise.allSettled(
      previousPaths.filter((p) => !keep.includes(p)).map((p) => deleteObject(ref(storage, p)))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      let payload: SitePhoto;

      if (file) {
        setStatus("Optimising photo…");
        const bitmap = await loadBitmap(file);
        const variants = await makeVariants(bitmap);
        const { width, height } = bitmap;
        bitmap.close();

        const stamp = Date.now();
        const uploaded: { width: number; url: string; path: string }[] = [];
        for (const [i, v] of variants.entries()) {
          setStatus(`Uploading size ${i + 1} of ${variants.length}…`);
          const path = `sitePhotos/${slot}/${stamp}-${v.width}.${v.ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, v.blob, {
            contentType: v.blob.type,
            cacheControl: "public, max-age=31536000, immutable",
          });
          uploaded.push({ width: v.width, url: await getDownloadURL(storageRef), path });
        }

        // Default src: the size closest to 1200px for browsers that ignore srcset
        const fallback = uploaded.reduce((best, u) =>
          Math.abs(u.width - 1200) < Math.abs(best.width - 1200) ? u : best
        );
        payload = {
          src: fallback.url,
          srcSet: uploaded.map((u) => `${u.url} ${u.width}w`).join(", "),
          width,
          height,
          alt,
          paths: uploaded.map((u) => u.path),
        };
      } else if (isUploaded && photo) {
        // Only the description changed
        payload = { ...photo, alt };
      } else {
        throw new Error("Choose a photo to upload");
      }

      setStatus("Saving…");
      const { previousPaths } = await api("PUT", payload);
      await cleanUp(previousPaths, payload.paths);
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
      await cleanUp(previousPaths);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setStatus("");
    }
  };

  const currentSrc = preview ?? photo?.src ?? null;

  return (
    <>
      <button
        type="button"
        className={styles.editButton}
        onClick={openModal}
        aria-label={`${photo ? "Change" : "Add"} photo: ${PHOTO_SLOTS[slot]}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
        <span>{photo ? "Edit" : "Add photo"}</span>
      </button>

      {open &&
        createPortal(
          <EditModal isOpen onClose={closeModal} title={`Photo: ${PHOTO_SLOTS[slot]}`}>
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.preview}>
                {currentSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentSrc} alt="" />
                ) : (
                  <span>No photo yet</span>
                )}
              </div>

              <label className={styles.field}>
                <span>{photo ? "Replace with a new photo" : "Choose a photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                />
              </label>

              <label className={styles.field}>
                <span>Description (for screen readers and search engines)</span>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="e.g. Two people sewing at a Titirangi workshop"
                  maxLength={300}
                  disabled={busy}
                />
              </label>

              <p className={styles.hint}>
                Large photos are fine: they&apos;re resized automatically so phones load a small
                version and big screens get a sharp one.
              </p>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || (!file && !(isUploaded && alt !== (photo?.alt ?? "")))}
                >
                  {status || "Save photo"}
                </button>
                {isUploaded && (
                  <button type="button" className={styles.remove} onClick={handleRemove} disabled={busy}>
                    Remove photo
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

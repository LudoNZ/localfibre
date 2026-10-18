import styles from "./PhotoFrame.module.css";
import ImageEditButton from "./ImageEditButton";
import { PHOTO_SLOTS, PHOTO_WIDTHS, type PhotoSlot, type SitePhoto } from "@/lib/sitePhotoSlots";

interface PhotoFrameProps {
  /** When missing, a fabric-texture placeholder is shown */
  photo?: SitePhoto | null;
  /** Fallback description when the photo has none of its own */
  alt: string;
  /** Makes the photo editable in place by admins */
  slot?: PhotoSlot;
  caption?: string;
  tilt?: "left" | "right" | "none";
  aspect?: "square" | "portrait" | "landscape";
  priority?: boolean;
  /** How wide the photo renders at each screen size, so browsers fetch the right file */
  sizes?: string;
  className?: string;
}

/** Photo in a retro frame: thick outline, offset shadow and a slight tilt */
export default function PhotoFrame({
  photo,
  alt,
  slot,
  caption,
  tilt = "none",
  aspect = "landscape",
  priority = false,
  sizes = "(max-width: 900px) 100vw, 50vw",
  className = "",
}: PhotoFrameProps) {
  return (
    <figure className={`${styles.frame} ${styles[tilt]} ${className}`}>
      <div className={`${styles.media} ${styles[aspect]}`}>
        {photo ? (
          // Plain <img>: uploaded photos carry their own responsive srcset
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={photo.srcSet ? sizes : undefined}
            width={photo.width}
            height={photo.height}
            alt={photo.alt || alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            <svg viewBox="0 0 64 64" className={styles.placeholderIcon}>
              {/* Needle and thread */}
              <path d="M44 8 L20 52" />
              <ellipse cx="42" cy="12" rx="2" ry="4" transform="rotate(28 42 12)" />
              <path d="M42 12 C 60 22, 8 30, 26 42 S 50 54, 40 60" />
            </svg>
          </div>
        )}
        {slot && (
          <ImageEditButton
            endpoint={`/api/site-photos/${slot}`}
            folder={`sitePhotos/${slot}`}
            title={PHOTO_SLOTS[slot]}
            current={photo ?? null}
            options={{ widths: PHOTO_WIDTHS }}
            showAlt
            hint="Large photos are fine: they're resized automatically so phones load a small version and big screens get a sharp one."
            className={styles.editButton}
          />
        )}
      </div>
      {photo && caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

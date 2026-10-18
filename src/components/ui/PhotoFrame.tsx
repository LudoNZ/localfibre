import Image from "next/image";
import styles from "./PhotoFrame.module.css";

interface PhotoFrameProps {
  /** Path under /public. When missing, a fabric-texture placeholder is shown */
  src?: string | null;
  alt: string;
  caption?: string;
  tilt?: "left" | "right" | "none";
  aspect?: "square" | "portrait" | "landscape";
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/** Photo in a retro frame: thick outline, offset shadow and a slight tilt */
export default function PhotoFrame({
  src,
  alt,
  caption,
  tilt = "none",
  aspect = "landscape",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className = "",
}: PhotoFrameProps) {
  return (
    <figure className={`${styles.frame} ${styles[tilt]} ${className}`}>
      <div className={`${styles.media} ${styles[aspect]}`}>
        {src ? (
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={styles.image} />
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
      </div>
      {src && caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

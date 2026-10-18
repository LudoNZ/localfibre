import { partners as defaultPartners, orgSlug, Partner } from "@/data/partners";
import { getStoredImages } from "@/lib/storedImages";
import type { SitePhoto } from "@/lib/sitePhotoSlots";
import ImageEditButton from "./ImageEditButton";
import styles from "./PartnersList.module.css";

const LOGO_WIDTHS = [160, 320, 480];

/** Organisations as logo or name badges (partners by default). Admins can upload logos. */
export default async function PartnersList({ partners = defaultPartners }: { partners?: Partner[] }) {
  if (partners.length === 0) return null;

  const uploadedLogos = await getStoredImages("partnerLogos");

  return (
    <ul className={styles.list}>
      {partners.map((partner) => {
        const slug = orgSlug(partner.name);
        const logo: SitePhoto | null = uploadedLogos[slug] ?? (partner.logo ? { src: partner.logo } : null);

        const content = (
          <>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.src}
                srcSet={logo.srcSet}
                sizes={logo.srcSet ? "160px" : undefined}
                width={logo.width}
                height={logo.height}
                alt={partner.name}
                loading="lazy"
                decoding="async"
                className={styles.logo}
              />
            ) : (
              <span className={styles.name}>{partner.name}</span>
            )}
            {partner.role && <span className={styles.role}>{partner.role}</span>}
          </>
        );

        return (
          <li key={partner.name} className={styles.item}>
            {partner.url ? (
              <a href={partner.url} target="_blank" rel="noopener noreferrer" className={styles.inner}>
                {content}
              </a>
            ) : (
              <div className={styles.inner}>{content}</div>
            )}
            <ImageEditButton
              endpoint={`/api/partner-logos/${slug}`}
              folder={`partnerLogos/${slug}`}
              title={partner.name}
              current={uploadedLogos[slug] ?? null}
              options={{ widths: LOGO_WIDTHS, keepAlpha: true }}
              noun="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hint="PNG with a transparent background or SVG works best. Logos are resized automatically and stay sharp on every screen."
              className={styles.editButton}
            />
          </li>
        );
      })}
    </ul>
  );
}

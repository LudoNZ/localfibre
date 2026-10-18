import Image from "next/image";
import { partners as defaultPartners, Partner } from "@/data/partners";
import styles from "./PartnersList.module.css";

/** Organisations as logo or name badges (partners by default) */
export default function PartnersList({ partners = defaultPartners }: { partners?: Partner[] }) {
  if (partners.length === 0) return null;

  return (
    <ul className={styles.list}>
      {partners.map((partner) => {
        const content = (
          <>
            {partner.logo ? (
              <Image
                src={partner.logo}
                alt={partner.name}
                width={160}
                height={64}
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
          </li>
        );
      })}
    </ul>
  );
}

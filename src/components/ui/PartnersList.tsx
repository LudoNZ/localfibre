import Image from "next/image";
import { partners } from "@/data/partners";
import styles from "./PartnersList.module.css";

/** Partners, venues and supporters as logo or name badges */
export default function PartnersList() {
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
            <span className={styles.role}>{partner.role}</span>
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

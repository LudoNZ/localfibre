import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";
import FooterInstall from "./FooterInstall";
import { site } from "@/data/site";

const exploreLinks = [
  { label: "About", href: "/about" },
  { label: "Repair Programme", href: "/repair-programme" },
  { label: "Apply for a machine", href: "/sewing-machines" },
  { label: "Events", href: "/#events" },
  { label: "Free resources", href: "/#resources" },
];

const connectLinks = [
  { label: "Newsletter", href: "/#newsletter" },
  { label: "Contact us", href: "/#contact" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logoBadge} aria-label="Local Fibre home">
              <Image
                src="/images/LFLogo-Horizontal.png"
                alt="Local Fibre"
                width={180}
                height={66}
                style={{ height: "auto", width: "100%", maxWidth: "170px" }}
              />
            </Link>
            <p className={styles.tagline}>{site.tagline}</p>
            <a href={`mailto:${site.email}`} className={styles.email}>
              {site.email}
            </a>
            <FooterInstall />
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>Explore</h2>
            <ul className={styles.links}>
              {exploreLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>Connect</h2>
            <ul className={styles.links}>
              {connectLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
              <li>
                <a href={site.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram {site.instagramHandle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>{site.orgStatus}</p>
          <p>&copy; {new Date().getFullYear()} Local Fibre</p>
        </div>
      </div>
    </footer>
  );
}

import styles from "./page.module.css";
import { patterns } from "@/data/patterns";
import PatternCard from "@/components/ui/PatternCard";

export const metadata = {
  title: "Free Patterns | Local Fibre",
  description: "Resource-sharing for a creative, low-waste Aotearoa. Download free sewing patterns.",
};

export default function PatternsPage() {
  return (
    <div className={styles.patternsPage}>
      <section className={styles.hero}>
        <div className="container">
          <h1>Free Patterns</h1>
          <p className={styles.tagline}>
            Resource-sharing for a creative, low-waste Aotearoa.
          </p>
        </div>
      </section>

      <section className={styles.patternsSection}>
        <div className="container">
          <div className={styles.patternsGrid}>
            {patterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.kohaSection}>
        <div className="container">
          <p className={styles.kohaText}>
            All patterns are free to download. If you&apos;d like to support our work, koha (donation)
            options will be available soon.
          </p>
        </div>
      </section>
    </div>
  );
}


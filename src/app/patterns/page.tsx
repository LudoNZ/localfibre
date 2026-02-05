import styles from "./page.module.css";
import { getPatterns } from "@/lib/patterns";
import PatternCard from "@/components/ui/PatternCard";

export const metadata = {
  title: "Free Patterns | Local Fibre",
  description: "Resource-sharing for a creative, low-waste Aotearoa. Download free sewing patterns.",
};

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const patterns = await getPatterns();

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
          {patterns.length > 0 ? (
            <div className={styles.patternsGrid}>
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          ) : (
            <p className={styles.noPatterns}>
              Patterns coming soon! Check back later.
            </p>
          )}
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

import Image from "next/image";
import styles from "./PatternCard.module.css";
import { Pattern } from "@/data/patterns";

interface PatternCardProps {
  pattern: Pattern;
}

export default function PatternCard({ pattern }: PatternCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={pattern.image}
          alt={pattern.title}
          width={300}
          height={300}
          className={styles.image}
        />
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{pattern.title}</h3>
        <p className={styles.description}>{pattern.description}</p>
        <a
          href={pattern.pdfUrl}
          download
          className="btn-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download PDF
        </a>
      </div>
    </article>
  );
}


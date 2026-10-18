import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "center" | "left";
  /** "dark" for headings sitting on rust/olive/ink backgrounds */
  tone?: "light" | "dark";
  as?: "h1" | "h2";
  id?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  tone = "light",
  as: Tag = "h2",
  id,
}: SectionHeadingProps) {
  return (
    <div className={`${styles.heading} ${styles[align]} ${styles[tone]}`}>
      {eyebrow && <span className={`eyebrow ${styles.eyebrow}`}>{eyebrow}</span>}
      <Tag id={id} className={styles.title}>
        {title}
      </Tag>
      {intro && <p className={styles.intro}>{intro}</p>}
    </div>
  );
}

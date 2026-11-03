import type { SiteText, TextKey } from "@/lib/siteTextSlots";
import EditableText from "@/components/text/EditableText";
import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
  eyebrow?: string;
  title?: string;
  intro?: string;
  /**
   * Page text admins can edit in place, e.g. { text, eyebrow: "home.events.eyebrow", ... }.
   * Parts given a key here take their wording from `text` instead of the props above.
   */
  editable?: { text: SiteText; eyebrow?: TextKey; title?: TextKey; intro?: TextKey };
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
  editable,
  align = "center",
  tone = "light",
  as: Tag = "h2",
  id,
}: SectionHeadingProps) {
  return (
    <div className={`${styles.heading} ${styles[align]} ${styles[tone]}`}>
      {editable?.eyebrow ? (
        <EditableText
          id={editable.eyebrow}
          text={editable.text[editable.eyebrow]}
          className={`eyebrow ${styles.eyebrow}`}
        />
      ) : (
        eyebrow && <span className={`eyebrow ${styles.eyebrow}`}>{eyebrow}</span>
      )}
      {editable?.title ? (
        <Tag id={id} className={styles.title}>
          <EditableText id={editable.title} text={editable.text[editable.title]} />
        </Tag>
      ) : (
        <Tag id={id} className={styles.title}>
          {title}
        </Tag>
      )}
      {editable?.intro ? (
        <EditableText id={editable.intro} text={editable.text[editable.intro]} as="p" className={styles.intro} />
      ) : (
        intro && <p className={styles.intro}>{intro}</p>
      )}
    </div>
  );
}

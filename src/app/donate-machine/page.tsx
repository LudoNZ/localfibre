import type { Metadata } from "next"
import Link from "next/link"
import styles from "../sewing-machines/page.module.css"
import WaveDivider from "@/components/ui/WaveDivider"
import EditableText from "@/components/text/EditableText"
import { getSiteText } from "@/lib/siteText"
import DonateMachineForm from "@/components/forms/DonateMachineForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Donate a Sewing Machine | Local Fibre",
  description:
    "Have a sewing machine or overlocker you no longer use? Donate it to Local Fibre in West Auckland and we'll service it and rehome it.",
}

export default async function DonateMachinePage() {
  const t = await getSiteText()

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <EditableText id="donate.hero.eyebrow" text={t["donate.hero.eyebrow"]} className="eyebrow" />
          <EditableText id="donate.hero.title" text={t["donate.hero.title"]} as="h1" />
          <EditableText
            id="donate.hero.tagline"
            text={t["donate.hero.tagline"]}
            as="p"
            className={styles.tagline}
          />
          <Link href="/repair-programme" className={styles.programmeLink}>
            How the programme works →
          </Link>
        </div>
      </section>

      <section className={styles.infoSection}>
        <div className="container">
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <EditableText id="donate.info1.title" text={t["donate.info1.title"]} as="h3" />
              <EditableText id="donate.info1.text" text={t["donate.info1.text"]} as="p" />
            </div>
            <div className={styles.infoCard}>
              <EditableText id="donate.info2.title" text={t["donate.info2.title"]} as="h3" />
              <EditableText id="donate.info2.text" text={t["donate.info2.text"]} as="p" />
            </div>
            <div className={styles.infoCard}>
              <EditableText id="donate.info3.title" text={t["donate.info3.title"]} as="h3" />
              <EditableText id="donate.info3.text" text={t["donate.info3.text"]} as="p" />
            </div>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" />

      <section className={styles.formSection}>
        <div className="container">
          <div className={styles.formWrapper}>
            <EditableText id="donate.form.title" text={t["donate.form.title"]} as="h2" />
            <DonateMachineForm />
          </div>
        </div>
      </section>
    </div>
  )
}

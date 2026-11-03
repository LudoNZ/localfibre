import type { Metadata } from "next"
import Link from "next/link"
import styles from "./page.module.css"
import WaveDivider from "@/components/ui/WaveDivider"
import EditableText from "@/components/text/EditableText"
import { getSiteText } from "@/lib/siteText"
import SewingMachineForm from "@/components/forms/SewingMachineForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Apply for a Sewing Machine | Local Fibre",
  description:
    "Apply for a sewing machine from Local Fibre. Open to individuals and community groups, with pickup in West Auckland.",
}

export default async function SewingMachinesPage() {
  const t = await getSiteText()

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <EditableText id="apply.hero.eyebrow" text={t["apply.hero.eyebrow"]} className="eyebrow" />
          <EditableText id="apply.hero.title" text={t["apply.hero.title"]} as="h1" />
          <EditableText
            id="apply.hero.tagline"
            text={t["apply.hero.tagline"]}
            as="p"
            className={styles.tagline}
          />
          <Link href="/repair-programme" className={styles.programmeLink}>
            How the programme works →
          </Link>
          <p className={styles.donateLink}>
            Have a machine to give? <Link href="/donate-machine">Donate a machine</Link>
          </p>
        </div>
      </section>

      <section className={styles.infoSection}>
        <div className="container">
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <EditableText id="apply.info1.title" text={t["apply.info1.title"]} as="h3" />
              <EditableText id="apply.info1.text" text={t["apply.info1.text"]} as="p" />
            </div>
            <div className={styles.infoCard}>
              <EditableText id="apply.info2.title" text={t["apply.info2.title"]} as="h3" />
              <EditableText id="apply.info2.text" text={t["apply.info2.text"]} as="p" />
            </div>
            <div className={styles.infoCard}>
              <EditableText id="apply.info3.title" text={t["apply.info3.title"]} as="h3" />
              <EditableText id="apply.info3.text" text={t["apply.info3.text"]} as="p" />
            </div>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" />

      <section className={styles.formSection}>
        <div className="container">
          <div className={styles.formWrapper}>
            <EditableText id="apply.form.title" text={t["apply.form.title"]} as="h2" />
            <SewingMachineForm />
          </div>
        </div>
      </section>
    </div>
  )
}

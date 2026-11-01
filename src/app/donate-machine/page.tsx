import type { Metadata } from "next"
import Link from "next/link"
import styles from "../sewing-machines/page.module.css"
import WaveDivider from "@/components/ui/WaveDivider"
import DonateMachineForm from "@/components/forms/DonateMachineForm"

export const metadata: Metadata = {
  title: "Donate a Sewing Machine | Local Fibre",
  description:
    "Have a sewing machine or overlocker you no longer use? Donate it to Local Fibre in West Auckland and we'll service it and rehome it.",
}

export default function DonateMachinePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <span className="eyebrow">Repair Programme</span>
          <h1>Donate a sewing machine</h1>
          <p className={styles.tagline}>
            Got a sewing machine or overlocker gathering dust? Working or not, we&apos;ll service it and pass it on to
            someone who&apos;ll use it.
          </p>
          <Link href="/repair-programme" className={styles.programmeLink}>
            How the programme works →
          </Link>
        </div>
      </section>

      <section className={styles.infoSection}>
        <div className="container">
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3>Working or not</h3>
              <p>
                We repair machines too, so it doesn&apos;t matter if yours needs some love. Missing parts are often fine.
              </p>
            </div>
            <div className={styles.infoCard}>
              <h3>One or a few</h3>
              <p>Clearing out a collection? Put them all in one form and add a photo of each.</p>
            </div>
            <div className={styles.infoCard}>
              <h3>What happens next</h3>
              <p>We&apos;ll look at your photos and get in touch to arrange drop-off in West Auckland or collection.</p>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" />

      <section className={styles.formSection}>
        <div className="container">
          <div className={styles.formWrapper}>
            <h2>Offer a machine</h2>
            <DonateMachineForm />
          </div>
        </div>
      </section>
    </div>
  )
}

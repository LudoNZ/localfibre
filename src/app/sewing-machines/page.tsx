import type { Metadata } from "next"
import styles from "./page.module.css"
import SewingMachineForm from "@/components/forms/SewingMachineForm"

export const metadata: Metadata = {
  title: "Sewing Machines | Local Fibre",
  description:
    "Apply for a sewing machine from Local Fibre. Open to individuals and community groups, with pickup in West Auckland.",
}

export default function SewingMachinesPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <h1>Sewing Machines</h1>
          <p className={styles.tagline}>
            Local Fibre helps get sewing machines into the hands of people and
            community groups who will put them to good use.
          </p>
        </div>
      </section>

      <section className={styles.infoSection}>
        <div className="container">
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <h3>Who can apply</h3>
              <p>
                Anyone from the public is welcome to apply, whether you&apos;re an
                individual or applying on behalf of a community group.
              </p>
            </div>
            <div className={styles.infoCard}>
              <h3>West Auckland pickup</h3>
              <p>
                Machines are collected from West Auckland, so we prioritise
                applicants who live in or near West Auckland.
              </p>
            </div>
            <div className={styles.infoCard}>
              <h3>How it works</h3>
              <p>
                Fill in the form below to join the queue. We&apos;ll contact you
                by email or phone when a machine is available for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className="container">
          <div className={styles.formWrapper}>
            <h2>Apply for a Sewing Machine</h2>
            <SewingMachineForm />
          </div>
        </div>
      </section>
    </div>
  )
}

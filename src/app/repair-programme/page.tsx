import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import styles from "./page.module.css"
import { getImpactNumbers, getRepurposedGallery } from "@/lib/impact"
import { getSitePhotos } from "@/lib/sitePhotos"
import ImpactStats from "@/components/ui/ImpactStats"
import PhotoFrame from "@/components/ui/PhotoFrame"
import SectionHeading from "@/components/ui/SectionHeading"
import WaveDivider from "@/components/ui/WaveDivider"
import { getOrganisations } from "@/lib/organisations"
import PartnersList from "@/components/ui/PartnersList"
import { getSiteText } from "@/lib/siteText"
import EditableText from "@/components/text/EditableText"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sewing Machine Repair Programme | Local Fibre",
  description:
    "Local Fibre collects donated sewing machines, services them, and rehomes them with individuals and community groups in Auckland, keeping them out of landfill.",
}

const steps = [1, 2, 3] as const

export default async function RepairProgrammePage() {
  const [impact, gallery, photos, machineRecipients, t] = await Promise.all([
    getImpactNumbers(),
    getRepurposedGallery(),
    getSitePhotos(),
    getOrganisations("recipient"),
    getSiteText(),
  ])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <SectionHeading
              as="h1"
              editable={{ text: t, eyebrow: "repair.hero.eyebrow", title: "repair.hero.title", intro: "repair.hero.intro" }}
              align="left"
            />
            <div className={styles.ctas}>
              <Link href="/donate-machine" className="btn-primary">
                Donate a machine
              </Link>
              <Link href="/sewing-machines" className="btn-accent">
                Apply for a machine
              </Link>
            </div>
          </div>
          <PhotoFrame
            photo={photos.repair}
            slot="repair"
            alt="A sewing machine being serviced"
            tilt="right"
            aspect="landscape"
            priority
            sizes="(max-width: 900px) 100vw, 540px"
          />
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" />

      <section className={styles.problemSection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <EditableText id="repair.problem.eyebrow" text={t["repair.problem.eyebrow"]} className="eyebrow" />
            <EditableText id="repair.problem.title" text={t["repair.problem.title"]} as="h2" />
          </div>
          <div className={styles.prose}>
            <EditableText id="repair.problem.body" text={t["repair.problem.body"]} as="p" />
          </div>
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--rust)" flip />

      <section className={styles.stepsSection}>
        <div className="container">
          <SectionHeading
            editable={{ text: t, eyebrow: "repair.steps.eyebrow", title: "repair.steps.title" }}
            tone="dark"
          />
          <ol className={styles.steps}>
            {steps.map((n) => (
              <li key={n} className={styles.step}>
                <span className={styles.stepNumber}>{n}</span>
                <EditableText id={`repair.step${n}.title`} text={t[`repair.step${n}.title`]} as="h3" />
                <EditableText id={`repair.step${n}.text`} text={t[`repair.step${n}.text`]} as="p" />
              </li>
            ))}
          </ol>
          <ImpactStats
            tone="dark"
            stats={[
              { value: impact.machinesRepurposed, label: "machines rehomed so far" },
              { value: impact.machinesInWorkshop, label: "machines being readied now" },
              { value: impact.peopleWaiting, label: "people on the waiting list" },
            ]}
          />
        </div>
      </section>

      <WaveDivider from="var(--rust)" to="var(--cream)" />

      {machineRecipients.length > 0 && (
        <section className={styles.recipientsSection}>
          <div className="container">
            <SectionHeading
              editable={{
                text: t,
                eyebrow: "repair.recipients.eyebrow",
                title: "repair.recipients.title",
                intro: "repair.recipients.intro",
              }}
            />
            <PartnersList group="recipient" />
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <div className="container">
            <SectionHeading editable={{ text: t, eyebrow: "repair.gallery.eyebrow", title: "repair.gallery.title" }} />
            <ul className={styles.gallery}>
              {gallery.map((machine) => (
                <li key={machine.id} className={`card-retro ${styles.galleryItem}`}>
                  <div className={styles.galleryImage}>
                    <Image
                      src={machine.photo}
                      alt={machine.label || `Machine #${machine.number}`}
                      fill
                      sizes="(max-width: 600px) 50vw, 25vw"
                    />
                  </div>
                  <p>
                    <strong>#{machine.number}</strong> {machine.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={styles.whoSection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <EditableText id="repair.who.eyebrow" text={t["repair.who.eyebrow"]} className="eyebrow" />
            <EditableText id="repair.who.title" text={t["repair.who.title"]} as="h2" />
          </div>
          <div className={styles.prose}>
            <EditableText id="repair.who.body" text={t["repair.who.body"]} as="p" />
            <div className={styles.ctas}>
              <Link href="/sewing-machines" className="btn-primary">
                Join the waiting list
              </Link>
              <Link href="/donate-machine" className="btn-secondary">
                Donate a machine
              </Link>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--olive)" flip />

      <section className={styles.alignSection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <EditableText id="repair.goal.eyebrow" text={t["repair.goal.eyebrow"]} className="eyebrow" />
            <EditableText id="repair.goal.title" text={t["repair.goal.title"]} as="h2" />
          </div>
          <div className={styles.prose}>
            <EditableText id="repair.goal.body" text={t["repair.goal.body"]} as="p" />
          </div>
        </div>
      </section>

      <WaveDivider from="var(--olive)" to="var(--mustard)" />

      <section className={styles.ctaSection}>
        <div className={`container ${styles.ctaInner}`}>
          <EditableText id="repair.cta.title" text={t["repair.cta.title"]} as="h2" />
          <EditableText id="repair.cta.text" text={t["repair.cta.text"]} as="p" />
          <div className={styles.ctas}>
            <Link href="/donate-machine" className="btn-primary">
              Donate a machine
            </Link>
            <Link href="/sewing-machines" className="btn-secondary">
              Apply for a machine
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

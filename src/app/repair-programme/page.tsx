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
import { site } from "@/data/site"
import { machineRecipients } from "@/data/partners"
import PartnersList from "@/components/ui/PartnersList"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sewing Machine Repair Programme | Local Fibre",
  description:
    "Local Fibre collects donated sewing machines, services them, and rehomes them with individuals and community groups in Auckland, keeping them out of landfill.",
}

const steps = [
  {
    title: "Donated",
    text: "People and organisations give us sewing machines they no longer use, instead of storing them or throwing them away.",
  },
  {
    title: "Serviced & repaired",
    text: "Each machine is cleaned, checked and repaired, then logged with its details and photos so we know its history.",
  },
  {
    title: "Rehomed",
    text: "Ready machines are matched with people on our waiting list, in order, and collected from West Auckland.",
  },
]

const donateHref = `mailto:${site.email}?subject=${encodeURIComponent("Donating a sewing machine")}&body=${encodeURIComponent(
  "Kia ora Local Fibre,\n\nI have a sewing machine I'd like to donate.\n\nBrand/model (if known):\nCondition:\nSuburb:\n\nNgā mihi,"
)}`

export default async function RepairProgrammePage() {
  const [impact, gallery, photos] = await Promise.all([
    getImpactNumbers(),
    getRepurposedGallery(),
    getSitePhotos(),
  ])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <SectionHeading
              as="h1"
              eyebrow="Our programme"
              title="Sewing Machine Repair Programme"
              intro="We give unused sewing machines a second life. Donated machines are serviced and rehomed with people and community groups who will use them, keeping them out of landfill and putting a valuable skill within reach."
              align="left"
            />
            <div className={styles.ctas}>
              <a href={donateHref} className="btn-primary">
                Donate a machine
              </a>
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
            <span className="eyebrow">Why it matters</span>
            <h2>Good machines shouldn&apos;t go to waste</h2>
          </div>
          <div className={styles.prose}>
            <p>
              Many households have a sewing machine sitting unused in a cupboard, and working
              machines regularly end up in landfill when they need little more than a service.
            </p>
            <p>
              At the same time, a sewing machine is out of reach for many people who want to mend
              their clothes, learn a skill or make things for their whānau and community.
            </p>
            <p>
              The programme connects the two: it reduces waste, extends the life of the textiles
              people already own through mending, and builds sewing skills in the community.
            </p>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--rust)" flip />

      <section className={styles.stepsSection}>
        <div className="container">
          <SectionHeading eyebrow="How it works" title="From cupboard to community" tone="dark" />
          <ol className={styles.steps}>
            {steps.map((step, i) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
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
              eyebrow="Where machines have gone"
              title="Sewing machines in the community"
              intro="As well as individuals, machines from the programme have gone to community organisations including:"
            />
            <PartnersList partners={machineRecipients} />
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.gallerySection}>
          <div className="container">
            <SectionHeading eyebrow="Rehomed" title="Machines with new homes" />
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
            <span className="eyebrow">Who it helps</span>
            <h2>Individuals and community groups</h2>
          </div>
          <div className={styles.prose}>
            <p>
              Anyone can apply, whether for themselves or on behalf of a community group or
              organisation. Applicants join a waiting list and are matched with machines in the
              order they applied.
            </p>
            <p>
              Machines are collected from West Auckland, so we prioritise applicants who live in or
              near West Auckland.
            </p>
            <Link href="/sewing-machines" className="btn-primary">
              Join the waiting list
            </Link>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--olive)" flip />

      <section className={styles.alignSection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <span className="eyebrow">Our bigger goal</span>
            <h2>Part of a zero-waste Tāmaki Makaurau</h2>
          </div>
          <div className={styles.prose}>
            {/* TODO: check this matches Auckland Council's current waste plan wording */}
            <p>
              Repairing and rehoming sewing machines, and teaching people to mend, keeps products
              and textiles in use for longer. This supports Auckland&apos;s goal of working towards
              zero waste by 2040.
            </p>
            <p>
              Want to support or partner with the programme? Get in touch at{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--olive)" to="var(--mustard)" />

      <section className={styles.ctaSection}>
        <div className={`container ${styles.ctaInner}`}>
          <h2>Have a machine you no longer use?</h2>
          <p>Donate it, and we&apos;ll make sure it gets back into a maker&apos;s hands.</p>
          <div className={styles.ctas}>
            <a href={donateHref} className="btn-primary">
              Donate a machine
            </a>
            <Link href="/sewing-machines" className="btn-secondary">
              Apply for a machine
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

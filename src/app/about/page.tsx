import type { Metadata } from "next"
import Link from "next/link"
import styles from "./page.module.css"
import PhotoFrame from "@/components/ui/PhotoFrame"
import SectionHeading from "@/components/ui/SectionHeading"
import WaveDivider from "@/components/ui/WaveDivider"
import PartnersList from "@/components/ui/PartnersList"
import { site, team, values } from "@/data/site"
import { getSitePhotos } from "@/lib/sitePhotos"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About | Local Fibre",
  description:
    "Local Fibre is a West Auckland community group bringing people together to sew, mend and repair, and keeping textiles and sewing machines out of landfill.",
}

export default async function AboutPage() {
  const photos = await getSitePhotos()

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <SectionHeading
              as="h1"
              eyebrow="About us"
              title="Sewing, mending and community in West Auckland"
              intro={site.mission}
              align="left"
            />
          </div>
          <PhotoFrame
            photo={photos.event}
            slot="event"
            alt="A Local Fibre social sewing session"
            tilt="left"
            aspect="landscape"
            priority
            sizes="(max-width: 900px) 100vw, 540px"
          />
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" />

      <section className={styles.storySection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <span className="eyebrow">Our story</span>
            <h2>Why Local Fibre exists</h2>
          </div>
          <div className={styles.prose}>
            {/* TODO: replace with the Local Fibre story in your own words */}
            <p>
              Local Fibre offers welcoming spaces for fibre crafters of all kinds (sewists,
              knitters, stitchers, upcyclers, weavers and curious beginners) to gather, share skills
              and spark inspiration.
            </p>
            <p>
              We run social sewing sessions and fabric swap events, share free patterns, and through our{" "}
              <Link href="/repair-programme">Sewing Machine Repair Programme</Link> we service donated
              machines and rehome them with people and groups who will use them.
            </p>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--cream)" flip />

      <section className={styles.valuesSection}>
        <div className="container">
          <SectionHeading eyebrow="What guides us" title="Our values" />
          <ul className={styles.values}>
            {values.map((value, i) => (
              <li key={value.title} className={`card-retro ${styles.valueCard} ${styles[`tone${i}`]}`}>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {team.length > 0 && (
        <section className={styles.teamSection}>
          <div className="container">
            <SectionHeading eyebrow="Who we are" title="The people behind Local Fibre" />
            <ul className={styles.team}>
              {team.map((person) => (
                <li key={person.name} className={styles.person}>
                  <PhotoFrame
                    photo={person.photo ? { src: person.photo } : null}
                    alt={person.name}
                    aspect="square"
                    tilt="none"
                    sizes="160px"
                  />
                  <div>
                    <h3>{person.name}</h3>
                    <p className={styles.role}>{person.role}</p>
                    <p>{person.bio}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <WaveDivider from="var(--cream)" to="var(--olive)" />

      <section className={styles.whereSection}>
        <div className={`container ${styles.twoCol}`}>
          <div>
            <span className="eyebrow">Where we work</span>
            <h2>Rooted in West Auckland</h2>
          </div>
          <div className={styles.prose}>
            <p>
              Our events run in West Auckland, and sewing machines from our programme are
              collected from West Auckland.
            </p>
            <p>{site.orgStatus}</p>
          </div>
        </div>
      </section>

      <WaveDivider from="var(--olive)" to="var(--sand)" flip />

      <section className={styles.partnersSection}>
        <div className="container">
          <SectionHeading
            eyebrow="Thank you"
            title="Partners & supporters"
            intro="We couldn't do this without the venues, groups and people who support us."
          />
          <PartnersList />
          <p className={styles.partnerCta}>
            Interested in partnering with us or supporting the programme?{" "}
            <a href={`mailto:${site.email}`}>Get in touch</a>.
          </p>
        </div>
      </section>
    </div>
  )
}

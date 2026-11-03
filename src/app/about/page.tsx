import type { Metadata } from "next"
import styles from "./page.module.css"
import PhotoFrame from "@/components/ui/PhotoFrame"
import SectionHeading from "@/components/ui/SectionHeading"
import WaveDivider from "@/components/ui/WaveDivider"
import PartnersList from "@/components/ui/PartnersList"
import { team } from "@/data/site"
import { getSitePhotos } from "@/lib/sitePhotos"
import { getSiteText } from "@/lib/siteText"
import EditableText from "@/components/text/EditableText"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "About | Local Fibre",
  description:
    "Local Fibre is a West Auckland community group bringing people together to sew, mend and repair, and keeping textiles and sewing machines out of landfill.",
}

export default async function AboutPage() {
  const [photos, t] = await Promise.all([getSitePhotos(), getSiteText()])

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div>
            <SectionHeading
              as="h1"
              editable={{ text: t, eyebrow: "about.hero.eyebrow", title: "about.hero.title", intro: "site.mission" }}
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
            <EditableText id="about.story.eyebrow" text={t["about.story.eyebrow"]} className="eyebrow" />
            <EditableText id="about.story.title" text={t["about.story.title"]} as="h2" />
          </div>
          <div className={styles.prose}>
            <EditableText id="about.story.body" text={t["about.story.body"]} as="p" />
          </div>
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--cream)" flip />

      <section className={styles.valuesSection}>
        <div className="container">
          <SectionHeading editable={{ text: t, eyebrow: "about.values.eyebrow", title: "about.values.title" }} />
          <ul className={styles.values}>
            {([1, 2, 3] as const).map((n, i) => (
              <li key={n} className={`card-retro ${styles.valueCard} ${styles[`tone${i}`]}`}>
                <EditableText id={`about.value${n}.title`} text={t[`about.value${n}.title`]} as="h3" />
                <EditableText id={`about.value${n}.text`} text={t[`about.value${n}.text`]} as="p" />
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
            <EditableText id="about.where.eyebrow" text={t["about.where.eyebrow"]} className="eyebrow" />
            <EditableText id="about.where.title" text={t["about.where.title"]} as="h2" />
          </div>
          <div className={styles.prose}>
            <EditableText id="about.where.body" text={t["about.where.body"]} as="p" />
          </div>
        </div>
      </section>

      <WaveDivider from="var(--olive)" to="var(--sand)" flip />

      <section className={styles.partnersSection}>
        <div className="container">
          <SectionHeading
            editable={{
              text: t,
              eyebrow: "about.partners.eyebrow",
              title: "about.partners.title",
              intro: "about.partners.intro",
            }}
          />
          <PartnersList />
          <EditableText id="about.partners.cta" text={t["about.partners.cta"]} as="p" className={styles.partnerCta} />
        </div>
      </section>
    </div>
  )
}

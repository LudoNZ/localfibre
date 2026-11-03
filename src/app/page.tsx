import Link from "next/link"
import styles from "./page.module.css"
import NewsletterForm from "@/components/forms/NewsletterForm"
import ContactForm from "@/components/forms/ContactForm"
import { getEvents, getNextEventId } from "@/lib/events"
import { getPatterns } from "@/lib/patterns"
import { getImpactNumbers } from "@/lib/impact"
import { getSitePhotos } from "@/lib/sitePhotos"
import EventCard from "@/components/ui/EventCard"
import PatternCard from "@/components/ui/PatternCard"
import PhotoFrame from "@/components/ui/PhotoFrame"
import ImpactStats from "@/components/ui/ImpactStats"
import SectionHeading from "@/components/ui/SectionHeading"
import WaveDivider from "@/components/ui/WaveDivider"
import PartnersList from "@/components/ui/PartnersList"
import { site } from "@/data/site"
import { getOrganisations } from "@/lib/organisations"
import { getSiteText } from "@/lib/siteText"
import EditableText from "@/components/text/EditableText"

export const dynamic = "force-dynamic"

const offerings = [
  { key: "offering1", tone: "mustard" },
  { key: "offering2", tone: "tan" },
  { key: "offering3", tone: "olive" },
] as const

export default async function Home() {
  const [events, patterns, impact, photos, machineRecipients, t] = await Promise.all([
    getEvents(),
    getPatterns(),
    getImpactNumbers(),
    getSitePhotos(),
    getOrganisations("recipient"),
    getSiteText(),
  ])
  const upcomingEvents = events.filter((e) => e.isUpcoming)
  const pastEvents = events.filter((e) => !e.isUpcoming)
  const nextEventId = getNextEventId(events)

  const impactStats = [
    { value: impact.machinesRepurposed, label: "sewing machines rehomed" },
    { value: impact.machinesInWorkshop, label: "machines being readied" },
    { value: impact.eventsHeld, label: "community events held" },
    { value: impact.eventAttendees, label: "makers at our events" },
    {
      value: impact.textilesDivertedKg ? `${impact.textilesDivertedKg}kg` : null,
      label: "textiles kept from landfill",
    },
  ]
  const hasImpact = impactStats.some((s) => s.value)

  return (
    <div className={styles.home}>
      {/* Hero */}
      <section id="home" className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroText}>
            <EditableText id="home.hero.eyebrow" text={t["home.hero.eyebrow"]} className="eyebrow" />
            <h1 className={styles.heroTitle}>
              <EditableText id="home.hero.title" text={t["home.hero.title"]} />{" "}
              <EditableText
                id="home.hero.highlight"
                text={t["home.hero.highlight"]}
                className={styles.heroHighlight}
              />
            </h1>
            <EditableText id="home.hero.tagline" text={t["home.hero.tagline"]} as="p" className={styles.heroTagline} />
            <div className={styles.heroCTAs}>
              <Link href="/repair-programme" className="btn-primary">
                Our Repair Programme
              </Link>
              <Link href="#events" className="btn-secondary">
                Upcoming events
              </Link>
            </div>
          </div>
          <div className={styles.heroCollage}>
            <PhotoFrame
              photo={photos.hero1}
              slot="hero1"
              alt="People sewing together at a Local Fibre session"
              tilt="left"
              aspect="portrait"
              priority
              sizes="(max-width: 900px) 80vw, 420px"
              className={styles.collageMain}
            />
            <PhotoFrame
              photo={photos.hero2}
              slot="hero2"
              alt="A repaired sewing machine ready for a new home"
              tilt="right"
              aspect="square"
              sizes="(max-width: 900px) 45vw, 260px"
              className={styles.collageSide}
            />
          </div>
        </div>
      </section>

      {hasImpact && (
        <>
          <WaveDivider from="var(--cream)" to="var(--sand)" />
          <section className={styles.impactSection} aria-labelledby="impact-heading">
            <div className="container">
              <h2 id="impact-heading" className="visually-hidden">
                Our impact
              </h2>
              <ImpactStats stats={impactStats} />
            </div>
          </section>
          <WaveDivider from="var(--sand)" to="var(--rust)" flip />
        </>
      )}
      {!hasImpact && <WaveDivider from="var(--cream)" to="var(--rust)" />}

      {/* Repair Programme feature */}
      <section className={styles.programmeSection}>
        <div className={`container ${styles.programmeGrid}`}>
          <div>
            <SectionHeading
              editable={{
                text: t,
                eyebrow: "home.programme.eyebrow",
                title: "home.programme.title",
                intro: "home.programme.intro",
              }}
              align="left"
              tone="dark"
            />
            <ol className={styles.steps}>
              <li>
                <span className={styles.stepNumber}>1</span>
                <EditableText id="home.programme.step1" text={t["home.programme.step1"]} />
              </li>
              <li>
                <span className={styles.stepNumber}>2</span>
                <EditableText id="home.programme.step2" text={t["home.programme.step2"]} />
              </li>
              <li>
                <span className={styles.stepNumber}>3</span>
                <EditableText id="home.programme.step3" text={t["home.programme.step3"]} />
              </li>
            </ol>
            {machineRecipients.length > 0 && (
              <div className={styles.recipients}>
                <EditableText
                  id="home.programme.recipients"
                  text={t["home.programme.recipients"]}
                  as="p"
                  className={styles.recipientsLabel}
                />
                <ul>
                  {machineRecipients.map((org) => (
                    <li key={org.id}>{org.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.programmeCTAs}>
              <Link href="/repair-programme" className="btn-accent">
                How the programme works
              </Link>
              <Link href="/sewing-machines" className="btn-secondary">
                Apply for a machine
              </Link>
              <Link href="/donate-machine" className="btn-secondary">
                Donate a machine
              </Link>
            </div>
          </div>
          <PhotoFrame
            photo={photos.repair}
            slot="repair"
            alt="A sewing machine being serviced"
            tilt="right"
            aspect="landscape"
            sizes="(max-width: 900px) 100vw, 540px"
          />
        </div>
      </section>

      <WaveDivider from="var(--rust)" to="var(--cream)" />

      {/* What we do */}
      <section id="about" className={styles.offeringsSection}>
        <div className="container">
          <SectionHeading
            editable={{ text: t, eyebrow: "home.about.eyebrow", title: "home.about.title", intro: "site.mission" }}
          />
          <div className={styles.offeringsGrid}>
            {offerings.map((item, i) => (
              <article key={item.key} className={`card-retro ${styles.offeringCard}`}>
                <span className={`${styles.offeringBadge} ${styles[item.tone]}`} aria-hidden="true">
                  0{i + 1}
                </span>
                <EditableText id={`home.${item.key}.title`} text={t[`home.${item.key}.title`]} as="h3" />
                <EditableText id={`home.${item.key}.text`} text={t[`home.${item.key}.text`]} as="p" />
              </article>
            ))}
          </div>
          <p className={styles.moreLink}>
            <Link href="/about">More about Local Fibre →</Link>
          </p>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" flip />

      {/* Events */}
      <section id="events" className={styles.eventsSection}>
        <div className="container">
          <SectionHeading
            editable={{ text: t, eyebrow: "home.events.eyebrow", title: "home.events.title", intro: "home.events.intro" }}
          />
          {upcomingEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} isNext={event.id === nextEventId} />
              ))}
            </div>
          ) : (
            <EditableText id="home.events.empty" text={t["home.events.empty"]} as="p" className={styles.emptyState} />
          )}
          {pastEvents.length > 0 && (
            <>
              <h3 className={styles.subHeading}>Past events</h3>
              <div className={styles.eventsGrid}>
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--cream)" />

      {/* Resources (patterns, guides) */}
      <section id="resources" className={styles.patternsSection}>
        <div className="container">
          <SectionHeading
            editable={{
              text: t,
              eyebrow: "home.resources.eyebrow",
              title: "home.resources.title",
              intro: "home.resources.intro",
            }}
          />
          {patterns.length > 0 ? (
            <div className={styles.patternsGrid}>
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          ) : (
            <EditableText
              id="home.resources.empty"
              text={t["home.resources.empty"]}
              as="p"
              className={styles.emptyState}
            />
          )}
          <EditableText id="home.resources.koha" text={t["home.resources.koha"]} as="p" className={styles.kohaText} />
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" flip />

      {/* Partners */}
      <section className={styles.partnersSection} aria-labelledby="partners-heading">
        <div className="container">
          <SectionHeading
            editable={{ text: t, eyebrow: "home.partners.eyebrow", title: "home.partners.title" }}
            id="partners-heading"
          />
          <PartnersList />
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--mustard)" />

      {/* Newsletter */}
      <section id="newsletter" className={styles.newsletterSection}>
        <div className={`container ${styles.newsletterInner}`}>
          <div>
            <EditableText
              id="home.newsletter.title"
              text={t["home.newsletter.title"]}
              as="h2"
              className={styles.newsletterTitle}
            />
            <EditableText
              id="home.newsletter.text"
              text={t["home.newsletter.text"]}
              as="p"
              className={styles.newsletterText}
            />
          </div>
          <NewsletterForm />
        </div>
      </section>

      <WaveDivider from="var(--mustard)" to="var(--cream)" flip />

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className="container">
          <SectionHeading
            editable={{ text: t, eyebrow: "home.contact.eyebrow", title: "home.contact.title", intro: "home.contact.intro" }}
          />
          <div className={styles.contactContent}>
            <div className={styles.contactInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Instagram</span>
                <a href={site.instagram} target="_blank" rel="noopener noreferrer">
                  {site.instagramHandle}
                </a>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Where</span>
                <span>{site.region}</span>
              </div>
            </div>
            <div className={`card-retro ${styles.formWrapper}`}>
              <EditableText id="home.contact.formTitle" text={t["home.contact.formTitle"]} as="h3" />
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

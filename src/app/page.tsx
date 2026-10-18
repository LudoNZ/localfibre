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

export const dynamic = "force-dynamic"

const offerings = [
  {
    title: "Social sewing",
    text: "Relaxed sessions where makers of every skill level bring their own projects, share tips and enjoy good company.",
    tone: "mustard",
  },
  {
    title: "Workshops & mending",
    text: "Hands-on workshops in repair, visible mending and zero-waste techniques that keep clothes in use for longer.",
    tone: "tan",
  },
  {
    title: "Machine repair & rehoming",
    text: "Donated sewing machines are serviced and given to people and community groups who will put them to use.",
    tone: "olive",
  },
] as const

export default async function Home() {
  const [events, patterns, impact, photos] = await Promise.all([
    getEvents(),
    getPatterns(),
    getImpactNumbers(),
    getSitePhotos(),
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
            <span className="eyebrow">Community sewing · {site.region}</span>
            <h1 className={styles.heroTitle}>
              Mend. Make. <span className={styles.heroHighlight}>Connect.</span>
            </h1>
            <p className={styles.heroTagline}>
              Local Fibre brings people together to sew, mend and repair, and gives
              donated sewing machines a second life with people who need them.
            </p>
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
              eyebrow="Our programme"
              title="Sewing Machine Repair Programme"
              intro="Good sewing machines too often end up in storage or landfill, while people who want to sew can't afford one. We collect donated machines, service them, and rehome them with individuals and community groups across Auckland."
              align="left"
              tone="dark"
            />
            <ol className={styles.steps}>
              <li>
                <span className={styles.stepNumber}>1</span>
                <span>Machines are donated</span>
              </li>
              <li>
                <span className={styles.stepNumber}>2</span>
                <span>We service and repair them</span>
              </li>
              <li>
                <span className={styles.stepNumber}>3</span>
                <span>They go to someone on our waiting list</span>
              </li>
            </ol>
            <div className={styles.programmeCTAs}>
              <Link href="/repair-programme" className="btn-accent">
                How the programme works
              </Link>
              <Link href="/sewing-machines" className="btn-secondary">
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
            sizes="(max-width: 900px) 100vw, 540px"
          />
        </div>
      </section>

      <WaveDivider from="var(--rust)" to="var(--cream)" />

      {/* What we do */}
      <section id="about" className={styles.offeringsSection}>
        <div className="container">
          <SectionHeading
            eyebrow="What we do"
            title="Making, mending and keeping textiles in use"
            intro={site.mission}
          />
          <div className={styles.offeringsGrid}>
            {offerings.map((item, i) => (
              <article key={item.title} className={`card-retro ${styles.offeringCard}`}>
                <span className={`${styles.offeringBadge} ${styles[item.tone]}`} aria-hidden="true">
                  0{i + 1}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
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
            eyebrow="Events"
            title="Upcoming events"
            intro="Join us for Social Sewing and other community sewing events around West Auckland."
          />
          {upcomingEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} isNext={event.id === nextEventId} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>No upcoming events scheduled. Check back soon!</p>
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

      {/* Patterns */}
      <section id="patterns" className={styles.patternsSection}>
        <div className="container">
          <SectionHeading
            eyebrow="Free resources"
            title="Free patterns"
            intro="Resource-sharing for a creative, low-waste Aotearoa."
          />
          {patterns.length > 0 ? (
            <div className={styles.patternsGrid}>
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Patterns coming soon! Check back later.</p>
          )}
          <p className={styles.kohaText}>
            All patterns are free to download. If you&apos;d like to support our work, koha
            (donation) options will be available soon.
          </p>
        </div>
      </section>

      <WaveDivider from="var(--cream)" to="var(--sand)" flip />

      {/* Partners */}
      <section className={styles.partnersSection} aria-labelledby="partners-heading">
        <div className="container">
          <SectionHeading eyebrow="Thank you" title="Partners & supporters" id="partners-heading" />
          <PartnersList />
        </div>
      </section>

      <WaveDivider from="var(--sand)" to="var(--mustard)" />

      {/* Newsletter */}
      <section id="newsletter" className={styles.newsletterSection}>
        <div className={`container ${styles.newsletterInner}`}>
          <div>
            <h2 className={styles.newsletterTitle}>Stay in the loop</h2>
            <p className={styles.newsletterText}>
              Updates on events, workshops, machines and community news. No spam, ever.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <WaveDivider from="var(--mustard)" to="var(--cream)" flip />

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className="container">
          <SectionHeading
            eyebrow="Contact"
            title="Get in touch"
            intro="Questions, a machine to donate, or want to get involved? We'd love to hear from you."
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
              <h3>Send us a message</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import Image from "next/image"
import styles from "./page.module.css"
import NewsletterForm from "@/components/forms/NewsletterForm"
import ContactForm from "@/components/forms/ContactForm"
import { getEvents, getNextEventId } from "@/lib/events"
import { getPatterns } from "@/lib/patterns"
import EventCard from "@/components/ui/EventCard"
import PatternCard from "@/components/ui/PatternCard"

export const dynamic = "force-dynamic"

export default async function Home() {
  const events = await getEvents()
  const upcomingEvents = events.filter((e) => e.isUpcoming)
  const pastEvents = events.filter((e) => !e.isUpcoming)
  const nextEventId = getNextEventId(events)
  const patterns = await getPatterns()

  return (
    <div className={styles.home}>
      {/* Hero */}
      <section id="home" className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroImage}>
              <Image
                src="/images/LFLogo-Horizontal.png"
                alt="Local Fibre"
                width={600}
                height={300}
                priority
                style={{ height: "auto", width: "100%", maxWidth: "520px" }}
              />
            </div>
            <p className={styles.heroTagline}>
              Connecting community through sewing, creativity and zero-waste
              practice in Aotearoa.
            </p>
            <div className={styles.heroCTAs}>
              <a href="#events" className="btn-primary">
                Join a Workshop
              </a>
              <a href="#patterns" className="btn-secondary">
                Download Free Patterns
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className={styles.aboutSection}>
        <div className="container">
          <div className={styles.aboutLayout}>
            <div className={styles.aboutText}>
              <h2>About Local Fibre</h2>
              <p>
                Local Fibre is a community-driven creative initiative that
                brings together people who love to make, mend, and connect.
              </p>
              <p>
                Valuing sustainability, community, and shared learning, we offer
                welcoming spaces for fibre crafters of all kinds—knitters,
                stitchers, upcyclers, weavers, and curious beginners—to gather,
                share skills, and spark inspiration.
              </p>
            </div>
            <div className={styles.valuesGrid}>
              <div className={styles.valueCard}>
                <h3>Sustainability</h3>
                <p>
                  Promoting zero-waste practices, reuse, and mindful consumption
                  of textile resources.
                </p>
              </div>
              <div className={styles.valueCard}>
                <h3>Shared Learning</h3>
                <p>
                  Creating spaces where everyone can learn, teach, and grow
                  together regardless of skill level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className={styles.eventsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Upcoming Events</h2>
            <p className={styles.sectionTagline}>
              Join us for Fibre &amp; Friends and other community sewing events.
            </p>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className={styles.eventsGrid}>
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isNext={event.id === nextEventId}
                />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              No upcoming events scheduled. Check back soon!
            </p>
          )}
          {pastEvents.length > 0 && (
            <>
              <h3 className={styles.subHeading}>Past Events</h3>
              <div className={styles.eventsGrid}>
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Workshops */}
      <section className={styles.workshopsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Workshops + Social Sewing</h2>
            <p className={styles.sectionTagline}>
              Welcoming spaces for makers of all skill levels.
            </p>
          </div>
          <div className={styles.workshopsGrid}>
            <div className={styles.workshopCard}>
              <h3>Social Sewing Sessions</h3>
              <p>
                Regular meetups where makers come together to work on their own
                projects in a supportive, social environment. All skill levels
                welcome.
              </p>
            </div>
            <div className={styles.workshopCard}>
              <h3>Skill-Building Workshops</h3>
              <p>
                Learn new techniques from experienced makers. From basic mending
                to advanced techniques, we cover a range of skills for
                sustainable textile practices.
              </p>
            </div>
            <div className={styles.workshopCard}>
              <h3>Creative Mending</h3>
              <p>
                Transform worn clothes into beautiful, unique pieces through
                visible mending and creative patching techniques.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Patterns */}
      <section id="patterns" className={styles.patternsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Free Patterns</h2>
            <p className={styles.sectionTagline}>
              Resource-sharing for a creative, low-waste Aotearoa.
            </p>
          </div>
          {patterns.length > 0 ? (
            <div className={styles.patternsGrid}>
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>
              Patterns coming soon! Check back later.
            </p>
          )}
          <p className={styles.kohaText}>
            All patterns are free to download. If you&apos;d like to support our
            work, koha (donation) options will be available soon.
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className={styles.newsletterSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Stay Connected</h2>
            <p className={styles.sectionTagline}>
              Subscribe for updates on events, workshops, and community news.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Get in Touch</h2>
            <p className={styles.sectionTagline}>
              Have questions or want to get involved? We&apos;d love to hear
              from you.
            </p>
          </div>
          <div className={styles.contactContent}>
            <div className={styles.contactInfo}>
              <h3>Contact Information</h3>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <a href="mailto:hello@localfibre.co.nz">
                  hello@localfibre.co.nz
                </a>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Instagram</span>
                <a
                  href="https://www.instagram.com/localfibre/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @localfibre
                </a>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Events</span>
                <a href="#events">View upcoming events</a>
              </div>
            </div>
            <div className={styles.formWrapper}>
              <h3>Send us a Message</h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";
import NewsletterForm from "@/components/forms/NewsletterForm";
import { getUpcomingEvents } from "@/data/events";
import EventCard from "@/components/ui/EventCard";

export default function Home() {
  const upcomingEvents = getUpcomingEvents();

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroImage}>
              <Image
                src="/images/banner-logo.svg"
                alt="Local Fibre"
                width={600}
                height={300}
                priority
                style={{ height: "auto", width: "100%", maxWidth: "600px" }}
              />
            </div>
            <p className={styles.heroTagline}>
              Connecting community through sewing, creativity, and zero-waste practice in Aotearoa.
            </p>
            <div className={styles.heroCTAs}>
              <Link href="/events" className="btn-primary">
                Join a Workshop
              </Link>
              <Link href="/patterns" className="btn-secondary">
                Download Free Patterns
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Preview */}
      <section className={styles.eventsSection}>
        <div className="container">
          <h2>Upcoming Events</h2>
          <div className={styles.eventsGrid}>
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <div className={styles.sectionCTAs}>
            <Link href="/events" className="btn-secondary">
              View All Events
            </Link>
          </div>
        </div>
      </section>

      <div className="stitched-line"></div>

      {/* About Section */}
      <section className={styles.aboutSection}>
        <div className="container">
          <h2>About Local Fibre</h2>
          <div className={styles.aboutContent}>
            <p>
              Local Fibre is a community-driven creative initiative that brings together people
              who love to make, mend, and connect.
            </p>
            <p>
              Valuing sustainability, community, and shared learning, we offer welcoming spaces
              for fibre crafters of all kinds—knitters, stitchers, upcyclers, weavers, and curious
              beginners—to gather, share skills, and spark inspiration.
            </p>
          </div>
        </div>
      </section>

      <div className="stitched-line"></div>

      {/* Workshops & Social Sewing */}
      <section className={styles.workshopsSection}>
        <div className="container">
          <h2>Workshops + Social Sewing</h2>
          <div className={styles.workshopsGrid}>
            <div className={styles.workshopCard}>
              <h3>Social Sewing Sessions</h3>
              <p>
                Regular meetups where makers come together to work on their own projects in a
                supportive, social environment. All skill levels welcome.
              </p>
            </div>
            <div className={styles.workshopCard}>
              <h3>Skill-Building Workshops</h3>
              <p>
                Learn new techniques from experienced makers. From basic mending to advanced
                techniques, we cover a range of skills for sustainable textile practices.
              </p>
            </div>
            <div className={styles.workshopCard}>
              <h3>Creative Mending</h3>
              <p>
                Transform worn clothes into beautiful, unique pieces through visible mending and
                creative patching techniques.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="stitched-line"></div>

      {/* Community Values */}
      <section className={styles.valuesSection}>
        <div className="container">
          <h2>Our Values</h2>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <h3>Whakawhanaungatanga</h3>
              <p>Building meaningful connections and relationships within our community.</p>
            </div>
            <div className={styles.valueCard}>
              <h3>Sustainability</h3>
              <p>
                Promoting zero-waste practices, reuse, and mindful consumption of textile resources.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3>Shared Learning</h3>
              <p>
                Creating spaces where everyone can learn, teach, and grow together regardless of
                skill level.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="stitched-line"></div>

      {/* Newsletter Signup */}
      <section className={styles.newsletterSection}>
        <div className="container">
          <h2>Stay Connected</h2>
          <p className={styles.newsletterDescription}>
            Subscribe to our newsletter for updates on events, workshops, and community news.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* Final CTAs */}
      <section className={styles.finalCTAs}>
        <div className="container">
          <div className={styles.ctaButtons}>
            <Link href="/events" className="btn-primary">
              Join a Workshop
            </Link>
            <Link href="/patterns" className="btn-secondary">
              Download Free Patterns
            </Link>
            <a href="#newsletter" className="btn-secondary">
              Sign Up to Newsletter
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

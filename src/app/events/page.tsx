import styles from "./page.module.css";
import { events } from "@/data/events";
import EventCard from "@/components/ui/EventCard";

export const metadata = {
  title: "Upcoming Events | Local Fibre",
  description: "Join us for Fibre & Friends and other community sewing events in Aotearoa.",
};

export default function EventsPage() {
  const upcomingEvents = events.filter((e) => e.isUpcoming);
  const pastEvents = events.filter((e) => !e.isUpcoming);

  return (
    <div className={styles.eventsPage}>
      <section className={styles.hero}>
        <div className="container">
          <h1>Upcoming Events</h1>
          <p className={styles.tagline}>
            Join us for Fibre & Friends, a full-day celebration of creativity, community, and
            conscious making.
          </p>
        </div>
      </section>

      <section className={styles.eventsSection}>
        <div className="container">
          {upcomingEvents.length > 0 ? (
            <>
              <div className={styles.eventsGrid}>
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          ) : (
            <div className={styles.noEvents}>
              <p>No upcoming events scheduled. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {pastEvents.length > 0 && (
        <section className={styles.pastEventsSection}>
          <div className="container">
            <h2>Past Events</h2>
            <div className={styles.eventsGrid}>
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


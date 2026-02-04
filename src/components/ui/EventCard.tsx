import Link from "next/link";
import styles from "./EventCard.module.css";
import { Event, parseEventDate } from "@/data/events";
import CountdownTimer from "./CountdownTimer";

interface EventCardProps {
  event: Event;
  isNext?: boolean;
}

export default function EventCard({ event, isNext = false }: EventCardProps) {
  const eventDate = parseEventDate(event.date);

  return (
    <article className={`${styles.card} ${isNext ? styles.nextEvent : ""}`}>
      {isNext && <div className={styles.stamp}>Next Event</div>}
      <div className={styles.cardContent}>
        <h3 className={styles.title}>{event.title}</h3>
        <div className={styles.details}>
          <p className={styles.date}>{event.date}</p>
          <p className={styles.time}>{event.time}</p>
          <p className={styles.location}>{event.location}</p>
        </div>
        {isNext && eventDate && (
          <CountdownTimer targetDate={eventDate} />
        )}
        <p className={styles.description}>{event.description}</p>
        {event.registerLink && (
          <Link href={event.registerLink} className="btn-primary">
            Register Interest
          </Link>
        )}
      </div>
    </article>
  );
}


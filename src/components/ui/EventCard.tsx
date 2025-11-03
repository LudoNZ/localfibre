import Link from "next/link";
import styles from "./EventCard.module.css";
import { Event } from "@/data/events";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardContent}>
        <h3 className={styles.title}>{event.title}</h3>
        <div className={styles.details}>
          <p className={styles.date}>{event.date}</p>
          <p className={styles.time}>{event.time}</p>
          <p className={styles.location}>{event.location}</p>
        </div>
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


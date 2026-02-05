import { db } from "./firebaseAdmin";

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  registerLink?: string;
  isUpcoming: boolean;
}

export async function getEvents(): Promise<Event[]> {
  const snapshot = await db.collection("events").get();
  const events: Event[] = [];

  snapshot.forEach((doc) => {
    events.push({
      id: doc.id,
      ...doc.data(),
    } as Event);
  });

  return events;
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const events = await getEvents();
  return events.filter((event) => event.isUpcoming).slice(0, 3);
}

export function getNextEventId(events: Event[]): string | null {
  const upcoming = events.filter((event) => event.isUpcoming);
  const now = new Date();

  const eventsWithDates = upcoming
    .map((event) => {
      if (event.date.includes("TBC")) return null;

      const eventDateTime = parseEventDateTime(event.date, event.time);
      if (!eventDateTime) return null;

      return {
        event,
        date: eventDateTime,
      };
    })
    .filter((item): item is { event: Event; date: Date } => item !== null)
    .filter((item) => item.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return eventsWithDates.length > 0 ? eventsWithDates[0].event.id : null;
}

export function parseEventDateTime(dateString: string, timeString: string): Date | null {
  if (dateString.includes("TBC")) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const startTimeStr = timeString.split("-")[0].trim();
  const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return date;

  const [, hoursStr, minutesStr, period] = timeMatch;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (period.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  const eventDateTime = new Date(date);
  eventDateTime.setHours(hours, minutes, 0, 0);

  return eventDateTime;
}

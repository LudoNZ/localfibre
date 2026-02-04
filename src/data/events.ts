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

export const events: Event[] = [
  {
    id: "1",
    title: "Fabric Swap Titirangi",
    date: "March 28, 2026",
    time: "12:00 PM - 3:00 PM",
    location: "Titirangi Community House, Titirang, Auckland",
    description:
      "Donate what you can. Take what you need.\n\n Bring along fabric, yarn, haberdashery, patterns and sewing treasures you no longer need, and browse what others have shared in return",
    registerLink: "#",
    isUpcoming: true,
  },
  {
    id: "2",
    title: "Social Sewing Sessions",
    date: "TBC 2026",
    time: "1:00 PM - 4:00 PM",
    location: "Titirangi Community House, Titirang, Auckland",
    description:
      "A relaxed afternoon of sewing together. Bring your own projects or work on community mending tasks. All skill levels welcome.",
    registerLink: "#",
    isUpcoming: true,
  },
  {
    id: "3",
    title: "Fibre & Friends",
    date: "TBC 2026",
    time: "10:00 AM - 4:00 PM",
    location: "New Lynn Community Centre, Auckland",
    description:
      "Join us for Fibre & Friends, a full-day celebration of creativity, community, and conscious making. Bring along your own projects and connect with fellow makers across all skill levels and disciplines – whether you're into sewing, knitting, mending, embroidery, crochet, or just curious to learn. It's a chance to share ideas, pick up new skills, and be inspired by others in a relaxed, inclusive space. You'll find dedicated tables hosted by skilled creatives, a community upcycled haberdashery (koha-based), and plenty of tea, coffee, and good chats. This is a zero-waste-friendly, BYO lunch event with koha entry.",
    registerLink: "#",
    isUpcoming: true,
  },
];

export function getUpcomingEvents(): Event[] {
  return events.filter((event) => event.isUpcoming).slice(0, 3);
}

/**
 * Finds the next upcoming event with a parseable date
 * Returns the event ID if found, null otherwise
 */
export function getNextEventId(): string | null {
  const upcoming = events.filter((event) => event.isUpcoming);
  const now = new Date();

  // Try to parse dates and find the closest future event
  const eventsWithDates = upcoming
    .map((event) => {
      // Skip "TBC" dates
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

/**
 * Parses an event date string and returns a Date object
 * Returns null if the date cannot be parsed
 */
export function parseEventDate(dateString: string): Date | null {
  if (dateString.includes("TBC")) return null;

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parses an event date and time string, combining them into a Date object
 * Extracts the start time from time strings like "12:00 PM - 3:00 PM"
 * Returns null if the date or time cannot be parsed
 */
export function parseEventDateTime(dateString: string, timeString: string): Date | null {
  if (dateString.includes("TBC")) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  // Extract start time (everything before the dash or the whole string if no dash)
  const startTimeStr = timeString.split("-")[0].trim();

  // Try to parse the time (handles formats like "12:00 PM", "1:00 PM", "10:00 AM")
  const timeMatch = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return date; // If time parsing fails, return date only

  const [, hoursStr, minutesStr, period] = timeMatch;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  // Convert to 24-hour format
  if (period.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  // Set the time on the date
  const eventDateTime = new Date(date);
  eventDateTime.setHours(hours, minutes, 0, 0);

  return eventDateTime;
}

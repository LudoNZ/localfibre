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

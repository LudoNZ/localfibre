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
    title: "Fibre & Friends",
    date: "March 15, 2025",
    time: "10:00 AM - 4:00 PM",
    location: "Community Centre, Auckland",
    description:
      "Join us for Fibre & Friends, a full-day celebration of creativity, community, and conscious making. Bring along your own projects and connect with fellow makers across all skill levels and disciplines – whether you're into sewing, knitting, mending, embroidery, crochet, or just curious to learn. It's a chance to share ideas, pick up new skills, and be inspired by others in a relaxed, inclusive space. You'll find dedicated tables hosted by skilled creatives, a community upcycled haberdashery (koha-based), and plenty of tea, coffee, and good chats. This is a zero-waste-friendly, BYO lunch event with koha entry.",
    registerLink: "#",
    isUpcoming: true,
  },
  {
    id: "2",
    title: "Social Sewing Session",
    date: "March 22, 2025",
    time: "2:00 PM - 5:00 PM",
    location: "Workshop Space, Wellington",
    description:
      "A relaxed afternoon of sewing together. Bring your own projects or work on community mending tasks. All skill levels welcome.",
    registerLink: "#",
    isUpcoming: true,
  },
  {
    id: "3",
    title: "Mending Workshop: Visible Mends",
    date: "April 5, 2025",
    time: "10:00 AM - 12:00 PM",
    location: "Community Hub, Christchurch",
    description:
      "Learn the art of visible mending and transform your worn clothes into beautiful, unique pieces. We'll cover basic techniques and provide materials.",
    registerLink: "#",
    isUpcoming: true,
  },
];

export function getUpcomingEvents(): Event[] {
  return events.filter((event) => event.isUpcoming).slice(0, 3);
}


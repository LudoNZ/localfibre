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
    date: "March 28, 2025",
    time: "12:00 AM - 3:00 PM",
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


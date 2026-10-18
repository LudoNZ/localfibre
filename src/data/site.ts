// Editable site copy and photos. Change the text here and every page updates.

export const site = {
  name: "Local Fibre",
  email: "hello@localfibre.co.nz",
  instagram: "https://www.instagram.com/localfibre/",
  instagramHandle: "@localfibre",
  region: "West Auckland, Tāmaki Makaurau",
  tagline: "Community sewing, mending and machine repair in West Auckland.",
  mission:
    "Local Fibre is a community-driven creative initiative that brings together people who love to make, mend, and connect, and keeps textiles and sewing machines in use instead of in landfill.",
  // Shown on the About page and in the footer. Update if Local Fibre registers as a society or charity.
  orgStatus: "Local Fibre is a community group based in West Auckland, Tāmaki Makaurau.",
}

/**
 * Photos (save them in /public/images/photos/ and put the path here).
 * Any photo left as null shows a fabric-texture placeholder instead.
 */
export const photos: Record<string, string | null> = {
  hero1: null, // e.g. "/images/photos/hero-1.jpg" – people sewing together
  hero2: null, // e.g. "/images/photos/hero-2.jpg" – a repaired machine
  hero3: null, // e.g. "/images/photos/hero-3.jpg" – fabric / mending detail
  repair: null, // e.g. "/images/photos/repair-1.jpg" – a machine being serviced
  event: null, // e.g. "/images/photos/event-1.jpg" – a social sewing session
  founder: null, // e.g. "/images/photos/founder.jpg"
}

export interface TeamMember {
  name: string
  role: string
  bio: string
  photo: string | null
}

/**
 * TODO: add the people behind Local Fibre. Funders look for who runs a project.
 * The "Who we are" section on the About page stays hidden while this is empty.
 *
 * Example:
 * { name: "Your Name", role: "Founder & coordinator", bio: "A short paragraph…", photo: photos.founder },
 */
export const team: TeamMember[] = []

export const values = [
  {
    title: "Sustainability",
    text: "Promoting zero-waste practices, reuse, repair and mindful use of textile resources.",
  },
  {
    title: "Shared learning",
    text: "Welcoming spaces where everyone can learn, teach and grow together, whatever their skill level.",
  },
  {
    title: "Community",
    text: "Bringing people together through making, mending and conversation, right here in West Auckland.",
  },
]

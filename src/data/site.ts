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
 * Default photos. The easiest way to set these is the "Edit" button an admin
 * sees on each photo frame; uploaded photos take priority over these paths.
 * Leave as null to show the fabric-texture placeholder.
 */
export const photos: Record<string, string | null> = {
  hero1: null, // people sewing together
  hero2: null, // a repaired machine
  repair: null, // a machine being serviced
  event: null, // a social sewing session
  founder: null, // e.g. "/images/photos/founder.jpg" (used in `team` below)
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

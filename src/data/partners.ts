// Starting lists for the organisations shown on the site. They're copied into the
// database the first time the site needs them; after that admins edit them in the
// admin panel (Partners tab), and logos with the "Add logo" button on each badge.
// A path in `logo` (under /public) is used if nothing has been uploaded.

export interface Partner {
  name: string
  role?: string
  url?: string
  logo?: string
}

export const partners: Partner[] = [
  { name: "EcoMatters" },
  { name: "Waitākere Ranges Local Board" },
  { name: "West Auckland Resource Centre" },
]

// Organisations that have received sewing machines through the Repair Programme
export const machineRecipients: Partner[] = [
  { name: "Ethnic Women's Trust" },
  { name: "Pacific Vision Aotearoa" },
  { name: "New Windsor Community Hub" },
  { name: "Social Links" },
]

/** Stable id for an organisation, used to store its uploaded logo */
export const orgSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip macrons etc.
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

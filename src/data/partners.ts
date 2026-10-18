// Partners and supporters shown on the home and About pages.
// Logos are easiest to add with the "Add logo" button admins see on each badge;
// a path in `logo` (under /public) is used if nothing has been uploaded.
// `role` (e.g. "Funder") and `url` are optional.

export interface Partner {
  name: string
  role?: string
  url?: string
  logo?: string
}

export const partners: Partner[] = [
  { name: "EcoMatters" },
  { name: "Waitākere Ranges Local Board" },
  { name: "Tipping Point" },
  { name: "Local Making" },
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

/** Every organisation that can have a logo uploaded from the site */
export const isKnownOrgSlug = (slug: string) =>
  [...partners, ...machineRecipients].some((org) => orgSlug(org.name) === slug)

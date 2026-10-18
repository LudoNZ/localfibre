// Partners and supporters shown on the home and About pages.
// Add a logo by saving it in /public/images/partners/ and setting `logo`.
// `role` (e.g. "Funder", "Event venue") and `url` are optional.

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
export const machineRecipients: { name: string; url?: string }[] = [
  { name: "Ethnic Women's Trust" },
  { name: "Pacific Vision Aotearoa" },
  { name: "New Windsor Community Hub" },
  { name: "Social Links" },
]

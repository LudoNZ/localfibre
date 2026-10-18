// Partners, venues and supporters shown on the home and About pages.
// Add a logo by saving it in /public/images/partners/ and setting `logo`.

export interface Partner {
  name: string
  /** What they do with Local Fibre, e.g. "Event venue", "Funder" */
  role: string
  url?: string
  logo?: string
}

export const partners: Partner[] = [
  {
    name: "Titirangi Community House",
    role: "Event venue",
    // TODO: add their website as `url`, and confirm they're happy to be listed
  },
]

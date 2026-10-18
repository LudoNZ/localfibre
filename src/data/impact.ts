// Impact figures you track by hand. Leave a figure as null to hide it,
// so the site never shows a number you haven't measured.
// Machine and waiting-list numbers are counted live from the admin data.

export const manualImpact: {
  /** Total people who have come to Local Fibre events */
  eventAttendees: number | null
  /** Textiles kept out of landfill through mending and reuse, in kg */
  textilesDivertedKg: number | null
} = {
  eventAttendees: null,
  textilesDivertedKg: null,
}

// Machine donation offers from the public "Donate a machine" form. Safe to import in the browser.

export const DONATION_STATUSES = ["new", "contacted", "received", "declined"] as const

export type DonationStatus = (typeof DONATION_STATUSES)[number]

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  new: "New",
  contacted: "Contacted",
  received: "Received",
  declined: "Not taken",
}

export const DONATION_KINDS = ["Sewing machine", "Overlocker", "Other"] as const

export const WORKING_OPTIONS = {
  yes: "Yes, it works",
  unsure: "Not sure",
  no: "No, it needs repair",
} as const

export const HANDOVER_OPTIONS = {
  dropoff: "I can drop it off in West Auckland",
  collect: "I'd need it collected",
  unsure: "Not sure yet",
} as const

export type Working = keyof typeof WORKING_OPTIONS
export type Handover = keyof typeof HANDOVER_OPTIONS

export const MAX_DONATION_MACHINES = 20
export const MAX_DONATION_PHOTOS = 6

export interface DonationPhoto {
  path: string
  contentType: string
}

export interface MachineDonation {
  id: string
  name: string
  email: string
  phone: string
  suburb: string
  count: number
  kinds: string[]
  details: string
  working: Working
  handover: Handover
  notes: string
  photos: DonationPhoto[]
  status: DonationStatus
  adminNotes: string
  machineIds: string[]
  createdAt: string | null
}

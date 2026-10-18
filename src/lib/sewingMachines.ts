export const APPLICATION_STATUSES = ["waiting", "contacted", "collected", "cancelled"] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

// Applications with these statuses are still in the queue
export const OPEN_STATUSES: ApplicationStatus[] = ["waiting", "contacted"]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  waiting: "Waiting",
  contacted: "Contacted",
  collected: "Collected",
  cancelled: "Cancelled",
}

// ── Machine inventory ────────────────────────────────────────────────

export const MACHINE_STATUSES = ["servicing", "ready", "assigned", "repurposed"] as const

export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  servicing: "Being serviced",
  ready: "Ready to go",
  assigned: "Assigned",
  repurposed: "Repurposed",
}

export const MACHINE_CONDITIONS = ["Excellent", "Good", "Fair", "Needs work"] as const

export interface MachineRecipient {
  applicationId: string
  fullName: string
  email: string
  phone: string
  area: string
  groupName: string | null
}

export interface SewingMachine {
  id: string
  number: number
  brand: string
  model: string
  serialNumber: string
  condition: string
  accessories: string
  notes: string
  photos: string[]
  status: MachineStatus
  recipient: MachineRecipient | null
  createdAt: string | null
  assignedAt: string | null
  repurposedAt: string | null
}

// Fields an admin can edit directly on a machine
export const MACHINE_DETAIL_FIELDS = [
  "brand",
  "model",
  "serialNumber",
  "condition",
  "accessories",
  "notes",
] as const

export function machineLabel(machine: Pick<SewingMachine, "number" | "brand" | "model">) {
  return `#${machine.number} ${[machine.brand, machine.model].filter(Boolean).join(" ")}`.trim()
}

/** Pre-written "your sewing machine is ready" email, as a mailto: link */
export function machineReadyMailto(machine: SewingMachine, recipient: MachineRecipient) {
  const firstName = recipient.fullName.split(/\s+/)[0]
  const details = [
    `Machine: ${machineLabel(machine)}`,
    machine.condition && `Condition: ${machine.condition}`,
    machine.serialNumber && `Serial number: ${machine.serialNumber}`,
    machine.accessories && `Comes with: ${machine.accessories}`,
    machine.notes && `Notes: ${machine.notes}`,
  ].filter(Boolean)

  // Photo URLs are long and some mail apps truncate long mailto links
  const photos = machine.photos.length
    ? ["", "Photos:", ...machine.photos.slice(0, 3)]
    : []

  const body = [
    `Kia ora ${firstName},`,
    "",
    `Great news, your sewing machine${recipient.groupName ? ` for ${recipient.groupName}` : ""} is ready!`,
    "",
    ...details,
    ...photos,
    "",
    "Pickup is in West Auckland. Please reply to this email to arrange a time that suits you to collect it.",
    "",
    "Ngā mihi,",
    "Local Fibre",
  ].join("\n")

  const subject = "Your sewing machine is ready – Local Fibre"
  return `mailto:${recipient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

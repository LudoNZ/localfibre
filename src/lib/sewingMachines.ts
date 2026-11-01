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

export const MACHINE_STATUSES = ["incoming", "servicing", "ready", "repurposed"] as const

export type MachineStatus = (typeof MACHINE_STATUSES)[number]

// Statuses an admin can move a machine between before it's handed over
export const WORKSHOP_STATUSES = ["incoming", "servicing", "ready"] as const

export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number]

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  incoming: "Incoming",
  servicing: "Being serviced",
  ready: "Ready to go",
  repurposed: "Handed over",
}

export const MACHINE_CONDITION_LABELS: Record<number, string> = {
  1: "Needs major work",
  2: "Needs work",
  3: "Fair",
  4: "Good",
  5: "Like new",
}

export const isWorkshopStatus = (value: unknown): value is WorkshopStatus =>
  WORKSHOP_STATUSES.includes(value as WorkshopStatus)

export interface MachineRecipient {
  // null when the person was entered by hand rather than picked from the waiting list
  applicationId: string | null
  fullName: string
  email: string
  phone: string
  area: string
  groupName: string | null
}

export interface SewingMachine {
  id: string
  number: number
  typeId: string
  typeName: string
  brand: string
  model: string
  serialNumber: string
  condition: number | null
  comesWith: string[]
  notes: string
  photos: string[]
  status: MachineStatus
  recipient: MachineRecipient | null
  createdAt: string | null
  assignedAt: string | null
  repurposedAt: string | null
}

// Free-text fields an admin can edit directly on a machine
export const MACHINE_DETAIL_FIELDS = [
  "typeId",
  "typeName",
  "brand",
  "model",
  "serialNumber",
  "notes",
] as const

/** 1-5, or null for anything else */
export const parseCondition = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5 ? (value as number) : null

export const parseStringList = (value: unknown) =>
  Array.isArray(value)
    ? dedupe(value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean))
    : []

// ── Machine library (brands, models, types) ───────────────────────────

export interface MachineType {
  id: string
  name: string
  comesWith: string[]
  order: number
}

export interface MachineModel {
  name: string
  typeId: string
  // Comes-with items only this model has, on top of its type's list
  extras: string[]
}

export interface MachineBrand {
  id: string
  name: string
  models: MachineModel[]
}

export const DEFAULT_MACHINE_TYPES: Omit<MachineType, "id">[] = [
  { name: "Sewing machine", comesWith: ["Foot pedal", "Power cord", "Bobbins", "Cover"], order: 0 },
  { name: "Overlocker", comesWith: ["Foot pedal", "Power cord", "Cover", "Tweezers", "Thread nets"], order: 1 },
]

/** Drops repeats, ignoring case, keeping the first spelling */
export function dedupe(items: string[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The comes-with checklist for a type, plus any extras for that brand's model */
export function checklistFor(type: MachineType | undefined, model: MachineModel | undefined) {
  return dedupe([...(type?.comesWith ?? []), ...(model?.extras ?? [])])
}

export function machineLabel(machine: Pick<SewingMachine, "number" | "brand" | "model">) {
  return `#${machine.number} ${[machine.brand, machine.model].filter(Boolean).join(" ")}`.trim()
}

/** Pre-written "your sewing machine is ready" email, as a mailto: link */
export function machineReadyMailto(machine: SewingMachine, recipient: MachineRecipient) {
  const firstName = recipient.fullName.split(/\s+/)[0]
  const details = [
    `Machine: ${machineLabel(machine)}`,
    machine.condition && `Condition: ${machine.condition}/5 (${MACHINE_CONDITION_LABELS[machine.condition]})`,
    machine.serialNumber && `Serial number: ${machine.serialNumber}`,
    machine.comesWith?.length && `Comes with: ${machine.comesWith.join(", ")}`,
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

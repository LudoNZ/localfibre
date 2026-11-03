export const APPLICATION_STATUSES = ["waiting", "contacted", "collected", "cancelled"] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

// Applications with these statuses are still in the queue
export const OPEN_STATUSES: ApplicationStatus[] = ["waiting", "contacted"]

export const APPLICATION_AREAS = [
  "West Auckland",
  "Central Auckland",
  "North Shore",
  "East Auckland",
  "South Auckland",
  "Rodney / North of Auckland",
  "Franklin / South of Auckland",
  "Outside Auckland",
]

export const APPLICANT_TYPES = ["individual", "communityGroup"] as const

export type ApplicantType = (typeof APPLICANT_TYPES)[number]

// What someone can ask for. Individuals get one machine; organisations can ask for a mix.
export const REQUEST_KINDS = {
  sewingMachine: { one: "Sewing machine", many: "sewing machines" },
  overlocker: { one: "Overlocker", many: "overlockers" },
} as const

export type RequestKind = keyof typeof REQUEST_KINDS

export type MachineRequest = Record<RequestKind, number>

// Applications from before people could choose asked for one sewing machine
export const DEFAULT_REQUEST: MachineRequest = { sewingMachine: 1, overlocker: 0 }

export const MAX_REQUEST_PER_KIND = 10

export const requestTotal = (request: MachineRequest) =>
  Object.values(request).reduce((sum, n) => sum + n, 0)

/** e.g. "Overlocker" or "2 sewing machines + 1 overlocker" */
export function requestSummary(request: MachineRequest = DEFAULT_REQUEST) {
  const parts = (Object.keys(REQUEST_KINDS) as RequestKind[])
    .filter((kind) => request[kind] > 0)
    .map((kind) => ({ kind, n: request[kind] }))
  if (parts.length === 1 && parts[0].n === 1) return REQUEST_KINDS[parts[0].kind].one
  return parts
    .map(({ kind, n }) => `${n} ${n === 1 ? REQUEST_KINDS[kind].one.toLowerCase() : REQUEST_KINDS[kind].many}`)
    .join(" + ")
}

/** Check a request; returns an error message instead when it doesn't add up */
function parseMachineRequest(value: unknown, applicantType: ApplicantType): MachineRequest | string {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const request = Object.fromEntries(
    (Object.keys(REQUEST_KINDS) as RequestKind[]).map((kind) => {
      const n = Number(raw[kind] ?? 0)
      return [kind, Number.isInteger(n) ? n : -1]
    })
  ) as MachineRequest

  if (Object.values(request).some((n) => n < 0 || n > MAX_REQUEST_PER_KIND)) return "Invalid number of machines"
  const total = requestTotal(request)
  if (total === 0) return "Choose which machine you'd like"
  if (applicantType === "individual" && total > 1) return "Individuals can apply for one machine"
  return request
}

/** The contact details on a waiting-list application, as an admin can edit them */
export interface ApplicationDetails {
  applicantType: ApplicantType
  groupName: string | null
  fullName: string
  email: string
  phone: string
  area: string
  request: MachineRequest
}

/** Check and tidy application details; returns an error message instead when they don't add up */
export function parseApplicationDetails(body: Record<string, unknown>): ApplicationDetails | string {
  const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "")
  const applicantType = clean(body.applicantType) as ApplicantType
  const groupName = clean(body.groupName)
  const details = {
    applicantType,
    groupName: applicantType === "communityGroup" ? groupName : null,
    fullName: clean(body.fullName),
    email: clean(body.email),
    phone: clean(body.phone),
    area: clean(body.area),
  }

  if (!applicantType || !details.fullName || !details.email || !details.phone || !details.area) {
    return "All required fields must be filled in"
  }
  if (!APPLICANT_TYPES.includes(applicantType)) return "Invalid applicant type"
  if (applicantType === "communityGroup" && !groupName) return "Organisation name is required"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) return "Invalid email format"
  const request = parseMachineRequest(body.request, applicantType)
  if (typeof request === "string") return request
  return { ...details, request }
}

/** A machine promised to someone on the waiting list */
export interface AssignedMachine {
  id: string
  number: number
}

/** The fields an application has for its machines; older ones held a single machineId */
export interface ApplicationMachines {
  request?: MachineRequest
  machines?: AssignedMachine[]
  machineId?: string
  machineNumber?: number
}

export function assignedMachines(app: ApplicationMachines): AssignedMachine[] {
  if (Array.isArray(app.machines)) return app.machines
  return app.machineId ? [{ id: app.machineId, number: app.machineNumber ?? 0 }] : []
}

/** Machines still to find for this application */
export const machinesStillNeeded = (app: ApplicationMachines) =>
  Math.max(0, requestTotal(app.request ?? DEFAULT_REQUEST) - assignedMachines(app).length)

/** The details as first sent from the public form, kept even after an admin edits them */
export interface OriginalApplication extends Omit<ApplicationDetails, "request"> {
  request?: MachineRequest
  /** True when this copy was taken at the first edit, for applications sent before copies were kept */
  savedAtFirstEdit?: boolean
}

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
  repurposed: "Rehomed",
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

// ── Servicing ────────────────────────────────────────────────────────

export const SERVICE_PART_STATES = ["problem", "waiting", "fixed", "replaced"] as const

export type ServicePartState = (typeof SERVICE_PART_STATES)[number]

export const SERVICE_PART_STATE_LABELS: Record<ServicePartState, string> = {
  problem: "Problem found",
  waiting: "Waiting for part",
  fixed: "Fixed, no parts",
  replaced: "Replaced",
}

// A part flagged as faulty on one machine
export interface ServicePart {
  name: string
  state: ServicePartState
  note: string
}

// One line in a machine's service log, e.g. "fixed timing", with optional volunteer time
export interface ServiceNote {
  id: string
  date: string
  text: string
  volunteer: string
  hours: number | null
}

export const isAwaitingParts = (machine: Pick<SewingMachine, "serviceParts">) =>
  (machine.serviceParts || []).some((p) => p.state === "waiting")

/** Parts not yet sorted: still a problem or waiting for a part */
export const openServiceParts = (machine: Pick<SewingMachine, "serviceParts">) =>
  (machine.serviceParts || []).filter((p) => p.state === "problem" || p.state === "waiting")

export const serviceHours = (machine: Pick<SewingMachine, "serviceLog">) =>
  (machine.serviceLog || []).reduce((total, note) => total + (note.hours ?? 0), 0)

const text = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "")

export function parseServiceParts(value: unknown): ServicePart[] {
  if (!Array.isArray(value)) return []
  const parts = value
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      name: text(p.name, 100),
      state: SERVICE_PART_STATES.includes(p.state as ServicePartState) ? (p.state as ServicePartState) : "problem",
      note: text(p.note),
    }))
    .filter((p) => p.name)
  const names = dedupe(parts.map((p) => p.name))
  return names.map((name) => parts.find((p) => p.name === name)!)
}

export function parseServiceLog(value: unknown): ServiceNote[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => {
      const hours = typeof n.hours === "number" && isFinite(n.hours) && n.hours > 0 ? Math.round(n.hours * 100) / 100 : null
      return {
        id: text(n.id, 40) || Math.random().toString(36).slice(2, 10),
        date: /^\d{4}-\d{2}-\d{2}$/.test(text(n.date)) ? text(n.date) : new Date().toISOString().slice(0, 10),
        text: text(n.text, 1000),
        volunteer: text(n.volunteer, 100),
        hours,
      }
    })
    .filter((n) => n.text || n.hours)
}

/** Short summary for the card, e.g. "Replaced belt · fixed tension · 3.5 h" */
export function serviceSummary(machine: Pick<SewingMachine, "serviceParts" | "serviceLog">) {
  const parts = (machine.serviceParts || []).map((p) => {
    const verb = { problem: "problem:", waiting: "waiting for", fixed: "fixed", replaced: "replaced" }[p.state]
    return `${verb} ${p.name.toLowerCase()}`
  })
  const hours = serviceHours(machine)
  const summary = [...parts, hours ? `${hours} h` : ""].filter(Boolean).join(" · ")
  return summary ? summary[0].toUpperCase() + summary.slice(1) : ""
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
  serviceParts: ServicePart[]
  serviceLog: ServiceNote[]
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

// ── Dates ────────────────────────────────────────────────────────────

/**
 * A yyyy-mm-dd day as a stored date. Midnight UTC is midday in New Zealand,
 * so it shows as the same day there whatever the time of year.
 */
export function dayToDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return isNaN(date.getTime()) ? null : date
}

/** The local yyyy-mm-dd day of a stored date, for date inputs */
export const isoToDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "")

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
  // Parts that commonly need attention, offered when servicing
  serviceParts: string[]
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

const COMMON_SERVICE_PARTS = ["Belt", "Electric motor", "Motor brushes", "Foot controller", "Power cord", "Light"]

export const DEFAULT_SERVICE_PARTS: Record<string, string[]> = {
  "sewing machine": [
    ...COMMON_SERVICE_PARTS,
    "Bobbin case",
    "Hook/timing",
    "Tension",
    "Feed dogs",
    "Needle plate",
  ],
  overlocker: [...COMMON_SERVICE_PARTS, "Knives/blades", "Upper looper", "Lower looper", "Differential feed", "Tension"],
}

export const DEFAULT_MACHINE_TYPES: Omit<MachineType, "id">[] = [
  {
    name: "Sewing machine",
    comesWith: ["Foot pedal", "Power cord", "Bobbins", "Cover"],
    serviceParts: DEFAULT_SERVICE_PARTS["sewing machine"],
    order: 0,
  },
  {
    name: "Overlocker",
    comesWith: ["Foot pedal", "Power cord", "Cover", "Tweezers", "Thread nets"],
    serviceParts: DEFAULT_SERVICE_PARTS.overlocker,
    order: 1,
  },
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

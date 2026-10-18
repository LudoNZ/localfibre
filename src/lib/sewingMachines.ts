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

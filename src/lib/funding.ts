export const POOL_KINDS = ["grant", "personal", "donation", "other"] as const

export type PoolKind = (typeof POOL_KINDS)[number]

export const POOL_KIND_LABELS: Record<PoolKind, string> = {
  grant: "Grant",
  personal: "Personal contribution",
  donation: "Donation",
  other: "Other",
}

// Money set aside for servicing costs: a grant, a personal top-up, a donation...
export interface FundingPool {
  id: string
  name: string
  kind: PoolKind
  funder: string
  amount: number
  startDate: string
  endDate: string
  reference: string
  notes: string
  active: boolean
  spent: number
  remaining: number
}

export interface Receipt {
  path: string
  name: string
  contentType: string
}

export const PURCHASE_STATUSES = ["ordered", "received"] as const

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

export interface Purchase {
  id: string
  date: string
  description: string
  supplier: string
  // NZD, including GST
  amount: number
  poolId: string
  // "pool" when paid from the pool directly, otherwise the person who paid and is owed
  paidBy: string
  reimbursed: boolean
  reimbursedAt: string | null
  receipt: Receipt | null
  machineId: string | null
  machineNumber: number | null
  part: string
  status: PurchaseStatus
  receivedAt: string | null
  notes: string
  createdAt: string | null
}

export const isOwed = (p: Pick<Purchase, "paidBy" | "reimbursed">) => p.paidBy !== "pool" && !p.reimbursed

export const money = (amount: number) =>
  amount.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })

export const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** Whether a yyyy-mm-dd day falls within a pool's dates (open-ended when not set) */
export const inPoolPeriod = (pool: Pick<FundingPool, "startDate" | "endDate">, day: string | null) =>
  !!day && (!pool.startDate || day >= pool.startDate) && (!pool.endDate || day <= pool.endDate)

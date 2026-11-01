import { db } from "./firebaseAdmin"
import { POOL_KINDS, PURCHASE_STATUSES, PoolKind, PurchaseStatus, isDay } from "./funding"

const text = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "")
const amount = (value: unknown) =>
  typeof value === "number" && isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null

const toIso = (value: unknown) =>
  (value as { toDate?: () => Date } | null)?.toDate?.()?.toISOString() ?? null

/** Pool fields from a request body. Returns an error message instead when something's wrong. */
export function parsePool(body: Record<string, unknown>) {
  const name = text(body.name, 120)
  if (!name) return { error: "Give the pool a name" }
  const total = amount(body.amount)
  if (total === null) return { error: "Enter the pool amount" }
  const startDate = isDay(body.startDate) ? body.startDate : ""
  const endDate = isDay(body.endDate) ? body.endDate : ""
  if (startDate && endDate && endDate < startDate) return { error: "The end date is before the start date" }

  return {
    pool: {
      name,
      kind: (POOL_KINDS.includes(body.kind as PoolKind) ? body.kind : "grant") as PoolKind,
      funder: text(body.funder, 120),
      amount: total,
      startDate,
      endDate,
      reference: text(body.reference, 120),
      notes: text(body.notes, 2000),
      active: body.active !== false,
    },
  }
}

/** Purchase fields from a request body. Returns an error message instead when something's wrong. */
export async function parsePurchase(body: Record<string, unknown>) {
  const description = text(body.description, 200)
  if (!description) return { error: "Say what was bought" }
  const cost = amount(body.amount)
  if (cost === null) return { error: "Enter what it cost" }
  if (!isDay(body.date)) return { error: "Enter the purchase date" }
  const poolId = text(body.poolId, 60)
  if (!poolId || !(await db.collection("fundingPools").doc(poolId).get()).exists) {
    return { error: "Choose which funding pool pays for it" }
  }

  // Link to a machine, copying its number so the log reads well even if it's renamed
  let machineId: string | null = null
  let machineNumber: number | null = null
  if (text(body.machineId, 60)) {
    const machine = await db.collection("sewingMachines").doc(text(body.machineId, 60)).get()
    if (!machine.exists) return { error: "Machine not found" }
    machineId = machine.id
    machineNumber = machine.data()?.number ?? null
  }

  const receipt =
    body.receipt && typeof body.receipt === "object"
      ? (() => {
          const r = body.receipt as Record<string, unknown>
          const path = text(r.path, 300)
          return /^receipts\/[A-Za-z0-9_.-]+$/.test(path)
            ? { path, name: text(r.name, 200) || "Receipt", contentType: text(r.contentType, 100) }
            : null
        })()
      : null

  const paidBy = text(body.paidBy, 100) || "pool"
  const reimbursed = paidBy !== "pool" && body.reimbursed === true
  const status = (PURCHASE_STATUSES.includes(body.status as PurchaseStatus) ? body.status : "received") as PurchaseStatus

  return {
    purchase: {
      date: body.date as string,
      description,
      supplier: text(body.supplier, 120),
      amount: cost,
      poolId,
      paidBy,
      reimbursed,
      reimbursedAt: reimbursed ? (isDay(body.reimbursedAt) ? body.reimbursedAt : new Date().toISOString().slice(0, 10)) : null,
      receipt,
      machineId,
      machineNumber,
      part: machineId ? text(body.part, 100) : "",
      status,
      receivedAt: status === "received" ? (isDay(body.receivedAt) ? body.receivedAt : body.date) : null,
      notes: text(body.notes, 1000),
    },
  }
}

export function purchaseFromDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data()!
  return { id: doc.id, ...data, createdAt: toIso(data.createdAt), updatedAt: toIso(data.updatedAt) }
}

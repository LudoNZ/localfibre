import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { MACHINE_DETAIL_FIELDS, MachineStatus } from "@/lib/sewingMachines"

const toIso = (value: unknown) =>
  (value as { toDate?: () => Date } | null)?.toDate?.()?.toISOString() ?? null

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const snapshot = await db.collection("sewingMachines").orderBy("number", "desc").get()

    const machines = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        assignedAt: toIso(data.assignedAt),
        repurposedAt: toIso(data.repurposedAt),
      }
    })

    return NextResponse.json({ machines })
  } catch (error) {
    console.error("Error fetching sewing machines:", error)
    return NextResponse.json({ error: "Failed to fetch machines" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const details = Object.fromEntries(
      MACHINE_DETAIL_FIELDS.map((field) => [
        field,
        typeof body[field] === "string" ? body[field].trim() : "",
      ])
    )
    const photos = Array.isArray(body.photos)
      ? body.photos.filter((url: unknown) => typeof url === "string")
      : []
    const status: MachineStatus = body.status === "ready" ? "ready" : "servicing"

    if (!details.brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 })
    }

    // Give each machine a permanent log number (#1, #2, ...)
    const counterRef = db.collection("counters").doc("sewingMachines")
    const machineRef = db.collection("sewingMachines").doc()

    const number = await db.runTransaction(async (tx) => {
      const counter = await tx.get(counterRef)
      const next = (counter.data()?.lastNumber ?? 0) + 1
      tx.set(counterRef, { lastNumber: next }, { merge: true })
      tx.set(machineRef, {
        ...details,
        number: next,
        photos,
        status,
        recipient: null,
        assignedAt: null,
        repurposedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return next
    })

    return NextResponse.json({ success: true, id: machineRef.id, number })
  } catch (error) {
    console.error("Error creating sewing machine:", error)
    return NextResponse.json({ error: "Failed to add machine" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { bucket, db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { DONATION_STATUSES, DonationStatus } from "@/lib/donations"
import { sameName } from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

/** Update an offer's status and notes */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (DONATION_STATUSES.includes(body.status as DonationStatus)) updates.status = body.status
    if (typeof body.adminNotes === "string") updates.adminNotes = body.adminNotes.trim().slice(0, 2000)

    const ref = db.collection("machineDonations").doc(id)
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating donation:", error)
    return NextResponse.json({ error: "Failed to update donation" }, { status: 500 })
  }
}

/** Add the offered machines to the machine log as Incoming, linked back to this offer */
export async function POST(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const ref = db.collection("machineDonations").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    const donation = snap.data()!
    if ((donation.machineIds ?? []).length) {
      return NextResponse.json({ error: "These machines are already in the machine log" }, { status: 400 })
    }

    // Use the type they picked when there's only one, otherwise the first type
    const types = (await db.collection("machineTypes").orderBy("order").get()).docs
    const kinds: string[] = donation.kinds ?? []
    const type =
      (kinds.length === 1 && types.find((t) => sameName(t.data().name ?? "", kinds[0]))) || types[0]

    // Notes go in the recipient's email, so the donor's details stay on the donation (linked by donationId)
    const notes = [
      donation.details && `From the donor: ${donation.details}`,
      donation.count > 1 && `One of ${donation.count} machines donated together.`,
    ]
      .filter(Boolean)
      .join("\n")

    const counterRef = db.collection("counters").doc("sewingMachines")
    const machineIds: string[] = []
    const numbers: number[] = []
    for (let i = 0; i < donation.count; i++) {
      const machineRef = db.collection("sewingMachines").doc()
      const number = await db.runTransaction(async (tx) => {
        const counter = await tx.get(counterRef)
        const next = (counter.data()?.lastNumber ?? 0) + 1
        tx.set(counterRef, { lastNumber: next }, { merge: true })
        tx.set(machineRef, {
          typeId: type?.id ?? "",
          typeName: type?.data().name ?? "",
          brand: "",
          model: "",
          serialNumber: "",
          condition: null,
          comesWith: [],
          notes,
          photos: [],
          serviceParts: [],
          serviceLog: [],
          status: "incoming",
          recipient: null,
          assignedAt: null,
          repurposedAt: null,
          donationId: id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return next
      })
      machineIds.push(machineRef.id)
      numbers.push(number)
    }

    await ref.update({ machineIds, status: "received", updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true, numbers })
  } catch (error) {
    console.error("Error logging donated machines:", error)
    return NextResponse.json({ error: "Failed to add the machines" }, { status: 500 })
  }
}

/** Delete an offer and its photos */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const ref = db.collection("machineDonations").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    await ref.delete()
    await Promise.allSettled(
      (snap.data()!.photos ?? []).map((p: { path: string }) => bucket.file(p.path).delete({ ignoreNotFound: true }))
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting donation:", error)
    return NextResponse.json({ error: "Failed to delete donation" }, { status: 500 })
  }
}

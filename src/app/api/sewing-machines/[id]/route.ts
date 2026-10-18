import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { APPLICATION_STATUSES, ApplicationStatus } from "@/lib/sewingMachines"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const { status } = await request.json()

    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const appRef = db.collection("sewingMachineApplications").doc(id)
    const app = await appRef.get()

    // Applicants paired with a machine are managed from the Machines tab
    if (app.data()?.machineId) {
      return NextResponse.json(
        { error: "This person has a machine assigned. Update it from the Machines tab instead." },
        { status: 400 }
      )
    }

    await appRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id, status })
  } catch (error) {
    console.error("Error updating sewing machine application:", error)
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    )
  }
}

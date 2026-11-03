import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  assignedMachines,
  parseApplicationDetails,
  requestTotal,
} from "@/lib/sewingMachines"

/** Change an application's status, or correct its contact details */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()
    const appRef = db.collection("sewingMachineApplications").doc(id)
    const app = await appRef.get()
    if (!app.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (body.details) {
      const details = parseApplicationDetails(body.details)
      if (typeof details === "string") {
        return NextResponse.json({ error: details }, { status: 400 })
      }

      const current = app.data()!
      const assigned = assignedMachines(current)
      if (requestTotal(details.request) < assigned.length) {
        return NextResponse.json(
          {
            error: `${assigned.length} machines are already assigned to them. Unassign some from the Machines tab first.`,
          },
          { status: 400 }
        )
      }

      // Applications from before copies were kept: save what they said now, before changing it
      const original = current.original ?? {
        applicantType: current.applicantType,
        groupName: current.groupName ?? null,
        fullName: current.fullName,
        email: current.email,
        phone: current.phone,
        area: current.area,
        ...(current.request ? { request: current.request } : {}),
        savedAtFirstEdit: true,
      }

      const batch = db.batch()
      batch.update(appRef, {
        ...details,
        original,
        editedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Paired machines keep their own copy of the contact details, so correct those too
      const machines = await Promise.all(
        assigned.map(({ id: machineId }) => db.collection("sewingMachines").doc(machineId).get())
      )
      for (const machine of machines) {
        const recipient = machine.data()?.recipient
        if (recipient?.applicationId !== id) continue
        batch.update(machine.ref, {
          recipient: {
            ...recipient,
            fullName: details.fullName,
            email: details.email,
            phone: details.phone,
            area: details.area,
            groupName: details.groupName,
          },
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      await batch.commit()
      return NextResponse.json({ success: true, id, details, original })
    }

    const { status } = body
    if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Applicants paired with a machine are managed from the Machines tab
    if (assignedMachines(app.data()!).length) {
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

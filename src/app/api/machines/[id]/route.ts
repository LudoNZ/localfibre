import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import {
  MACHINE_DETAIL_FIELDS,
  MachineRecipient,
  OPEN_STATUSES,
  isWorkshopStatus,
  parseCondition,
  parseStringList,
} from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

// Thrown inside transactions to return a 400 with a readable message
class ActionError extends Error {}

/** Edit a machine's details and photos, or move it between incoming, servicing and ready */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    for (const field of MACHINE_DETAIL_FIELDS) {
      if (typeof body[field] === "string") updates[field] = body[field].trim()
    }
    if (Array.isArray(body.photos)) {
      updates.photos = body.photos.filter((url: unknown) => typeof url === "string")
    }
    if ("condition" in body) updates.condition = parseCondition(body.condition)
    if (Array.isArray(body.comesWith)) updates.comesWith = parseStringList(body.comesWith)
    if (updates.brand === "") {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 })
    }

    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machine = await tx.get(machineRef)
      if (!machine.exists) throw new ActionError("Machine not found")

      // Handed-over machines are part of the permanent log
      if (isWorkshopStatus(body.status)) {
        if (machine.data()?.status === "repurposed") {
          throw new ActionError("This machine has already been handed over")
        }
        updates.status = body.status
      }

      tx.update(machineRef, { ...updates, updatedAt: FieldValue.serverTimestamp() })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error updating sewing machine:", error)
    return NextResponse.json({ error: "Failed to update machine" }, { status: 500 })
  }
}

/** Pair a machine with someone (waiting list or entered by hand), undo that, or mark it handed over */
export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const { action, applicationId, manual } = await request.json()
    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machineSnap = await tx.get(machineRef)
      if (!machineSnap.exists) throw new ActionError("Machine not found")
      const machine = machineSnap.data()!
      const now = FieldValue.serverTimestamp()

      if (action === "assign") {
        // A machine can be promised to someone at any stage, even before it arrives
        if (machine.status === "repurposed") {
          throw new ActionError("This machine has already been handed over")
        }
        if (machine.recipient) throw new ActionError("Unassign this machine first")

        let recipient: MachineRecipient
        if (applicationId) {
          const appRef = db.collection("sewingMachineApplications").doc(applicationId)
          const appSnap = await tx.get(appRef)
          const app = appSnap.data()
          if (!app) throw new ActionError("Application not found")
          if (!OPEN_STATUSES.includes(app.status) || app.machineId) {
            throw new ActionError("This person is no longer waiting for a machine")
          }

          // Keep a copy of who received it so the log survives later edits
          recipient = {
            applicationId,
            fullName: app.fullName,
            email: app.email,
            phone: app.phone,
            area: app.area,
            groupName: app.groupName ?? null,
          }
          tx.update(appRef, {
            status: "contacted",
            machineId: id,
            machineNumber: machine.number,
            updatedAt: now,
          })
        } else {
          // Someone who isn't on the waiting list
          const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")
          recipient = {
            applicationId: null,
            fullName: text(manual?.fullName),
            email: text(manual?.email),
            phone: text(manual?.phone),
            area: text(manual?.area),
            groupName: text(manual?.groupName) || null,
          }
          if (!recipient.fullName) throw new ActionError("Enter the person's name")
          if (!recipient.email && !recipient.phone) {
            throw new ActionError("Enter a phone number or email so they can be contacted")
          }
        }

        tx.update(machineRef, { recipient, assignedAt: now, updatedAt: now })
      } else if (action === "unassign") {
        if (!machine.recipient) throw new ActionError("This machine isn't assigned")
        if (machine.status === "repurposed") {
          throw new ActionError("Handed-over machines keep their recipient on record")
        }

        tx.update(machineRef, { recipient: null, assignedAt: null, updatedAt: now })
        if (machine.recipient?.applicationId) {
          const appRef = db.collection("sewingMachineApplications").doc(machine.recipient.applicationId)
          tx.update(appRef, {
            status: "waiting",
            machineId: FieldValue.delete(),
            machineNumber: FieldValue.delete(),
            updatedAt: now,
          })
        }
      } else if (action === "repurposed") {
        if (!machine.recipient) {
          throw new ActionError("Assign this machine to someone before marking it handed over")
        }
        if (machine.status === "repurposed") throw new ActionError("Already handed over")

        tx.update(machineRef, { status: "repurposed", repurposedAt: now, updatedAt: now })
        if (machine.recipient?.applicationId) {
          const appRef = db.collection("sewingMachineApplications").doc(machine.recipient.applicationId)
          tx.update(appRef, { status: "collected", updatedAt: now })
        }
      } else {
        throw new ActionError("Unknown action")
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Error updating sewing machine:", error)
    return NextResponse.json({ error: "Failed to update machine" }, { status: 500 })
  }
}

/** Remove a machine that hasn't been handed over yet */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const machineRef = db.collection("sewingMachines").doc(id)
    const machine = await machineRef.get()

    if (!machine.exists) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 })
    }
    // Handed-over machines are part of the permanent log
    if (machine.data()?.status === "repurposed") {
      return NextResponse.json({ error: "Handed-over machines can't be deleted" }, { status: 400 })
    }

    // Free up the waiting-list person this machine was promised to
    const applicationId = machine.data()?.recipient?.applicationId
    const batch = db.batch()
    batch.delete(machineRef)
    if (applicationId) {
      batch.update(db.collection("sewingMachineApplications").doc(applicationId), {
        status: "waiting",
        machineId: FieldValue.delete(),
        machineNumber: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sewing machine:", error)
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 })
  }
}

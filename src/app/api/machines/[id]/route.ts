import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import {
  MACHINE_DETAIL_FIELDS,
  MachineRecipient,
  OPEN_STATUSES,
} from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

// Thrown inside transactions to return a 400 with a readable message
class ActionError extends Error {}

/** Edit a machine's details and photos, or move it between servicing and ready */
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
    if (updates.brand === "") {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 })
    }

    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machine = await tx.get(machineRef)
      if (!machine.exists) throw new ActionError("Machine not found")

      // Only unassigned machines can switch between servicing and ready
      if (body.status === "servicing" || body.status === "ready") {
        const current = machine.data()?.status
        if (current !== "servicing" && current !== "ready") {
          throw new ActionError("Unassign this machine before changing its status")
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

/** Pair a machine with an applicant, undo that, or mark it as handed over */
export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const { action, applicationId } = await request.json()
    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machineSnap = await tx.get(machineRef)
      if (!machineSnap.exists) throw new ActionError("Machine not found")
      const machine = machineSnap.data()!
      const now = FieldValue.serverTimestamp()

      if (action === "assign") {
        if (machine.status !== "ready") {
          throw new ActionError("Only machines that are ready to go can be assigned")
        }
        if (!applicationId) throw new ActionError("Choose someone from the waiting list")

        const appRef = db.collection("sewingMachineApplications").doc(applicationId)
        const appSnap = await tx.get(appRef)
        const app = appSnap.data()
        if (!app) throw new ActionError("Application not found")
        if (!OPEN_STATUSES.includes(app.status) || app.machineId) {
          throw new ActionError("This person is no longer waiting for a machine")
        }

        // Keep a copy of who received it so the log survives later edits
        const recipient: MachineRecipient = {
          applicationId,
          fullName: app.fullName,
          email: app.email,
          phone: app.phone,
          area: app.area,
          groupName: app.groupName ?? null,
        }

        tx.update(machineRef, { status: "assigned", recipient, assignedAt: now, updatedAt: now })
        tx.update(appRef, {
          status: "contacted",
          machineId: id,
          machineNumber: machine.number,
          updatedAt: now,
        })
      } else if (action === "unassign") {
        if (machine.status !== "assigned") throw new ActionError("This machine isn't assigned")

        tx.update(machineRef, { status: "ready", recipient: null, assignedAt: null, updatedAt: now })
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
        if (machine.status !== "assigned") {
          throw new ActionError("Assign this machine to someone before marking it handed over")
        }

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

/** Remove a machine that hasn't been given to anyone yet */
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
    // Assigned and repurposed machines are part of the permanent log
    if (!["servicing", "ready"].includes(machine.data()?.status)) {
      return NextResponse.json(
        { error: "Assigned or repurposed machines can't be deleted" },
        { status: 400 }
      )
    }

    await machineRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sewing machine:", error)
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 })
  }
}

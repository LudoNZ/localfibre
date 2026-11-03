import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import {
  MACHINE_DETAIL_FIELDS,
  MachineRecipient,
  OPEN_STATUSES,
  assignedMachines,
  dayToDate,
  machinesStillNeeded,
  isWorkshopStatus,
  parseCondition,
  parseServiceLog,
  parseServiceParts,
  parseStringList,
} from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

// Thrown inside transactions to return a 400 with a readable message
class ActionError extends Error {}

/** An application's update once this machine is no longer promised to them */
function releaseMachine(app: FirebaseFirestore.DocumentData, machineId: string) {
  const machines = assignedMachines(app).filter((m) => m.id !== machineId)
  return {
    machines,
    // Back in the queue as waiting once nothing is promised to them
    ...(machines.length === 0 && OPEN_STATUSES.includes(app.status) ? { status: "waiting" } : {}),
    machineId: FieldValue.delete(),
    machineNumber: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

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
    // The service record can still be filled in after servicing, until handover
    if (Array.isArray(body.serviceParts)) updates.serviceParts = parseServiceParts(body.serviceParts)
    if (Array.isArray(body.serviceLog)) updates.serviceLog = parseServiceLog(body.serviceLog)
    if (updates.brand === "") {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 })
    }

    // Dates can be corrected, e.g. when logging machines handed out in past years
    const dates: Record<string, Date> = {}
    for (const field of ["createdAt", "assignedAt", "repurposedAt"] as const) {
      if (body[field] === undefined) continue
      const date = dayToDate(body[field])
      if (!date) return NextResponse.json({ error: "Dates must be valid days" }, { status: 400 })
      if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        return NextResponse.json({ error: "Dates can't be in the future" }, { status: 400 })
      }
      dates[field] = date
    }

    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machine = await tx.get(machineRef)
      if (!machine.exists) throw new ActionError("Machine not found")

      if (
        machine.data()?.status === "repurposed" &&
        (updates.serviceParts || updates.serviceLog)
      ) {
        throw new ActionError("Rehomed machines keep their service record as it was")
      }

      const current = machine.data()!
      if (dates.assignedAt && !current.recipient) {
        throw new ActionError("Assign this machine before setting its assigned date")
      }
      if (dates.repurposedAt && current.status !== "repurposed") {
        throw new ActionError("Only rehomed machines have a rehomed date")
      }
      const received = dates.createdAt ?? current.createdAt?.toDate?.()
      const handedOver = dates.repurposedAt ?? current.repurposedAt?.toDate?.()
      if (received && handedOver && handedOver < received) {
        throw new ActionError("The rehomed date is before the machine was received")
      }
      Object.assign(updates, dates)

      // Rehomed machines are part of the permanent log
      if (isWorkshopStatus(body.status)) {
        if (machine.data()?.status === "repurposed") {
          throw new ActionError("This machine has already been rehomed")
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
    const { action, applicationId, manual, date } = await request.json()
    const machineRef = db.collection("sewingMachines").doc(id)

    await db.runTransaction(async (tx) => {
      const machineSnap = await tx.get(machineRef)
      if (!machineSnap.exists) throw new ActionError("Machine not found")
      const machine = machineSnap.data()!
      const now = FieldValue.serverTimestamp()

      if (action === "assign") {
        // A machine can be promised to someone at any stage, even before it arrives
        if (machine.status === "repurposed") {
          throw new ActionError("This machine has already been rehomed")
        }
        if (machine.recipient) throw new ActionError("Unassign this machine first")

        let recipient: MachineRecipient
        if (applicationId) {
          const appRef = db.collection("sewingMachineApplications").doc(applicationId)
          const appSnap = await tx.get(appRef)
          const app = appSnap.data()
          if (!app) throw new ActionError("Application not found")
          if (!OPEN_STATUSES.includes(app.status) || machinesStillNeeded(app) === 0) {
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
          // Organisations stay in the queue until every machine they asked for is assigned
          tx.update(appRef, {
            status: "contacted",
            machines: [...assignedMachines(app), { id, number: machine.number }],
            machineId: FieldValue.delete(),
            machineNumber: FieldValue.delete(),
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
          // Contact details are optional: older handovers may only have a name
          if (!recipient.fullName) throw new ActionError("Enter the person's name")
        }

        tx.update(machineRef, { recipient, assignedAt: now, updatedAt: now })
      } else if (action === "unassign") {
        if (!machine.recipient) throw new ActionError("This machine isn't assigned")
        if (machine.status === "repurposed") {
          throw new ActionError("Rehomed machines keep their recipient on record")
        }

        const appRef = machine.recipient?.applicationId
          ? db.collection("sewingMachineApplications").doc(machine.recipient.applicationId)
          : null
        const app = appRef ? (await tx.get(appRef)).data() : null

        tx.update(machineRef, { recipient: null, assignedAt: null, updatedAt: now })
        if (appRef && app) tx.update(appRef, releaseMachine(app, id))
      } else if (action === "repurposed") {
        if (!machine.recipient) {
          throw new ActionError("Assign this machine to someone before marking it rehomed")
        }
        if (machine.status === "repurposed") throw new ActionError("Already rehomed")

        // A past date when logging machines handed out before they were tracked here
        const handedOverAt = date ? dayToDate(date) : null
        if (date && !handedOverAt) throw new ActionError("Choose a valid rehoming date")
        if (handedOverAt && handedOverAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
          throw new ActionError("The rehoming date can't be in the future")
        }

        // Reads first: the application, and the other machines promised to them
        const appRef = machine.recipient?.applicationId
          ? db.collection("sewingMachineApplications").doc(machine.recipient.applicationId)
          : null
        const app = appRef ? (await tx.get(appRef)).data() : null
        const others = app ? assignedMachines(app).filter((m) => m.id !== id) : []
        const otherSnaps = await Promise.all(
          others.map((m) => tx.get(db.collection("sewingMachines").doc(m.id)))
        )

        tx.update(machineRef, { status: "repurposed", repurposedAt: handedOverAt ?? now, updatedAt: now })

        // Collected once every machine they asked for has been rehomed with them
        const allRehomed = otherSnaps.every((snap) => snap.data()?.status === "repurposed")
        if (appRef && app && machinesStillNeeded(app) === 0 && allRehomed) {
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
    // Rehomed machines are part of the permanent log
    if (machine.data()?.status === "repurposed") {
      return NextResponse.json({ error: "Rehomed machines can't be deleted" }, { status: 400 })
    }

    // Free up the waiting-list person this machine was promised to
    const applicationId = machine.data()?.recipient?.applicationId
    await db.runTransaction(async (tx) => {
      const appRef = applicationId ? db.collection("sewingMachineApplications").doc(applicationId) : null
      const app = appRef ? (await tx.get(appRef)).data() : null
      tx.delete(machineRef)
      if (appRef && app) tx.update(appRef, releaseMachine(app, id))
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sewing machine:", error)
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 })
  }
}

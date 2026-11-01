import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { ORG_GROUPS, parseUrl } from "@/lib/organisations"

type Params = { params: Promise<{ id: string }> }

const text = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "")

/** Edit an organisation, or move it up/down its list ({ move: "up" | "down" }) */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()
    const ref = db.collection("organisations").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: "Organisation not found" }, { status: 404 })

    if (body.move === "up" || body.move === "down") {
      // Renumber the group in order, swapping this one with its neighbour
      const group = await db.collection("organisations").where("group", "==", snap.data()!.group).get()
      const ordered = group.docs.sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
      const index = ordered.findIndex((d) => d.id === id)
      const swapWith = body.move === "up" ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= ordered.length) return NextResponse.json({ success: true })
      ;[ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]]
      const batch = db.batch()
      ordered.forEach((d, order) => batch.update(d.ref, { order }))
      await batch.commit()
      return NextResponse.json({ success: true })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.name === "string") {
      if (!text(body.name)) return NextResponse.json({ error: "Name is required" }, { status: 400 })
      updates.name = text(body.name)
    }
    if (typeof body.role === "string") updates.role = text(body.role, 80)
    if (typeof body.url === "string") {
      const url = parseUrl(body.url)
      if (url === null) return NextResponse.json({ error: "That website link doesn't look right" }, { status: 400 })
      updates.url = url
    }
    if (ORG_GROUPS.includes(body.group) && body.group !== snap.data()!.group) {
      // Moving lists puts it at the end of the other one
      const siblings = await db.collection("organisations").where("group", "==", body.group).get()
      updates.group = body.group
      updates.order = siblings.docs.reduce((max, d) => Math.max(max, (d.data().order ?? 0) + 1), 0)
    }

    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating organisation:", error)
    return NextResponse.json({ error: "Failed to update organisation" }, { status: 500 })
  }
}

/** Remove an organisation and its logo record. Returns the logo's storage paths for cleanup. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const ref = db.collection("organisations").doc(id)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: "Organisation not found" }, { status: 404 })

    const logoRef = db.collection("partnerLogos").doc(snap.data()!.logoKey)
    const logo = await logoRef.get()
    const batch = db.batch()
    batch.delete(ref)
    if (logo.exists) batch.delete(logoRef)
    await batch.commit()
    return NextResponse.json({ success: true, previousPaths: logo.data()?.paths ?? [] })
  } catch (error) {
    console.error("Error deleting organisation:", error)
    return NextResponse.json({ error: "Failed to delete organisation" }, { status: 500 })
  }
}

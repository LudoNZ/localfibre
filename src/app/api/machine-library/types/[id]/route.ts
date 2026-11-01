import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { parseStringList, sameName } from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

/** Rename a machine type and/or replace its comes-with or service parts list */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.name === "string") {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
      const types = await db.collection("machineTypes").get()
      if (types.docs.some((doc) => doc.id !== id && sameName(doc.data().name ?? "", name))) {
        return NextResponse.json({ error: `"${name}" is already a machine type` }, { status: 400 })
      }
      updates.name = name
    }
    if (Array.isArray(body.comesWith)) updates.comesWith = parseStringList(body.comesWith)
    if (Array.isArray(body.serviceParts)) updates.serviceParts = parseStringList(body.serviceParts)

    const ref = db.collection("machineTypes").doc(id)
    if (!(await ref.get()).exists) {
      return NextResponse.json({ error: "Machine type not found" }, { status: 404 })
    }
    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating machine type:", error)
    return NextResponse.json({ error: "Failed to update machine type" }, { status: 500 })
  }
}

/** Remove a machine type that no model in the library uses */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const brands = await db.collection("machineBrands").get()
    const inUse = brands.docs.flatMap((doc) =>
      (doc.data().models ?? [])
        .filter((m: { typeId?: string }) => m.typeId === id)
        .map((m: { name: string }) => `${doc.data().name} ${m.name}`)
    )
    if (inUse.length) {
      return NextResponse.json(
        { error: `Still used by ${inUse.slice(0, 3).join(", ")}${inUse.length > 3 ? "…" : ""}` },
        { status: 400 }
      )
    }

    await db.collection("machineTypes").doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting machine type:", error)
    return NextResponse.json({ error: "Failed to delete machine type" }, { status: 500 })
  }
}

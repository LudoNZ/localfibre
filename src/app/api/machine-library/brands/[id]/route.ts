import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { MachineModel, dedupe, parseStringList, sameName } from "@/lib/sewingMachines"

type Params = { params: Promise<{ id: string }> }

/**
 * Rename a brand, edit one of its models ({ renameModel: { from, to, typeId? } }), and/or
 * replace its list of models. Name and type changes also update machines already logged.
 */
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
      const brands = await db.collection("machineBrands").get()
      if (brands.docs.some((doc) => doc.id !== id && sameName(doc.data().name ?? "", name))) {
        return NextResponse.json({ error: `"${name}" is already in the library` }, { status: 400 })
      }
      updates.name = name
    }

    if (Array.isArray(body.models)) {
      const models: MachineModel[] = body.models
        .filter((m: unknown): m is Record<string, unknown> => !!m && typeof m === "object")
        .map((m: Record<string, unknown>) => ({
          name: typeof m.name === "string" ? m.name.trim() : "",
          typeId: typeof m.typeId === "string" ? m.typeId : "",
          extras: parseStringList(m.extras),
        }))
        .filter((m: MachineModel) => m.name)
      const names = models.map((m) => m.name)
      if (dedupe(names).length !== names.length) {
        return NextResponse.json({ error: "Each model name can only be listed once" }, { status: 400 })
      }
      updates.models = models
    }

    const ref = db.collection("machineBrands").doc(id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }
    const oldName: string = snap.data()?.name ?? ""
    const newName = (updates.name as string | undefined) ?? oldName

    let modelRename: { from: string; to: string; typeId: string | null } | null = null
    if (body.renameModel && typeof body.renameModel === "object") {
      const from = typeof body.renameModel.from === "string" ? body.renameModel.from : ""
      const to = typeof body.renameModel.to === "string" ? body.renameModel.to.trim() : ""
      const models: MachineModel[] = (updates.models as MachineModel[]) ?? snap.data()?.models ?? []
      if (!to) return NextResponse.json({ error: "Model name is required" }, { status: 400 })
      if (!models.some((m) => m.name === from)) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 })
      }
      if (models.some((m) => m.name !== from && sameName(m.name, to))) {
        return NextResponse.json({ error: `${oldName} already has a "${to}" model` }, { status: 400 })
      }
      let typeId: string | null = null
      if (typeof body.renameModel.typeId === "string") {
        typeId = body.renameModel.typeId
        if (typeId && !(await db.collection("machineTypes").doc(typeId).get()).exists) {
          return NextResponse.json({ error: "Machine type not found" }, { status: 400 })
        }
      }
      updates.models = models.map((m) =>
        m.name === from ? { ...m, name: to, ...(typeId !== null ? { typeId } : {}) } : m
      )
      modelRename = { from, to, typeId }
    }

    // Keep logged machines in step with the library so reports group them together
    const machines = db.collection("sewingMachines")
    const machineUpdates = new Map<string, Record<string, unknown>>()
    if (newName !== oldName) {
      const logged = await machines.where("brand", "==", oldName).get()
      logged.docs.forEach((doc) => machineUpdates.set(doc.id, { brand: newName }))
    }
    if (modelRename) {
      const changes: Record<string, unknown> = {}
      if (modelRename.from !== modelRename.to) changes.model = modelRename.to
      if (modelRename.typeId !== null) {
        const type = modelRename.typeId
          ? await db.collection("machineTypes").doc(modelRename.typeId).get()
          : null
        changes.typeId = modelRename.typeId
        changes.typeName = type?.data()?.name ?? ""
      }
      if (Object.keys(changes).length) {
        const logged = await machines
          .where("brand", "==", oldName)
          .where("model", "==", modelRename.from)
          .get()
        logged.docs.forEach((doc) =>
          machineUpdates.set(doc.id, { ...machineUpdates.get(doc.id), ...changes })
        )
      }
    }

    const batch = db.batch()
    batch.update(ref, { ...updates, updatedAt: FieldValue.serverTimestamp() })
    machineUpdates.forEach((changes, machineId) => batch.update(machines.doc(machineId), changes))
    await batch.commit()

    return NextResponse.json({ success: true, machinesUpdated: machineUpdates.size })
  } catch (error) {
    console.error("Error updating brand:", error)
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 })
  }
}

/** Remove a brand from the library. Machines already logged keep their brand name. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    await db.collection("machineBrands").doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting brand:", error)
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 })
  }
}

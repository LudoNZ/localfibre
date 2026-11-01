import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { MachineModel, dedupe, sameName } from "@/lib/sewingMachines"

/**
 * Take a comes-with item off a type's default list ({ typeId }) or a model's extras
 * ({ brandId, model }). Logged machines keep the item ticked either way. With
 * keepAs: "models", the item is added to the model of each machine that has it ticked,
 * so those models still offer it.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const item = typeof body.item === "string" ? body.item.trim() : ""
    if (!item) return NextResponse.json({ error: "Item is required" }, { status: 400 })

    const batch = db.batch()
    const now = FieldValue.serverTimestamp()
    const modelsUpdated: string[] = []

    if (typeof body.typeId === "string" && body.typeId) {
      const typeRef = db.collection("machineTypes").doc(body.typeId)
      const type = await typeRef.get()
      if (!type.exists) return NextResponse.json({ error: "Machine type not found" }, { status: 404 })
      const comesWith: string[] = type.data()?.comesWith ?? []
      batch.update(typeRef, { comesWith: comesWith.filter((c) => !sameName(c, item)), updatedAt: now })

      if (body.keepAs === "models") {
        const machines = await db.collection("sewingMachines").where("typeId", "==", body.typeId).get()
        const brands = await db.collection("machineBrands").get()

        // Brand doc -> its models with the item added where machines have it ticked
        const brandModels = new Map<string, MachineModel[]>()
        for (const doc of machines.docs) {
          const machine = doc.data()
          if (!machine.model || !(machine.comesWith ?? []).some((c: string) => sameName(c, item))) continue
          const brand = brands.docs.find((b) => sameName(b.data().name ?? "", machine.brand ?? ""))
          if (!brand) continue

          const models: MachineModel[] = brandModels.get(brand.id) ?? brand.data().models ?? []
          const existing = models.find((m) => sameName(m.name, machine.model))
          const next = existing
            ? models.map((m) => (m === existing ? { ...m, extras: dedupe([...m.extras, item]) } : m))
            : [...models, { name: machine.model, typeId: body.typeId, extras: [item] }]
          brandModels.set(brand.id, next)

          const label = `${brand.data().name} ${machine.model}`
          if (!modelsUpdated.includes(label)) modelsUpdated.push(label)
        }
        brandModels.forEach((models, brandId) =>
          batch.update(db.collection("machineBrands").doc(brandId), { models, updatedAt: now })
        )
      }
    } else if (typeof body.brandId === "string" && typeof body.model === "string") {
      const brandRef = db.collection("machineBrands").doc(body.brandId)
      const brand = await brandRef.get()
      if (!brand.exists) return NextResponse.json({ error: "Brand not found" }, { status: 404 })
      const models: MachineModel[] = brand.data()?.models ?? []
      if (!models.some((m) => m.name === body.model)) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 })
      }
      batch.update(brandRef, {
        models: models.map((m) =>
          m.name === body.model ? { ...m, extras: m.extras.filter((x) => !sameName(x, item)) } : m
        ),
        updatedAt: now,
      })
    } else {
      return NextResponse.json({ error: "Say which list to remove the item from" }, { status: 400 })
    }

    await batch.commit()
    return NextResponse.json({ success: true, modelsUpdated })
  } catch (error) {
    console.error("Error removing comes-with item:", error)
    return NextResponse.json({ error: "Failed to remove the item" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import {
  DEFAULT_MACHINE_TYPES,
  DEFAULT_SERVICE_PARTS,
  parseStringList,
  sameName,
} from "@/lib/sewingMachines"

/** Machine types (with their comes-with lists) and the brand/model library */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    let typeSnap = await db.collection("machineTypes").orderBy("order").get()

    // First visit: start with sewing machines and overlockers
    if (typeSnap.empty) {
      const batch = db.batch()
      for (const type of DEFAULT_MACHINE_TYPES) {
        batch.set(db.collection("machineTypes").doc(), {
          ...type,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()
      typeSnap = await db.collection("machineTypes").orderBy("order").get()
    }

    // Types made before servicing was added get a starting list of service parts
    const missingParts = typeSnap.docs.filter((doc) => !Array.isArray(doc.data().serviceParts))
    if (missingParts.length) {
      const batch = db.batch()
      for (const doc of missingParts) {
        const defaults = DEFAULT_SERVICE_PARTS[(doc.data().name ?? "").toLowerCase()] ?? []
        batch.update(doc.ref, { serviceParts: defaults })
      }
      await batch.commit()
      typeSnap = await db.collection("machineTypes").orderBy("order").get()
    }

    const brandSnap = await db.collection("machineBrands").orderBy("name").get()

    const types = typeSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        comesWith: data.comesWith ?? [],
        serviceParts: data.serviceParts ?? [],
        order: data.order ?? 0,
      }
    })
    const brands = brandSnap.docs.map((doc) => {
      const data = doc.data()
      return { id: doc.id, name: data.name, models: data.models ?? [] }
    })

    return NextResponse.json({ types, brands })
  } catch (error) {
    console.error("Error fetching machine library:", error)
    return NextResponse.json({ error: "Failed to load the machine library" }, { status: 500 })
  }
}

/** Add a brand ({ kind: "brand", name }) or a machine type ({ kind: "type", name, comesWith }) */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const collection = body.kind === "type" ? "machineTypes" : body.kind === "brand" ? "machineBrands" : null
    if (!collection) return NextResponse.json({ error: "Unknown kind" }, { status: 400 })

    const existing = await db.collection(collection).get()
    const duplicate = existing.docs.find((doc) => sameName(doc.data().name ?? "", name))
    if (duplicate) {
      return NextResponse.json({ error: `"${duplicate.data().name}" is already in the library` }, { status: 400 })
    }

    const data =
      collection === "machineTypes"
        ? {
            name,
            comesWith: parseStringList(body.comesWith),
            serviceParts: parseStringList(body.serviceParts),
            order: existing.size,
          }
        : { name, models: [] }
    const ref = await db.collection(collection).add({ ...data, createdAt: FieldValue.serverTimestamp() })

    return NextResponse.json({ success: true, item: { id: ref.id, ...data } })
  } catch (error) {
    console.error("Error adding to machine library:", error)
    return NextResponse.json({ error: "Failed to add to the library" }, { status: 500 })
  }
}

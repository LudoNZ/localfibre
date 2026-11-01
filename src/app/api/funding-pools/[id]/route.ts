import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { parsePool } from "@/lib/fundingServer"

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const parsed = parsePool(await request.json())
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const ref = db.collection("fundingPools").doc(id)
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Pool not found" }, { status: 404 })
    await ref.update({ ...parsed.pool, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating funding pool:", error)
    return NextResponse.json({ error: "Failed to update funding pool" }, { status: 500 })
  }
}

/** Only pools nothing has been bought from can be deleted; others can be marked inactive */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const used = await db.collection("purchases").where("poolId", "==", id).limit(1).get()
    if (!used.empty) {
      return NextResponse.json(
        { error: "Purchases are logged against this pool. Mark it inactive instead." },
        { status: 400 }
      )
    }
    await db.collection("fundingPools").doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting funding pool:", error)
    return NextResponse.json({ error: "Failed to delete funding pool" }, { status: 500 })
  }
}

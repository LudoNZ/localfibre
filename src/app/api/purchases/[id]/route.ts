import { NextRequest, NextResponse } from "next/server"
import { bucket, db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { parsePurchase } from "@/lib/fundingServer"

type Params = { params: Promise<{ id: string }> }

const deleteReceipt = (path: string | undefined) =>
  path ? bucket.file(path).delete({ ignoreNotFound: true }).catch((e) => console.error("Receipt delete failed:", e)) : null

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const parsed = await parsePurchase(await request.json())
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const ref = db.collection("purchases").doc(id)
    const existing = await ref.get()
    if (!existing.exists) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    await ref.update({ ...parsed.purchase, updatedAt: FieldValue.serverTimestamp() })

    // A replaced receipt isn't needed any more
    const oldPath = existing.data()?.receipt?.path
    if (oldPath && oldPath !== parsed.purchase.receipt?.path) await deleteReceipt(oldPath)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating purchase:", error)
    return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { id } = await params
    const ref = db.collection("purchases").doc(id)
    const existing = await ref.get()
    if (!existing.exists) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    await ref.delete()
    await deleteReceipt(existing.data()?.receipt?.path)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting purchase:", error)
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
  }
}

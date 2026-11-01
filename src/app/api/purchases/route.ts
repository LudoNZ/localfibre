import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { parsePurchase, purchaseFromDoc } from "@/lib/fundingServer"

/** All purchases, newest first, or just one machine's with ?machineId= */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const machineId = request.nextUrl.searchParams.get("machineId")
    const query = machineId
      ? db.collection("purchases").where("machineId", "==", machineId)
      : db.collection("purchases")
    const snapshot = await query.get()
    const purchases = snapshot.docs
      .map(purchaseFromDoc)
      .sort((a, b) => String((b as { date?: string }).date).localeCompare(String((a as { date?: string }).date)))
    return NextResponse.json({ purchases })
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return NextResponse.json({ error: "Failed to load purchases" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const parsed = await parsePurchase(await request.json())
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const ref = await db.collection("purchases").add({
      ...parsed.purchase,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error("Error creating purchase:", error)
    return NextResponse.json({ error: "Failed to log purchase" }, { status: 500 })
  }
}

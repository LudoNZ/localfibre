import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { parsePool } from "@/lib/fundingServer"

/** Funding pools with what's been spent from each */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const [pools, purchases] = await Promise.all([
      db.collection("fundingPools").orderBy("name").get(),
      db.collection("purchases").select("poolId", "amount").get(),
    ])

    const spent = new Map<string, number>()
    for (const doc of purchases.docs) {
      const { poolId, amount } = doc.data()
      spent.set(poolId, (spent.get(poolId) ?? 0) + (amount ?? 0))
    }

    return NextResponse.json({
      pools: pools.docs.map((doc) => {
        const data = doc.data()
        const used = Math.round((spent.get(doc.id) ?? 0) * 100) / 100
        return {
          id: doc.id,
          ...data,
          createdAt: undefined,
          updatedAt: undefined,
          spent: used,
          remaining: Math.round(((data.amount ?? 0) - used) * 100) / 100,
        }
      }),
    })
  } catch (error) {
    console.error("Error fetching funding pools:", error)
    return NextResponse.json({ error: "Failed to load funding pools" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const parsed = parsePool(await request.json())
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const ref = await db.collection("fundingPools").add({
      ...parsed.pool,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error("Error creating funding pool:", error)
    return NextResponse.json({ error: "Failed to add funding pool" }, { status: 500 })
  }
}

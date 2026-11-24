import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "@/lib/firebaseAdmin"
import { verifyAdmin } from "@/lib/adminAuth"
import { isBuiltInKind, parseRequestKinds } from "@/lib/requestOptions"
import { getRequestKinds, requestOptionsDoc, requestsForKind } from "@/lib/requestOptionsServer"

/** The kinds of machine on the waiting-list form (public: the form shows the same thing) */
export async function GET() {
  return NextResponse.json({ kinds: await getRequestKinds() })
}

/**
 * Save the list of kinds: add new ones, rename, reorder, and open, grey out or hide each.
 * A kind can only be dropped from the list if nobody has ever asked for it.
 */
export async function PUT(request: NextRequest) {
  const { uid, denied } = await verifyAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    if (!Array.isArray(body.kinds)) {
      return NextResponse.json({ error: "Send the list of machines" }, { status: 400 })
    }
    const kinds = parseRequestKinds(body.kinds)

    // Anything being removed must have no history; keep it (hide it) otherwise
    const current = await getRequestKinds()
    const removed = current.filter((old) => !isBuiltInKind(old.id) && !kinds.some((k) => k.id === old.id))
    for (const kind of removed) {
      const count = await requestsForKind(kind.id)
      if (count > 0) {
        return NextResponse.json(
          {
            error: `${count} ${count === 1 ? "request has" : "requests have"} asked for ${kind.many}, so it can't be deleted. Hide it instead.`,
          },
          { status: 400 }
        )
      }
    }

    await requestOptionsDoc().set({ kinds, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ kinds })
  } catch (error) {
    console.error("Error saving request options:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

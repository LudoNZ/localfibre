import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { isKnownOrgSlug } from "@/data/partners"
import { deleteStoredImage, saveStoredImage } from "@/lib/storedImages"

type Params = { params: Promise<{ slug: string }> }

/** Save an organisation's logo. Returns the previous logo's storage paths for cleanup. */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { slug } = await params
    if (!isKnownOrgSlug(slug)) {
      return NextResponse.json({ error: "Unknown organisation" }, { status: 400 })
    }
    return await saveStoredImage("partnerLogos", slug, await request.json(), `partnerLogos/${slug}`)
  } catch (error) {
    console.error("Error saving partner logo:", error)
    return NextResponse.json({ error: "Failed to save logo" }, { status: 500 })
  }
}

/** Remove an organisation's logo, so its name shows instead */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { slug } = await params
    if (!isKnownOrgSlug(slug)) {
      return NextResponse.json({ error: "Unknown organisation" }, { status: 400 })
    }
    return await deleteStoredImage("partnerLogos", slug)
  } catch (error) {
    console.error("Error removing partner logo:", error)
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 })
  }
}

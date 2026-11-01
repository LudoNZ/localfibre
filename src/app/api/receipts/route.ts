import { NextRequest, NextResponse } from "next/server"
import { bucket } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"

/**
 * Serve a private file to an admin: a receipt, or a photo sent with a donation offer.
 * Neither is readable from Storage directly.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const path = request.nextUrl.searchParams.get("path") || ""
  if (!/^(receipts|donations)\/[A-Za-z0-9_.-]+$/.test(path)) {
    return NextResponse.json({ error: "Invalid receipt" }, { status: 400 })
  }

  try {
    const file = bucket.file(path)
    const [exists] = await file.exists()
    if (!exists) return NextResponse.json({ error: "Receipt not found" }, { status: 404 })

    const [[metadata], [contents]] = await Promise.all([file.getMetadata(), file.download()])
    return new NextResponse(new Uint8Array(contents), {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("Error serving receipt:", error)
    return NextResponse.json({ error: "Failed to load receipt" }, { status: 500 })
  }
}

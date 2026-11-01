import { NextRequest, NextResponse } from "next/server"
import { getDownloadURL } from "firebase-admin/storage"
import { bucket } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"

// Vercel caps request bodies at 4.5 MB
const MAX_BYTES = 4 * 1024 * 1024

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const RECEIPT_TYPES = [...IMAGE_TYPES, "application/pdf"]

const safeName = (name: string) =>
  name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 60) || "file"

const extension = (file: File) =>
  file.type === "application/pdf" ? "pdf" : file.type.split("/")[1]?.replace("jpeg", "jpg") || "bin"

/**
 * Admin uploads that go through the server, so they don't depend on the Storage rules.
 * kind=machinePhoto: public machine photo, returns its URL.
 * kind=receipt: private proof of purchase, returns its storage path (served by /api/receipts).
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const form = await request.formData()
    const kind = form.get("kind")
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "That file is over 4 MB. Try a smaller photo or PDF." }, { status: 400 })
    }

    const allowed = kind === "receipt" ? RECEIPT_TYPES : kind === "machinePhoto" ? IMAGE_TYPES : null
    if (!allowed) return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 })
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: kind === "receipt" ? "Receipts must be a photo or PDF" : "Photos must be an image" },
        { status: 400 }
      )
    }

    const folder = kind === "receipt" ? "receipts" : "sewingMachines"
    const path = `${folder}/${Date.now()}-${safeName(file.name)}.${extension(file)}`
    const stored = bucket.file(path)
    await stored.save(Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      metadata: {
        cacheControl: kind === "receipt" ? "private, no-store" : "public, max-age=31536000, immutable",
      },
    })

    if (kind === "receipt") {
      return NextResponse.json({ success: true, receipt: { path, name: file.name, contentType: file.type } })
    }
    return NextResponse.json({ success: true, url: await getDownloadURL(stored), path })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

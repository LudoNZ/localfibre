import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { isPhotoSlot } from "@/lib/sitePhotoSlots"

type Params = { params: Promise<{ slot: string }> }

// Only accept images uploaded to this project's Firebase Storage bucket
const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const isOurStorageUrl = (url: unknown) =>
  typeof url === "string" &&
  url.startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/sitePhotos%2F`)

/** Save the photo for a slot. Returns the previous photo's storage paths for cleanup. */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { slot } = await params
    if (!isPhotoSlot(slot)) {
      return NextResponse.json({ error: "Unknown photo slot" }, { status: 400 })
    }

    const { src, srcSet, width, height, alt, paths } = await request.json()
    const srcSetUrls = typeof srcSet === "string" ? srcSet.split(",").map((s) => s.trim().split(" ")[0]) : []

    if (!isOurStorageUrl(src) || !srcSetUrls.every(isOurStorageUrl)) {
      return NextResponse.json({ error: "Invalid photo URL" }, { status: 400 })
    }

    const ref = db.collection("sitePhotos").doc(slot)
    const previous = await ref.get()

    await ref.set({
      src,
      srcSet: srcSet ?? null,
      width: Number(width) || null,
      height: Number(height) || null,
      alt: typeof alt === "string" ? alt.trim().slice(0, 300) : "",
      paths: Array.isArray(paths) ? paths.filter((p: unknown) => typeof p === "string") : [],
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, previousPaths: previous.data()?.paths ?? [] })
  } catch (error) {
    console.error("Error saving site photo:", error)
    return NextResponse.json({ error: "Failed to save photo" }, { status: 500 })
  }
}

/** Remove the uploaded photo, so the slot falls back to its default */
export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { slot } = await params
    if (!isPhotoSlot(slot)) {
      return NextResponse.json({ error: "Unknown photo slot" }, { status: 400 })
    }

    const ref = db.collection("sitePhotos").doc(slot)
    const previous = await ref.get()
    await ref.delete()

    return NextResponse.json({ success: true, previousPaths: previous.data()?.paths ?? [] })
  } catch (error) {
    console.error("Error removing site photo:", error)
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { isPhotoSlot } from "@/lib/sitePhotoSlots"
import { deleteStoredImage, saveStoredImage } from "@/lib/storedImages"

type Params = { params: Promise<{ slot: string }> }

/** Save the photo for a slot. Returns the previous photo's storage paths for cleanup. */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const { slot } = await params
    if (!isPhotoSlot(slot)) {
      return NextResponse.json({ error: "Unknown photo slot" }, { status: 400 })
    }
    return await saveStoredImage("sitePhotos", slot, await request.json(), `sitePhotos/${slot}`)
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
    return await deleteStoredImage("sitePhotos", slot)
  } catch (error) {
    console.error("Error removing site photo:", error)
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 })
  }
}

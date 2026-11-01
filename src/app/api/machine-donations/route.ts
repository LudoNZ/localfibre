import { after, NextRequest, NextResponse } from "next/server"
import { bucket, db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { notifyAdmins } from "@/lib/pushNotifications"
import {
  DONATION_KINDS,
  HANDOVER_OPTIONS,
  MAX_DONATION_MACHINES,
  MAX_DONATION_PHOTOS,
  WORKING_OPTIONS,
} from "@/lib/donations"

// Vercel caps request bodies at 4.5 MB; the form shrinks photos well under this
const MAX_TOTAL_BYTES = 4.3 * 1024 * 1024
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

const toIso = (value: unknown) =>
  (value as { toDate?: () => Date } | null)?.toDate?.()?.toISOString() ?? null

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const snapshot = await db.collection("machineDonations").orderBy("createdAt", "desc").get()
    return NextResponse.json({
      donations: snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: toIso(doc.data().createdAt),
        updatedAt: toIso(doc.data().updatedAt),
      })),
    })
  } catch (error) {
    console.error("Error fetching machine donations:", error)
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 })
  }
}

/** Public: someone offering one or more machines, with at least one photo */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const text = (key: string, max = 200) => {
      const value = form.get(key)
      return typeof value === "string" ? value.trim().slice(0, max) : ""
    }

    // Bots fill in every field, including this hidden one
    if (text("website")) return NextResponse.json({ success: true })

    const name = text("name", 120)
    const email = text("email", 200)
    const phone = text("phone", 40)
    const suburb = text("suburb", 120)
    const count = Number(text("count"))
    const kinds = form
      .getAll("kinds")
      .filter((k): k is string => typeof k === "string" && (DONATION_KINDS as readonly string[]).includes(k))
    const working = text("working") in WORKING_OPTIONS ? text("working") : "unsure"
    const handover = text("handover") in HANDOVER_OPTIONS ? text("handover") : "unsure"
    const photos = form.getAll("photos").filter((p): p is File => p instanceof File && p.size > 0)

    if (!name || !email || !suburb) {
      return NextResponse.json({ error: "Please fill in your name, email and suburb" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please check your email address" }, { status: 400 })
    }
    if (!Number.isInteger(count) || count < 1 || count > MAX_DONATION_MACHINES) {
      return NextResponse.json(
        { error: `Number of machines must be between 1 and ${MAX_DONATION_MACHINES}` },
        { status: 400 }
      )
    }
    if (photos.length === 0) {
      return NextResponse.json({ error: "Please add at least one photo of the machine" }, { status: 400 })
    }
    if (photos.length > MAX_DONATION_PHOTOS) {
      return NextResponse.json({ error: `Please add up to ${MAX_DONATION_PHOTOS} photos` }, { status: 400 })
    }
    if (photos.some((p) => !IMAGE_TYPES.includes(p.type))) {
      return NextResponse.json({ error: "Photos must be images (JPG, PNG or HEIC)" }, { status: 400 })
    }
    if (photos.reduce((total, p) => total + p.size, 0) > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: "Those photos are too large. Try fewer or smaller photos." }, { status: 400 })
    }

    // Private: only admins can see these, through /api/receipts
    const stamp = Date.now()
    const stored = await Promise.all(
      photos.map(async (photo, i) => {
        const ext = photo.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"
        const path = `donations/${stamp}-${Math.random().toString(36).slice(2, 8)}-${i + 1}.${ext}`
        await bucket.file(path).save(Buffer.from(await photo.arrayBuffer()), {
          contentType: photo.type,
          metadata: { cacheControl: "private, no-store" },
        })
        return { path, contentType: photo.type }
      })
    )

    await db.collection("machineDonations").add({
      name,
      email,
      phone,
      suburb,
      count,
      kinds,
      details: text("details", 2000),
      working,
      handover,
      notes: text("notes", 2000),
      photos: stored,
      status: "new",
      adminNotes: "",
      machineIds: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    after(() =>
      notifyAdmins({
        title: count > 1 ? `${count} machines offered` : "Machine offered",
        body: `${name}, ${suburb}`,
        url: "/admin?tab=donations",
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Machine donation error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}

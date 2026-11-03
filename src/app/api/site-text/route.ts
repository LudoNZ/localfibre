import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { verifyAdmin } from "@/lib/adminAuth"
import { isTextKey, MAX_TEXT_LENGTH, TEXT_SLOTS } from "@/lib/siteTextSlots"

/** Change one piece of page text. Empty text, or the original wording, goes back to the default. */
export async function PUT(request: NextRequest) {
  const { uid, denied } = await verifyAdmin(request)
  if (denied) return denied

  try {
    const { key, text } = await request.json()
    if (typeof key !== "string" || !isTextKey(key)) {
      return NextResponse.json({ error: "Unknown text" }, { status: 400 })
    }
    if (typeof text !== "string") {
      return NextResponse.json({ error: "Enter some text" }, { status: 400 })
    }

    // Tidy line endings and stray spaces, keeping blank lines between paragraphs
    const value = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    if (value.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Keep it under ${MAX_TEXT_LENGTH} characters` }, { status: 400 })
    }

    const ref = db.collection("siteText").doc(key)
    if (!value || value === TEXT_SLOTS[key].text) {
      await ref.delete()
      return NextResponse.json({ text: TEXT_SLOTS[key].text, isDefault: true })
    }

    await ref.set({ text: value, updatedBy: uid, updatedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ text: value, isDefault: false })
  } catch (error) {
    console.error("Error saving site text:", error)
    return NextResponse.json({ error: "Failed to save text" }, { status: 500 })
  }
}

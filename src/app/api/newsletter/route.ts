import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"

export async function GET() {
  try {
    const snapshot = await db
      .collection("newsletterSubscriptions")
      .orderBy("createdAt", "desc")
      .get()

    const subscribers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))

    return NextResponse.json({ subscribers })
  } catch (error) {
    console.error("Error fetching subscribers:", error)
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check for existing subscription
    const existing = await db
      .collection("newsletterSubscriptions")
      .where("email", "==", email)
      .limit(1)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ message: "Already subscribed" }, { status: 200 })
    }

    await db.collection("newsletterSubscriptions").add({
      email,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 200 })
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

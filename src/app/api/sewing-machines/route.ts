import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"

const APPLICANT_TYPES = ["individual", "communityGroup"]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicantType, groupName, fullName, email, phone, area } = body

    // Validate required fields
    if (!applicantType || !fullName || !email || !phone || !area) {
      return NextResponse.json(
        { error: "All required fields must be filled in" },
        { status: 400 }
      )
    }

    if (!APPLICANT_TYPES.includes(applicantType)) {
      return NextResponse.json(
        { error: "Invalid applicant type" },
        { status: 400 }
      )
    }

    if (applicantType === "communityGroup" && !groupName) {
      return NextResponse.json(
        { error: "Community group name is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    await db.collection("sewingMachineApplications").add({
      applicantType,
      groupName: applicantType === "communityGroup" ? groupName : null,
      fullName,
      email,
      phone,
      area,
      status: "waiting",
      createdAt: FieldValue.serverTimestamp(),
    })

    // Queue position = number of applications still waiting, including this one
    const waiting = await db
      .collection("sewingMachineApplications")
      .where("status", "==", "waiting")
      .count()
      .get()

    return NextResponse.json(
      { message: "Application received", queuePosition: waiting.data().count },
      { status: 200 }
    )
  } catch (error) {
    console.error("Sewing machine application error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

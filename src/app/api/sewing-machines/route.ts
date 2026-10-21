import { after, NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { notifyAdmins } from "@/lib/pushNotifications"
import { requireAdmin } from "@/lib/adminAuth"
import { OPEN_STATUSES } from "@/lib/sewingMachines"

const APPLICANT_TYPES = ["individual", "communityGroup"]

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const snapshot = await db
      .collection("sewingMachineApplications")
      .orderBy("createdAt", "asc")
      .get()

    const applications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }))

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching sewing machine applications:", error)
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "")
    const applicantType = clean(body.applicantType)
    const groupName = clean(body.groupName)
    const fullName = clean(body.fullName)
    const email = clean(body.email)
    const phone = clean(body.phone)
    const area = clean(body.area)

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
        { error: "Organisation name is required" },
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

    // Queue position = number of applications still in the queue, including this one
    const open = await db
      .collection("sewingMachineApplications")
      .where("status", "in", OPEN_STATUSES)
      .count()
      .get()

    after(() =>
      notifyAdmins({
        title: "New sewing machine request",
        body: `${applicantType === "communityGroup" ? `${groupName} (${fullName})` : fullName}, ${area}`,
        url: "/admin?tab=sewing",
      })
    )

    return NextResponse.json(
      { message: "Application received", queuePosition: open.data().count },
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

import { after, NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { notifyAdmins } from "@/lib/pushNotifications"
import { requireAdmin } from "@/lib/adminAuth"
import { OPEN_STATUSES, parseApplicationDetails, requestSummary } from "@/lib/sewingMachines"

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
    const details = parseApplicationDetails(await request.json())
    if (typeof details === "string") {
      return NextResponse.json({ error: details }, { status: 400 })
    }

    await db.collection("sewingMachineApplications").add({
      ...details,
      // Exactly what they sent, kept even if an admin later corrects the details above
      original: details,
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
        body: `${details.groupName ? `${details.groupName} (${details.fullName})` : details.fullName}, ${details.area}: ${requestSummary(details.request)}`,
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

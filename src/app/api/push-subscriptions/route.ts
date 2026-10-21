import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "@/lib/firebaseAdmin"
import { verifyAdmin } from "@/lib/adminAuth"
import { subscriptionId, subscriptions } from "@/lib/pushNotifications"

const isSubscription = (value: unknown): value is { endpoint: string; keys: { p256dh: string; auth: string } } => {
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  return (
    typeof sub?.endpoint === "string" &&
    sub.endpoint.startsWith("https://") &&
    typeof sub.keys?.p256dh === "string" &&
    typeof sub.keys?.auth === "string"
  )
}

// Save this device's push subscription for the signed-in admin
export async function POST(request: NextRequest) {
  const { uid, denied } = await verifyAdmin(request)
  if (denied) return denied

  try {
    const { subscription } = await request.json()
    if (!isSubscription(subscription)) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    await subscriptions.doc(subscriptionId(subscription.endpoint)).set({
      uid,
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

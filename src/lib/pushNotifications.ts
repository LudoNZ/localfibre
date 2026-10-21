import { createHash } from "crypto"
import webpush, { PushSubscription, WebPushError } from "web-push"
import { db } from "@/lib/firebaseAdmin"

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject = process.env.VAPID_SUBJECT || "mailto:hello@localfibre.co.nz"

const configured = Boolean(publicKey && privateKey)
if (configured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!)
}

export const subscriptions = db.collection("pushSubscriptions")

// One document per device, keyed by its push endpoint so re-subscribing just overwrites
export const subscriptionId = (endpoint: string) =>
  createHash("sha256").update(endpoint).digest("hex")

export interface AdminNotification {
  title: string
  body: string
  // Page to open when the notification is tapped
  url: string
}

/**
 * Sends a push notification to every device a current admin has turned
 * notifications on for. Never throws: a failed notification shouldn't fail
 * the request that triggered it.
 */
export async function notifyAdmins(notification: AdminNotification) {
  if (!configured) return

  try {
    const admins = await db.collection("users").where("role", "==", "admin").get()
    const adminUids = new Set(admins.docs.map((doc) => doc.id))
    const snapshot = await subscriptions.get()
    const payload = JSON.stringify(notification)

    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const { uid, subscription } = doc.data() as { uid: string; subscription: PushSubscription }

        // Someone who's no longer an admin stops getting notified
        if (!adminUids.has(uid)) {
          await doc.ref.delete()
          return
        }

        try {
          await webpush.sendNotification(subscription, payload, { TTL: 24 * 60 * 60 })
        } catch (error) {
          // 404/410 means the device unsubscribed or the subscription expired
          const status = (error as WebPushError).statusCode
          if (status === 404 || status === 410) {
            await doc.ref.delete()
          } else {
            console.error("Push notification failed:", error)
          }
        }
      })
    )
  } catch (error) {
    console.error("Error notifying admins:", error)
  }
}

import { NextRequest, NextResponse } from "next/server"
import admin from "firebase-admin"
import { db } from "@/lib/firebaseAdmin"

/**
 * Verifies the request carries a Firebase ID token for a user with the
 * "admin" role. Returns the admin's uid, or an error response to send back.
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<{ uid: string; denied?: never } | { uid?: never; denied: NextResponse }> {
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null

  if (!token) {
    return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const userDoc = await db.collection("users").doc(decoded.uid).get()
    if (userDoc.data()?.role !== "admin") {
      return { denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
    }
    return { uid: decoded.uid }
  } catch {
    return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
}

/**
 * Verifies the request comes from an admin. Returns an error response to
 * send back, or null if allowed.
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const { denied } = await verifyAdmin(request)
  return denied ?? null
}

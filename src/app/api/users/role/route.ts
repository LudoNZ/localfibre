import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { uid, role, adminSecret } = await request.json();

    // Simple secret check - in production, verify the requesting user is an admin
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!uid || !role) {
      return NextResponse.json(
        { error: "Missing uid or role" },
        { status: 400 }
      );
    }

    if (!["admin", "general"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'general'" },
        { status: 400 }
      );
    }

    // Set user role in Firestore
    await db.collection("users").doc(uid).set(
      { role },
      { merge: true }
    );

    return NextResponse.json({ success: true, uid, role });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { error: "Failed to set user role" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { db } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    // Get all users from Firebase Auth
    const listUsersResult = await admin.auth().listUsers(100);

    // Get roles from Firestore
    const usersSnapshot = await db.collection("users").get();
    const rolesMap: Record<string, string> = {};
    usersSnapshot.forEach((doc) => {
      rolesMap[doc.id] = doc.data().role || "general";
    });

    const users = listUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: rolesMap[user.uid] || "general",
      createdAt: user.metadata.creationTime,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, displayName, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined,
    });

    // Set role in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      role: role || "general",
      email,
      displayName: displayName || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: role || "general",
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

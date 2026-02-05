import { NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const locationsSnapshot = await db.collection("locations").orderBy("name").get();

    const locations: { id: string; name: string }[] = [];
    locationsSnapshot.forEach((doc) => {
      locations.push({
        id: doc.id,
        name: doc.data().name,
      });
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error listing locations:", error);
    return NextResponse.json(
      { error: "Failed to list locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const docRef = await db.collection("locations").add({
      name: name.trim(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      location: {
        id: docRef.id,
        name: name.trim(),
      },
    });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";

export interface EventData {
  id?: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  registerLink?: string;
  isUpcoming: boolean;
}

export async function GET() {
  try {
    const eventsSnapshot = await db.collection("events").orderBy("createdAt", "desc").get();

    const events: EventData[] = [];
    eventsSnapshot.forEach((doc) => {
      events.push({
        id: doc.id,
        ...doc.data(),
      } as EventData);
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error listing events:", error);
    return NextResponse.json(
      { error: "Failed to list events" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const eventData: EventData = await request.json();

    if (!eventData.title || !eventData.date) {
      return NextResponse.json(
        { error: "Title and date are required" },
        { status: 400 }
      );
    }

    const docRef = await db.collection("events").add({
      ...eventData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      event: {
        id: docRef.id,
        ...eventData,
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

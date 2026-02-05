import { NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";

export interface PatternData {
  id?: string;
  title: string;
  description: string;
  image: string;
  pdfUrl: string;
}

export async function GET() {
  try {
    const patternsSnapshot = await db.collection("patterns").orderBy("createdAt", "desc").get();

    const patterns: PatternData[] = [];
    patternsSnapshot.forEach((doc) => {
      patterns.push({
        id: doc.id,
        ...doc.data(),
      } as PatternData);
    });

    return NextResponse.json({ patterns });
  } catch (error) {
    console.error("Error listing patterns:", error);
    return NextResponse.json(
      { error: "Failed to list patterns" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const patternData: PatternData = await request.json();

    if (!patternData.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const docRef = await db.collection("patterns").add({
      ...patternData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      pattern: {
        id: docRef.id,
        ...patternData,
      },
    });
  } catch (error) {
    console.error("Error creating pattern:", error);
    return NextResponse.json(
      { error: "Failed to create pattern" },
      { status: 500 }
    );
  }
}

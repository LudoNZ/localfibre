import { db } from "./firebaseAdmin";

export interface Pattern {
  id: string;
  title: string;
  description: string;
  image: string;
  pdfUrl: string;
}

export async function getPatterns(): Promise<Pattern[]> {
  const snapshot = await db.collection("patterns").get();
  const patterns: Pattern[] = [];

  snapshot.forEach((doc) => {
    patterns.push({
      id: doc.id,
      ...doc.data(),
    } as Pattern);
  });

  return patterns;
}

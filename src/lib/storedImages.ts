import { NextResponse } from "next/server"
import { db, FieldValue } from "./firebaseAdmin"
import type { SitePhoto } from "./sitePhotoSlots"

// Only accept files uploaded to this project's Storage bucket, inside the expected folder
const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

const isStorageUrl = (url: unknown, folder: string) =>
  typeof url === "string" &&
  url.startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(folder + "/")}`)

/**
 * Save an uploaded image record to `collection/id`.
 * Returns the previous record's storage paths so the browser can delete old files.
 */
export async function saveStoredImage(collection: string, id: string, body: SitePhoto, folder: string) {
  const { src, srcSet, width, height, alt, paths } = body
  const srcSetUrls = typeof srcSet === "string" ? srcSet.split(",").map((s) => s.trim().split(" ")[0]) : []

  if (!isStorageUrl(src, folder) || !srcSetUrls.every((u) => isStorageUrl(u, folder))) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
  }

  const ref = db.collection(collection).doc(id)
  const previous = await ref.get()

  await ref.set({
    src,
    srcSet: srcSet ?? null,
    width: Number(width) || null,
    height: Number(height) || null,
    alt: typeof alt === "string" ? alt.trim().slice(0, 300) : "",
    paths: Array.isArray(paths)
      ? paths.filter((p) => typeof p === "string" && p.startsWith(`${folder}/`))
      : [],
    updatedAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ success: true, previousPaths: previous.data()?.paths ?? [] })
}

/** Remove an image record; returns its storage paths for cleanup */
export async function deleteStoredImage(collection: string, id: string) {
  const ref = db.collection(collection).doc(id)
  const previous = await ref.get()
  await ref.delete()
  return NextResponse.json({ success: true, previousPaths: previous.data()?.paths ?? [] })
}

/** Read every image record in a collection, keyed by document id */
export async function getStoredImages(collection: string): Promise<Record<string, SitePhoto>> {
  const result: Record<string, SitePhoto> = {}
  try {
    const snapshot = await db.collection(collection).get()
    snapshot.forEach((doc) => {
      const { src, srcSet, width, height, alt, paths } = doc.data()
      result[doc.id] = { src, srcSet: srcSet ?? undefined, width, height, alt, paths }
    })
  } catch (error) {
    console.error(`Failed to load images from ${collection}:`, error)
  }
  return result
}

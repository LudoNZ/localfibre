import { db } from "./firebaseAdmin"
import { photos as fallbackPhotos } from "@/data/site"
import { PHOTO_SLOTS, PhotoSlot, SitePhoto } from "./sitePhotoSlots"

/**
 * Photos for every slot: ones uploaded from the site take priority, then any
 * path set in src/data/site.ts, otherwise null (the frame shows a placeholder).
 */
export async function getSitePhotos(): Promise<Record<PhotoSlot, SitePhoto | null>> {
  const result = Object.fromEntries(
    Object.keys(PHOTO_SLOTS).map((slot) => {
      const path = fallbackPhotos[slot]
      return [slot, path ? { src: path } : null]
    })
  ) as Record<PhotoSlot, SitePhoto | null>

  try {
    const snapshot = await db.collection("sitePhotos").get()
    snapshot.forEach((doc) => {
      if (doc.id in result) {
        const { src, srcSet, width, height, alt, paths } = doc.data()
        result[doc.id as PhotoSlot] = { src, srcSet, width, height, alt, paths }
      }
    })
  } catch (error) {
    console.error("Failed to load site photos:", error)
  }

  return result
}

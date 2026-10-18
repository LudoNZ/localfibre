import { photos as fallbackPhotos } from "@/data/site"
import { PHOTO_SLOTS, PhotoSlot, SitePhoto } from "./sitePhotoSlots"
import { getStoredImages } from "./storedImages"

/**
 * Photos for every slot: ones uploaded from the site take priority, then any
 * path set in src/data/site.ts, otherwise null (the frame shows a placeholder).
 */
export async function getSitePhotos(): Promise<Record<PhotoSlot, SitePhoto | null>> {
  const uploaded = await getStoredImages("sitePhotos")

  return Object.fromEntries(
    Object.keys(PHOTO_SLOTS).map((slot) => {
      const path = fallbackPhotos[slot]
      return [slot, uploaded[slot] ?? (path ? { src: path } : null)]
    })
  ) as Record<PhotoSlot, SitePhoto | null>
}

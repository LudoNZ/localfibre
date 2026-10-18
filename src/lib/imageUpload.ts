// Browser-side image optimising and upload, shared by every in-place image editor
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase"
import type { SitePhoto } from "@/lib/sitePhotoSlots"

export interface UploadOptions {
  /** Responsive widths to generate (never upscaled) */
  widths: number[]
  /** Keep transparency (logos): falls back to PNG instead of JPEG */
  keepAlpha?: boolean
}

interface Variant {
  width: number
  blob: Blob
  ext: string
}

/** Resize to each width as WebP, falling back to PNG/JPEG where WebP isn't supported */
async function makeVariants(bitmap: ImageBitmap, { widths, keepAlpha }: UploadOptions): Promise<Variant[]> {
  const max = widths[widths.length - 1]
  const sizes = [...new Set([...widths.filter((w) => w < bitmap.width), Math.min(bitmap.width, max)])].sort(
    (a, b) => a - b
  )

  const variants: Variant[] = []
  for (const width of sizes) {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = Math.round((bitmap.height * width) / bitmap.width)
    const ctx = canvas.getContext("2d")!
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const toBlob = (type: string, quality?: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    let blob = await toBlob("image/webp", 0.82)
    let ext = "webp"
    if (!blob || blob.type !== "image/webp") {
      ;[blob, ext] = keepAlpha ? [await toBlob("image/png"), "png"] : [await toBlob("image/jpeg", 0.85), "jpg"]
    }
    if (!blob) throw new Error("Could not process this image")
    variants.push({ width, blob, ext })
  }
  return variants
}

/**
 * Optimise an image and upload every size to `folder`.
 * Returns what to store: a fallback src, a srcset, dimensions and the storage paths.
 */
export async function uploadImage(
  file: File,
  folder: string,
  options: UploadOptions,
  onProgress?: (message: string) => void
): Promise<SitePhoto> {
  const stamp = Date.now()
  const cacheControl = "public, max-age=31536000, immutable"

  // SVGs are already sharp at any size: upload as-is
  if (file.type === "image/svg+xml") {
    onProgress?.("Uploading…")
    const path = `${folder}/${stamp}.svg`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file, { contentType: "image/svg+xml", cacheControl })
    return { src: await getDownloadURL(storageRef), paths: [path] }
  }

  onProgress?.("Optimising…")
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const { width, height } = bitmap
  const variants = await makeVariants(bitmap, options)
  bitmap.close()

  const uploaded: { width: number; url: string; path: string }[] = []
  for (const [i, v] of variants.entries()) {
    onProgress?.(`Uploading size ${i + 1} of ${variants.length}…`)
    const path = `${folder}/${stamp}-${v.width}.${v.ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, v.blob, { contentType: v.blob.type, cacheControl })
    uploaded.push({ width: v.width, url: await getDownloadURL(storageRef), path })
  }

  // Fallback src for browsers that ignore srcset: the middle size
  const fallback = uploaded[Math.floor((uploaded.length - 1) / 2)]
  return {
    src: fallback.url,
    srcSet: uploaded.map((u) => `${u.url} ${u.width}w`).join(", "),
    width,
    height,
    paths: uploaded.map((u) => u.path),
  }
}

/** Delete stored files that are no longer referenced (best effort) */
export async function deleteStoredFiles(paths: string[], keep: string[] = []) {
  await Promise.allSettled(paths.filter((p) => !keep.includes(p)).map((p) => deleteObject(ref(storage, p))))
}

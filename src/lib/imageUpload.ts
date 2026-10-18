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

export interface Variant {
  width: number
  height: number
  blob: Blob
  ext: string
}

const MAX_FILE_MB = 40

// Safari can't encode WebP and silently returns PNG, which is slow to make.
// Check once with a tiny canvas so we go straight to the right format.
let webpSupport: Promise<boolean> | null = null
function canEncodeWebp() {
  webpSupport ??= new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 2
    canvas.toBlob((blob) => resolve(blob?.type === "image/webp"), "image/webp", 0.8)
  })
  return webpSupport
}

type Drawable = ImageBitmap | HTMLImageElement

/** Decode a photo, respecting the phone's rotation (EXIF orientation) */
async function decode(file: File): Promise<{ image: Drawable; width: number; height: number; release: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
  } catch {
    // Older Safari: fall back to an <img>, which also applies EXIF rotation
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(
        "This image couldn't be read. Try a JPG or PNG (on iPhone, photos from the Photos app work fine)."
      )
    }
  }
}

/** Resize a photo to each responsive width. Exported so it can be tested on its own. */
export async function optimiseImage(file: File, { widths, keepAlpha }: UploadOptions) {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new Error("That file isn't an image.")
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`That image is over ${MAX_FILE_MB}MB. Please choose a smaller one.`)
  }

  const { image, width, height, release } = await decode(file)
  const [type, ext, quality] = (await canEncodeWebp())
    ? ["image/webp", "webp", 0.82]
    : keepAlpha
      ? ["image/png", "png", undefined]
      : ["image/jpeg", "jpg", 0.85]

  const max = widths[widths.length - 1]
  const sizes = [...new Set([...widths.filter((w) => w < width), Math.min(width, max)])].sort((a, b) => a - b)

  try {
    const variants: Variant[] = []
    for (const w of sizes) {
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = Math.round((height * w) / width)
      const ctx = canvas.getContext("2d")!
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
      if (!blob) throw new Error("Could not process this image.")
      variants.push({ width: w, height: canvas.height, blob, ext: ext as string })
      // Free canvas memory straight away (matters on phones)
      canvas.width = canvas.height = 0
    }
    return { variants, width, height }
  } finally {
    release()
  }
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
  const { variants, width, height } = await optimiseImage(file, options)

  // Upload all sizes at once: much quicker on mobile connections
  let done = 0
  onProgress?.(`Uploading… 0 of ${variants.length}`)
  const uploaded = await Promise.all(
    variants.map(async (v) => {
      const path = `${folder}/${stamp}-${v.width}.${v.ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, v.blob, { contentType: v.blob.type, cacheControl })
      const url = await getDownloadURL(storageRef)
      onProgress?.(`Uploading… ${++done} of ${variants.length}`)
      return { width: v.width, url, path }
    })
  )

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

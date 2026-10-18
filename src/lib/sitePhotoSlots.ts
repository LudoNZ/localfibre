// Shared between the server (loading photos) and the admin upload button

export const PHOTO_SLOTS = {
  hero1: "Homepage hero (large)",
  hero2: "Homepage hero (small)",
  repair: "Repair programme",
  event: "About page",
} as const

export type PhotoSlot = keyof typeof PHOTO_SLOTS

export const isPhotoSlot = (value: string): value is PhotoSlot => value in PHOTO_SLOTS

/** A photo as stored for a slot. srcSet holds the responsive sizes made at upload. */
export interface SitePhoto {
  src: string
  srcSet?: string
  width?: number
  height?: number
  alt?: string
  /** Storage paths of every uploaded size, so they can be cleaned up on replace */
  paths?: string[]
}

/** Widths generated at upload: phones pick the small ones, large screens the big ones */
export const PHOTO_WIDTHS = [480, 800, 1200, 1800]

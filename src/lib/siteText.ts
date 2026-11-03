import { cache } from "react"
import { db } from "./firebaseAdmin"
import { isTextKey, SiteText, TEXT_SLOTS, TextKey } from "./siteTextSlots"

/**
 * Page text for every slot: wording changed by an admin in edit mode takes
 * priority, otherwise the default from siteTextSlots.ts. Read once per request.
 */
export const getSiteText = cache(async (): Promise<SiteText> => {
  const text = Object.fromEntries(
    Object.entries(TEXT_SLOTS).map(([key, slot]) => [key, slot.text])
  ) as SiteText

  try {
    const snapshot = await db.collection("siteText").get()
    snapshot.docs.forEach((doc) => {
      const value = doc.data().text
      if (isTextKey(doc.id) && typeof value === "string" && value.trim()) text[doc.id as TextKey] = value
    })
  } catch (error) {
    // Show the default wording rather than break the page
    console.error("Error loading site text:", error)
  }

  return text
})

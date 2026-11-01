import { db, FieldValue } from "./firebaseAdmin"
import { machineRecipients, orgSlug, partners } from "@/data/partners"

export const ORG_GROUPS = ["partner", "recipient"] as const

export type OrgGroup = (typeof ORG_GROUPS)[number]

export const ORG_GROUP_LABELS: Record<OrgGroup, string> = {
  partner: "Partners & supporters",
  recipient: "Organisations given machines",
}

export interface Organisation {
  id: string
  name: string
  role: string
  url: string
  logo: string
  group: OrgGroup
  order: number
  // Id of the uploaded logo; set once so renaming keeps the logo
  logoKey: string
}

const collection = () => db.collection("organisations")

/** Copy the starting lists into the database the first time they're needed */
async function seedIfEmpty() {
  const existing = await collection().limit(1).get()
  if (!existing.empty) return
  const batch = db.batch()
  const add = (list: typeof partners, group: OrgGroup) =>
    list.forEach((org, order) =>
      batch.set(collection().doc(), {
        name: org.name,
        role: org.role ?? "",
        url: org.url ?? "",
        logo: org.logo ?? "",
        group,
        order,
        logoKey: orgSlug(org.name),
        createdAt: FieldValue.serverTimestamp(),
      })
    )
  add(partners, "partner")
  add(machineRecipients, "recipient")
  await batch.commit()
}

/** Organisations in their display order, all of them or one group */
export async function getOrganisations(group?: OrgGroup): Promise<Organisation[]> {
  try {
    await seedIfEmpty()
    const snapshot = await (group ? collection().where("group", "==", group) : collection()).get()
    return snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name ?? "",
          role: data.role ?? "",
          url: data.url ?? "",
          logo: data.logo ?? "",
          group: data.group,
          order: data.order ?? 0,
          logoKey: data.logoKey ?? orgSlug(data.name ?? ""),
        }
      })
      .sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order)
  } catch (error) {
    console.error("Failed to load organisations:", error)
    return []
  }
}

/** Whether an uploaded logo id belongs to an organisation on the site */
export async function isKnownLogoKey(key: string) {
  const match = await collection().where("logoKey", "==", key).limit(1).get()
  return !match.empty
}

/** Links must be http(s); "example.org" is accepted and given https:// */
export function parseUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim().slice(0, 500) : ""
  if (!url) return ""
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return null
  }
}

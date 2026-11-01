import { NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebaseAdmin"
import { requireAdmin } from "@/lib/adminAuth"
import { orgSlug } from "@/data/partners"
import { ORG_GROUPS, OrgGroup, getOrganisations, parseUrl } from "@/lib/organisations"

const text = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "")

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ organisations: await getOrganisations() })
}

/** Add an organisation to the end of its list */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const name = text(body.name)
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    const group: OrgGroup = ORG_GROUPS.includes(body.group) ? body.group : "partner"
    const url = parseUrl(body.url)
    if (url === null) return NextResponse.json({ error: "That website link doesn't look right" }, { status: 400 })

    const siblings = await db.collection("organisations").where("group", "==", group).get()
    // Logo id from the name, made unique so two organisations never share a logo
    const taken = new Set((await db.collection("organisations").select("logoKey").get()).docs.map((d) => d.data().logoKey))
    const base = orgSlug(name) || "organisation"
    let logoKey = base
    for (let i = 2; taken.has(logoKey); i++) logoKey = `${base}-${i}`

    const ref = await db.collection("organisations").add({
      name,
      role: text(body.role, 80),
      url,
      logo: "",
      group,
      order: siblings.docs.reduce((max, d) => Math.max(max, (d.data().order ?? 0) + 1), 0),
      logoKey,
      createdAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error("Error adding organisation:", error)
    return NextResponse.json({ error: "Failed to add organisation" }, { status: 500 })
  }
}

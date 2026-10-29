import { NextRequest, NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { requireAdmin } from "@/lib/adminAuth"

// Printable info sheets built by print/build.mjs. Admin-only, so they live
// outside public/ and are served from here.
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  svg: "image/svg+xml",
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const { file } = await params
  const match = file.match(/^[a-z0-9-]+\.(pdf|svg)$/)
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const data = await readFile(path.join(process.cwd(), "print", file))
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[match[1]],
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

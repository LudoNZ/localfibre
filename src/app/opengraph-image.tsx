import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import path from "node:path"

export const alt = "Local Fibre: community sewing, mending and machine repair in West Auckland"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Branded preview shown when the site is shared in emails and on social media
export default async function OpengraphImage() {
  const logo = await readFile(path.join(process.cwd(), "public/images/LFLogo-Horizontal.png"))
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f9f2e6",
        }}
      >
        <div style={{ display: "flex", height: 28 }}>
          <div style={{ flex: 1, background: "#e0a526" }} />
          <div style={{ flex: 1, background: "#d9935a" }} />
          <div style={{ flex: 1, background: "#7f340b" }} />
          <div style={{ flex: 1, background: "#5f6b2d" }} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "28px 44px",
              background: "#fffaf2",
              border: "4px solid #2b1407",
              borderRadius: 32,
              boxShadow: "10px 10px 0 #2b1407",
            }}
          >
            <img src={logoSrc} width={528} height={195} alt="" />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#2b1407" }}>
            Community sewing, mending &amp; machine repair
          </div>
          <div style={{ fontSize: 28, color: "#7f340b" }}>West Auckland · localfibre.co.nz</div>
        </div>
      </div>
    ),
    size
  )
}

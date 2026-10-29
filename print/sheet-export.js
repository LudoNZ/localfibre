// Turns a rendered .sheet into an editable SVG: boxes become <rect>s, text stays
// real <text> (one element per line), icons/QR stay vector, logo is embedded.
// Shared by every info sheet: add a button with data-export-svg="filename.svg".

(function () {
  const NS = "http://www.w3.org/2000/svg"
  const px = (v) => parseFloat(v) || 0
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  const r2 = (n) => Math.round(n * 100) / 100
  const visible = (c) => c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c)

  // Inline-icon class styles (CSS rules don't reach <symbol> contents)
  const ICON_FILLS = { "fill-cream": "#f9f2e6", "fill-rust": "#7f340b", "fill-tan": "#d9935a" }

  function radius(cs, w, h) {
    const r = cs.borderTopLeftRadius
    if (r.endsWith("%")) return [(w * px(r)) / 100, (h * px(r)) / 100]
    const v = Math.min(px(r), w / 2, h / 2)
    return [v, v]
  }

  function dash(style, bw) {
    if (style === "dashed") return ` stroke-dasharray="${r2(bw * 3)} ${r2(bw * 2)}"`
    if (style === "dotted") return ` stroke-dasharray="${r2(bw)} ${r2(bw)}" stroke-linecap="round"`
    return ""
  }

  // Background, border and offset shadow of a box
  function boxShapes(cs, x, y, w, h) {
    let out = ""
    const [rx, ry] = radius(cs, w, h)
    const bw = px(cs.borderTopWidth)
    const allSides = bw > 0 && ["Right", "Bottom", "Left"].every((s) => px(cs[`border${s}Width`]) === bw)
    const shadow = cs.boxShadow !== "none" && cs.boxShadow.match(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px/)
    if (shadow) {
      out += `<rect x="${r2(x + px(shadow[2]))}" y="${r2(y + px(shadow[3]))}" width="${r2(w)}" height="${r2(h)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="${shadow[1]}"/>`
    }
    if (visible(cs.backgroundColor)) {
      // Square-cornered bands overlap slightly so no hairline seams show between them
      const bleed = rx ? 0 : 0.4
      out += `<rect x="${r2(x)}" y="${r2(y - bleed)}" width="${r2(w)}" height="${r2(h + bleed * 2)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="${cs.backgroundColor}"/>`
    }
    if (allSides && cs.borderTopStyle !== "none") {
      const i = bw / 2
      out += `<rect x="${r2(x + i)}" y="${r2(y + i)}" width="${r2(w - bw)}" height="${r2(h - bw)}" rx="${r2(Math.max(rx - i, 0))}" ry="${r2(Math.max(ry - i, 0))}" fill="none" stroke="${cs.borderTopColor}" stroke-width="${bw}"${dash(cs.borderTopStyle, bw)}/>`
    } else if (bw > 0 && cs.borderTopStyle !== "none") {
      out += `<line x1="${r2(x)}" y1="${r2(y + bw / 2)}" x2="${r2(x + w)}" y2="${r2(y + bw / 2)}" stroke="${cs.borderTopColor}" stroke-width="${bw}"${dash(cs.borderTopStyle, bw)}/>`
    }
    return out
  }

  function pseudo(el, which, rect, ox, oy) {
    const cs = getComputedStyle(el, which)
    if (cs.content === "none" || cs.position !== "absolute") return ""
    const ecs = getComputedStyle(el)
    const x = rect.left - ox + px(ecs.borderLeftWidth) + px(cs.left)
    const y = rect.top - oy + px(ecs.borderTopWidth) + px(cs.top)
    const w = px(cs.width) + px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth)
    const h = px(cs.height) + px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth)
    return boxShapes(cs, x, y, w, h)
  }

  const measure = document.createElement("canvas").getContext("2d")

  // One <text> per rendered line of a text node
  function textLines(node, ox, oy) {
    const el = node.parentElement
    const cs = getComputedStyle(el)
    measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    const ascent = measure.measureText("Hg").fontBoundingBoxAscent
    const range = document.createRange()
    const lines = []
    const re = /\S+/g
    let m
    while ((m = re.exec(node.data))) {
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const rects = range.getClientRects()
      if (!rects.length) continue
      const r = rects[0]
      const line = lines.find((l) => Math.abs(l.top - r.top) < 2)
      if (line) line.words.push(m[0])
      else lines.push({ top: r.top, left: r.left, words: [m[0]] })
    }
    let text = (s) => s
    if (cs.textTransform === "uppercase") text = (s) => s.toUpperCase()
    const ls = cs.letterSpacing === "normal" ? "" : ` letter-spacing="${r2(px(cs.letterSpacing))}"`
    const fvs = cs.fontVariationSettings !== "normal" ? ` style="font-variation-settings:${esc(cs.fontVariationSettings)}"` : ""
    const family = esc(cs.fontFamily.replace(/"/g, "'"))
    return lines
      .map((l) =>
        `<text x="${r2(l.left - ox)}" y="${r2(l.top - oy + ascent)}" font-family="${family}" font-size="${r2(px(cs.fontSize))}" font-weight="${cs.fontWeight}" fill="${cs.color}"${ls}${fvs} xml:space="preserve">${esc(text(l.words.join(" ")))}</text>`
      )
      .join("\n")
  }

  function inlineSvg(svg, x, y, w, h) {
    const use = svg.querySelector("use")
    if (use) {
      const sym = document.querySelector(use.getAttribute("href"))
      const [, , vw, vh] = sym.getAttribute("viewBox").split(/\s+/).map(Number)
      const s = Math.min(w / vw, h / vh)
      const tx = x + (w - vw * s) / 2
      const ty = y + (h - vh * s) / 2
      const cs = getComputedStyle(svg)
      const kids = [...sym.children]
        .map((c) => {
          const k = c.cloneNode(true)
          const fill = ICON_FILLS[k.getAttribute("class")]
          if (fill) k.setAttribute("fill", fill)
          if (k.getAttribute("class") === "fill-rust") k.setAttribute("stroke", "none")
          k.removeAttribute("class")
          return k.outerHTML
        })
        .join("")
      return `<g transform="translate(${r2(tx)} ${r2(ty)}) scale(${r2(s)})" fill="none" stroke="${cs.stroke}" stroke-width="${px(cs.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round">${kids}</g>`
    }
    const [, , vw, vh] = svg.getAttribute("viewBox").split(/\s+/).map(Number)
    const stretch = svg.getAttribute("preserveAspectRatio") === "none"
    const sx = stretch ? w / vw : Math.min(w / vw, h / vh)
    const sy = stretch ? h / vh : sx
    return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${sx} ${sy})"${svg.getAttribute("shape-rendering") ? ` shape-rendering="${svg.getAttribute("shape-rendering")}"` : ""}>${svg.innerHTML}</g>`
  }

  async function dataUri(url) {
    const blob = await (await fetch(url)).blob()
    return new Promise((res) => {
      const fr = new FileReader()
      fr.onload = () => res(fr.result)
      fr.readAsDataURL(blob)
    })
  }

  // Embed only the latin subsets so the SVG previews right in a browser
  async function fontFaces() {
    const href = document.querySelector('link[href$="fonts.css"]').href
    const css = await (await fetch(href)).text()
    const blocks = css.split(/(?=\/\* )/).filter((b) => /^\/\* latin(-ext)? \*\//.test(b))
    let out = ""
    for (const b of blocks) {
      const file = b.match(/url\(([^)]+)\)/)[1]
      out += b.replace(file, await dataUri(new URL(file, href)))
    }
    return out
  }

  async function exportSvg(sheet) {
    // Measure everything un-rotated, then re-apply transforms in the SVG
    const transformed = []
    sheet.querySelectorAll("*").forEach((el) => {
      if (el.closest("svg") && el.tagName !== "svg") return
      const t = getComputedStyle(el).transform
      if (t !== "none") {
        transformed.push([el, el.style.transform, t])
        el.style.transform = "none"
      }
    })
    const tMap = new Map(transformed.map(([el, , t]) => [el, t]))

    const origin = sheet.getBoundingClientRect()
    const ox = origin.left
    const oy = origin.top
    const W = origin.width
    const H = origin.height

    async function walk(el) {
      const cs = getComputedStyle(el)
      if (cs.display === "none" || cs.visibility === "hidden") return ""
      const rect = el.getBoundingClientRect()
      const x = rect.left - ox
      const y = rect.top - oy
      let out = ""

      if (el.tagName === "svg") {
        out = rect.width ? inlineSvg(el, x, y, rect.width, rect.height) : ""
      } else if (el.tagName === "IMG") {
        out = `<image x="${r2(x)}" y="${r2(y)}" width="${r2(rect.width)}" height="${r2(rect.height)}" href="${await dataUri(el.src)}"/>`
      } else {
        out = el === sheet ? "" : boxShapes(cs, x, y, rect.width, rect.height)
        out += pseudo(el, "::before", rect, ox, oy)
        const later = []
        for (const child of el.childNodes) {
          if (child.nodeType === 3 && child.data.trim()) out += textLines(child, ox, oy)
          else if (child.nodeType === 1) {
            const z = parseInt(getComputedStyle(child).zIndex)
            if (z > 0) later.push(child)
            else out += await walk(child)
          }
        }
        for (const child of later) out += await walk(child)
        out += pseudo(el, "::after", rect, ox, oy)
      }

      const t = tMap.get(el)
      if (t && out) {
        const m = t.match(/matrix\(([^)]+)\)/)
        if (m) {
          const cx = r2(x + rect.width / 2)
          const cy = r2(y + rect.height / 2)
          out = `<g transform="translate(${cx} ${cy}) matrix(${m[1]}) translate(${-cx} ${-cy})">${out}</g>`
        }
      }
      return out + "\n"
    }

    const sheetBg = getComputedStyle(sheet).backgroundColor
    let body
    try {
      body = await walk(sheet)
    } finally {
      transformed.forEach(([el, style]) => (el.style.transform = style))
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${r2(W)} ${r2(H)}">
<style>${await fontFaces()}</style>
<defs><clipPath id="sheet"><rect width="${r2(W)}" height="${r2(H)}"/></clipPath></defs>
<g clip-path="url(#sheet)">
<rect width="${r2(W)}" height="${r2(H)}" fill="${sheetBg}"/>
${body}</g>
</svg>
`
  }

  window.exportSheetSvg = () => exportSvg(document.querySelector(".sheet"))

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-export-svg]")
    if (!btn) return
    const label = btn.textContent
    btn.textContent = "Preparing…"
    try {
      const svg = await window.exportSheetSvg()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
      a.download = btn.dataset.exportSvg
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } finally {
      btn.textContent = label
    }
  })
})()

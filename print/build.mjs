// Rebuild the PDF and SVG for an info sheet. Admins download them from the
// dashboard via /api/info-sheets, so commit the rebuilt files.
//   node print/build.mjs repair-programme
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { readFile, writeFileSync } from "node:fs"
import { dirname, extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const name = process.argv[2] || "repair-programme"
const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")
const port = 9333

// Serve the repo root so the sheet can load ../public/images and its fonts
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf" }
const server = createServer((req, res) => {
  const file = join(root, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)))
  if (!file.startsWith(root)) return res.writeHead(403).end()
  readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end()
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(data)
  })
})
await new Promise((r) => server.listen(0, "127.0.0.1", r))
const url = `http://127.0.0.1:${server.address().port}/print/${name}.html`

const chrome = spawn("chromium", [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: "ignore" })

try {
  let target
  for (let i = 0; i < 50 && !target; i++) {
    await new Promise((r) => setTimeout(r, 200))
    target = await fetch(`http://127.0.0.1:${port}/json/list`)
      .then((r) => r.json())
      .then((list) => list.find((t) => t.type === "page"))
      .catch(() => null)
  }
  if (!target) throw new Error("Chrome didn't start")

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener("open", r, { once: true }))
  let id = 0
  const pending = new Map()
  const waiters = []
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else if (msg.method) {
      waiters.filter((w) => w.method === msg.method).forEach((w) => w.resolve(msg.params))
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const once = (method) => new Promise((resolve) => waiters.push({ method, resolve }))

  await send("Page.enable")
  const loaded = once("Page.loadEventFired")
  await send("Page.navigate", { url })
  await loaded

  const evalAsync = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text)
    return result.value
  }
  await evalAsync("document.fonts.ready.then(() => true)")

  const pdf = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false })
  writeFileSync(join(here, `${name}.pdf`), Buffer.from(pdf.data, "base64"))

  writeFileSync(join(here, `${name}.svg`), await evalAsync("exportSheetSvg()"))

  ws.close()
  console.log(`Built ${name}.pdf and ${name}.svg`)
} finally {
  chrome.kill()
  server.close()
}

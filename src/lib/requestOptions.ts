/**
 * The kinds of machine people can ask for on the waiting-list form. Sewing machines
 * and overlockers are built in; admins can add more and open, grey out or hide each:
 * - open: can be chosen
 * - paused: shown greyed out with a message, e.g. when we can't keep up with demand
 * - hidden: not shown at all
 * Pausing or hiding only affects new requests; past requests keep what they asked for.
 * A kind can only be deleted while nobody has ever asked for it.
 */
export const REQUEST_OPTION_MODES = ["open", "paused", "hidden"] as const

export type RequestOptionMode = (typeof REQUEST_OPTION_MODES)[number]

export const REQUEST_OPTION_MODE_LABELS: Record<RequestOptionMode, string> = {
  open: "Open",
  paused: "Greyed out with a message",
  hidden: "Hidden",
}

export interface RequestKindDef {
  /** Key in an application's request, e.g. "sewingMachine". Never changes once made. */
  id: string
  /** Singular label, e.g. "Sewing machine" */
  one: string
  /** Plural used in sentences, e.g. "sewing machines" */
  many: string
  mode: RequestOptionMode
  message: string
}

export const BUILT_IN_KIND_IDS = ["sewingMachine", "overlocker"]

export const BUILT_IN_KINDS: RequestKindDef[] = [
  { id: "sewingMachine", one: "Sewing machine", many: "sewing machines", mode: "open", message: "" },
  { id: "overlocker", one: "Overlocker", many: "overlockers", mode: "open", message: "" },
]

export const isBuiltInKind = (id: string) => BUILT_IN_KIND_IDS.includes(id)

export const MAX_REQUEST_OPTION_MESSAGE = 300
export const MAX_KIND_NAME = 50
export const MAX_KINDS = 20

const KIND_ID = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/
export const isKindId = (value: unknown): value is string => typeof value === "string" && KIND_ID.test(value)

export const defaultPausedMessage = (kind: Pick<RequestKindDef, "many">) =>
  `We can't keep up with demand for ${kind.many} right now, so we've paused requests for a while. Please check back soon.`

/** The usual plural, e.g. "Embroidery machine" → "embroidery machines" */
export function pluralise(one: string) {
  const word = one.trim().toLowerCase()
  if (!word) return ""
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

/** A new id from a name, e.g. "Embroidery machine" → "embroideryMachine", kept unique */
export function kindIdFor(name: string, taken: string[]) {
  const words = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  let base = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("")
  if (!/^[a-z]/.test(base)) base = `machine${base[0]?.toUpperCase() ?? ""}${base.slice(1)}`
  base = base.slice(0, 36)
  let id = base
  for (let n = 2; taken.some((t) => t.toLowerCase() === id.toLowerCase()); n++) id = `${base}${n}`
  return id
}

/** A label for a kind that is no longer in the list, from its id ("embroideryMachine" → "Embroidery machine") */
export function labelFromId(id: string) {
  const words = id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return words[0]?.toUpperCase() + words.slice(1)
}

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "")

function parseKind(value: unknown): RequestKindDef | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  if (!isKindId(raw.id)) return null
  const builtIn = BUILT_IN_KINDS.find((k) => k.id === raw.id)
  const one = clean(raw.one, MAX_KIND_NAME) || builtIn?.one || labelFromId(raw.id)
  const many = clean(raw.many, MAX_KIND_NAME) || builtIn?.many || pluralise(one)
  const mode = REQUEST_OPTION_MODES.includes(raw.mode as RequestOptionMode) ? (raw.mode as RequestOptionMode) : "open"
  return { id: raw.id, one, many, mode, message: clean(raw.message, MAX_REQUEST_OPTION_MESSAGE) }
}

/**
 * Tidy a stored or sent list of kinds: drops bad or repeated entries and always
 * keeps the built-in kinds. Also reads the earlier { sewingMachine: { mode } } shape.
 */
export function parseRequestKinds(value: unknown): RequestKindDef[] {
  let list: unknown[] = []
  if (Array.isArray(value)) list = value
  else if (value && typeof value === "object") {
    list = Object.entries(value as Record<string, unknown>).map(([id, option]) => ({
      ...(option && typeof option === "object" ? option : {}),
      id,
    }))
  }

  const kinds: RequestKindDef[] = []
  for (const item of list) {
    const kind = parseKind(item)
    if (!kind) continue
    const sameId = kinds.some((k) => k.id.toLowerCase() === kind.id.toLowerCase())
    const sameName = kinds.some((k) => k.one.toLowerCase() === kind.one.toLowerCase())
    if (!sameId && !sameName && kinds.length < MAX_KINDS) kinds.push(kind)
  }
  for (const builtIn of BUILT_IN_KINDS) {
    if (!kinds.some((k) => k.id === builtIn.id)) kinds.splice(BUILT_IN_KINDS.indexOf(builtIn), 0, { ...builtIn })
  }
  return kinds
}

/** The kinds people can choose right now */
export const openKinds = (kinds: RequestKindDef[]) => kinds.filter((kind) => kind.mode === "open")

/** The kinds shown on the public form (open or greyed out) */
export const visibleKinds = (kinds: RequestKindDef[]) => kinds.filter((kind) => kind.mode !== "hidden")

/** The message shown under a greyed-out option */
export const pausedMessage = (kind: RequestKindDef) => kind.message || defaultPausedMessage(kind)

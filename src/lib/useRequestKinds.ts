"use client"

import { useEffect, useSyncExternalStore } from "react"
import { BUILT_IN_KINDS, RequestKindDef } from "./requestOptions"

// One shared copy for every admin screen, loaded once and updated when an admin saves
let kinds: RequestKindDef[] = BUILT_IN_KINDS
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

export function setRequestKinds(next: RequestKindDef[]) {
  kinds = next
  loaded = true
  listeners.forEach((listener) => listener())
}

function load() {
  loading ??= fetch("/api/request-options")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.kinds)) setRequestKinds(data.kinds)
    })
    .catch(() => {
      // Keep the built-in kinds; the next screen to mount tries again
      loading = null
    })
  return loading
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The kinds of machine people can ask for, as set in the Waiting List tab */
export function useRequestKinds(): { kinds: RequestKindDef[]; loaded: boolean } {
  const current = useSyncExternalStore(subscribe, () => kinds, () => BUILT_IN_KINDS)
  useEffect(() => {
    if (!loaded) load()
  }, [])
  return { kinds: current, loaded }
}

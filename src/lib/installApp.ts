"use client";

import { useSyncExternalStore } from "react";

// Chrome/Edge/Android fire this before offering to install the app
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The browser fires its install event once per page load, so it's kept here and
// shared by everything that offers installing (the popup and the footer link).
let installEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installed = true;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isRunningAsApp = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Shows the browser's install dialog. Resolves to the user's choice. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
  const event = installEvent;
  if (!event) return null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The browser only lets us show its install dialog once per event
  installEvent = null;
  notify();
  return outcome;
}

export function useInstallApp() {
  const canPrompt = useSyncExternalStore(subscribe, () => !!installEvent, () => false);
  const justInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  return { canPrompt, justInstalled };
}

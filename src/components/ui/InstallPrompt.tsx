"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import styles from "./InstallPrompt.module.css";

// Chrome/Edge/Android fire this before offering to install the app
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "lf-install-prompt-snoozed-until";
const SNOOZE_DAYS = 14;

const isSnoozed = () => {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
};

const snooze = (days: number) => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
  } catch {
    // Storage unavailable (private mode etc.) – prompt just shows again next visit
  }
};

const isRunningAsApp = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const subscribeNoop = () => () => {};

export default function InstallPrompt() {
  const { user, loading } = useAuth();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Browser-only checks: false during server render, real values once hydrated
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const eligible = isClient && !isRunningAsApp() && !isSnoozed();
  const showIosSteps = eligible && isIos();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleNotNow = () => {
    snooze(SNOOZE_DAYS);
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The browser only lets us show its install dialog once per event
    setInstallEvent(null);
    if (outcome === "dismissed") snooze(SNOOZE_DAYS);
    setDismissed(true);
  };

  if (loading || !user || !eligible || dismissed || (!installEvent && !showIosSteps)) {
    return null;
  }

  return (
    <div className={styles.prompt} role="dialog" aria-labelledby="install-prompt-title">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={48}
        height={48}
        className={styles.icon}
      />
      <div className={styles.body}>
        <p id="install-prompt-title" className={styles.title}>
          Install the Local Fibre app
        </p>
        {showIosSteps ? (
          <p className={styles.text}>
            Tap the Share button{" "}
            <svg className={styles.shareIcon} viewBox="0 0 24 24" aria-label="Share" role="img">
              <path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>{" "}
            then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className={styles.text}>Add it to your home screen for quick access.</p>
        )}
        <div className={styles.actions}>
          {!showIosSteps && (
            <button type="button" className="btn-primary" onClick={handleInstall}>
              Install
            </button>
          )}
          <button type="button" className={styles.notNow} onClick={handleNotNow}>
            {showIosSteps ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={handleNotNow}
        aria-label="Dismiss install prompt"
      >
        ✕
      </button>
    </div>
  );
}

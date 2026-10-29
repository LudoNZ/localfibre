"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { isIos, isRunningAsApp, promptInstall, useInstallApp } from "@/lib/installApp";
import styles from "./InstallPrompt.module.css";

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

const subscribeNoop = () => () => {};

export default function InstallPrompt() {
  const { user, loading } = useAuth();
  const { canPrompt, justInstalled } = useInstallApp();
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
  }, []);

  const handleNotNow = () => {
    snooze(SNOOZE_DAYS);
    setDismissed(true);
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "dismissed") snooze(SNOOZE_DAYS);
    setDismissed(true);
  };

  if (loading || !user || !eligible || dismissed || justInstalled || (!canPrompt && !showIosSteps)) {
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

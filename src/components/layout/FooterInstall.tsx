"use client";

import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/context/AuthContext";
import { isIos, isRunningAsApp, promptInstall, useInstallApp } from "@/lib/installApp";
import styles from "./Footer.module.css";

const subscribeNoop = () => () => {};

/** Quiet "Install the app" link for admins on a device without the app. */
export default function FooterInstall() {
  const { isAdmin, loading } = useAuth();
  const { canPrompt, justInstalled } = useInstallApp();
  const [showIosSteps, setShowIosSteps] = useState(false);
  // Browser-only checks: false during server render, real values once hydrated
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const ios = isClient && isIos();

  if (loading || !isAdmin || !isClient || isRunningAsApp() || justInstalled) return null;
  // Browsers without an install dialog (e.g. desktop Firefox) get nothing to click
  if (!canPrompt && !ios) return null;

  return (
    <div className={styles.install}>
      <button
        type="button"
        className={styles.installButton}
        onClick={() => (ios ? setShowIosSteps((v) => !v) : promptInstall())}
        aria-expanded={ios ? showIosSteps : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 19h14" />
        </svg>
        Install the app
      </button>
      {showIosSteps && (
        <p className={styles.installSteps}>
          Tap the Share button, then <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import styles from "./InstallPrompt.module.css";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SNOOZE_KEY = "lf-notification-prompt-snoozed-until";
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

// iPhones only support push once the site is added to the home screen,
// so there PushManager is missing until then
const isSupported = () =>
  Boolean(VAPID_PUBLIC_KEY) &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// The push service wants the VAPID key as raw bytes, not base64url text
const keyToBytes = (base64Url: string) => {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
};

const subscribeNoop = () => () => {};

export default function NotificationPrompt() {
  const { user, isAdmin, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");
  // Browser-only checks: false during server render, real values once hydrated
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const supported = isClient && isSupported();
  const permission = supported ? Notification.permission : "denied";

  // Subscribe this device and tell the server where to send admin notifications
  const saveSubscription = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY!),
      }));

    const token = await user?.getIdToken();
    const res = await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    if (!res.ok) throw new Error("Failed to save subscription");
  };

  // Already allowed on this device: quietly keep the server's copy up to date,
  // since browsers sometimes replace subscriptions
  useEffect(() => {
    if (!isAdmin || permission !== "granted") return;
    saveSubscription().catch((err) => {
      console.error("Failed to refresh push subscription:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, permission, user]);

  const handleNotNow = () => {
    snooze(SNOOZE_DAYS);
    setDismissed(true);
  };

  const handleTurnOn = async () => {
    setError("");
    // Ask straight away: browsers only allow this right after a tap
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      setDismissed(true);
      return;
    }
    try {
      await saveSubscription();
      setDismissed(true);
    } catch (err) {
      console.error("Failed to turn on notifications:", err);
      setError("Couldn't turn on notifications. Please try again.");
    }
  };

  if (loading || !isAdmin || permission !== "default" || isSnoozed() || dismissed) {
    return null;
  }

  return (
    <div className={styles.prompt} role="dialog" aria-labelledby="notification-prompt-title">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={48}
        height={48}
        className={styles.icon}
      />
      <div className={styles.body}>
        <p id="notification-prompt-title" className={styles.title}>
          Turn on notifications
        </p>
        <p className={styles.text}>
          {error || "Get notified on this device about new messages and sewing machine requests."}
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn-primary" onClick={handleTurnOn}>
            Turn on
          </button>
          <button type="button" className={styles.notNow} onClick={handleNotNow}>
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={handleNotNow}
        aria-label="Dismiss notification prompt"
      >
        ✕
      </button>
    </div>
  );
}

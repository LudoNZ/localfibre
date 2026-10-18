"use client";

import { useState } from "react";
import styles from "./NewsletterForm.module.css";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="newsletter-email" className={styles.label}>
        Email address
      </label>
      <div className={styles.row}>
        <input
          type="email"
          id="newsletter-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          required
          className={styles.input}
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className={`btn-primary ${styles.button}`}
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? "Subscribing..." : status === "success" ? "Subscribed!" : "Subscribe"}
        </button>
      </div>
      {status === "success" && (
        <p className={styles.success} role="status">Thank you for subscribing!</p>
      )}
      {status === "error" && (
        <p className={styles.error} role="alert">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}


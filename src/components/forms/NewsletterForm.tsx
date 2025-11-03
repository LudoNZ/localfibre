"use client";

import { useState } from "react";
import styles from "./NewsletterForm.module.css";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Placeholder for Mailchimp integration
    // For now, just show success message
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} id="newsletter">
      <div className={styles.inputGroup}>
        <label htmlFor="newsletter-email" className={styles.label}>
          Email address
        </label>
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
      </div>
      <button
        type="submit"
        className={`btn-primary ${styles.button}`}
        disabled={status === "loading" || status === "success"}
      >
        {status === "loading" ? "Subscribing..." : status === "success" ? "Subscribed!" : "Subscribe"}
      </button>
      {status === "success" && (
        <p className={styles.success}>Thank you for subscribing!</p>
      )}
      {status === "error" && (
        <p className={styles.error}>Something went wrong. Please try again.</p>
      )}
    </form>
  );
}


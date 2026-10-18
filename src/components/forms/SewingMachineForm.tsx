"use client";

import { useState } from "react";
import styles from "./SewingMachineForm.module.css";

const AREAS = [
  "West Auckland",
  "Central Auckland",
  "North Shore",
  "East Auckland",
  "South Auckland",
  "Rodney / North of Auckland",
  "Franklin / South of Auckland",
  "Outside Auckland",
];

const emptyForm = {
  applicantType: "",
  groupName: "",
  fullName: "",
  email: "",
  phone: "",
  area: "",
};

export default function SewingMachineForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch("/api/sewing-machines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setQueuePosition(data.queuePosition);
      setStatus("success");
      setFormData(emptyForm);
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  if (status === "success") {
    return (
      <div className={styles.confirmation} role="status">
        <h3>Thank you for your submission!</h3>
        {queuePosition !== null && (
          <p className={styles.queueNumber}>
            You are number <strong>{queuePosition}</strong> in the queue.
          </p>
        )}
        <p>Please wait for a response from us.</p>
      </div>
    );
  }

  const disabled = status === "loading";

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset} disabled={disabled}>
        <legend className={styles.label}>Are you applying as… *</legend>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="applicantType"
              value="individual"
              checked={formData.applicantType === "individual"}
              onChange={handleChange}
              required
            />
            An individual
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="applicantType"
              value="communityGroup"
              checked={formData.applicantType === "communityGroup"}
              onChange={handleChange}
            />
            A community group or organisation
          </label>
        </div>
      </fieldset>

      {formData.applicantType === "communityGroup" && (
        <div className={styles.formGroup}>
          <label htmlFor="groupName" className={styles.label}>
            Organisation name *
          </label>
          <input
            type="text"
            id="groupName"
            name="groupName"
            pattern=".*\S.*"
            title="Please enter your organisation's name"
            value={formData.groupName}
            onChange={handleChange}
            required
            className={styles.input}
            disabled={disabled}
          />
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="fullName" className={styles.label}>
          Full name *
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          pattern=".*\S.*"
          title="Please enter your full name"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone" className={styles.label}>
          Contact number *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          autoComplete="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          className={styles.input}
          disabled={disabled}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="area" className={styles.label}>
          Area of Auckland you live in *
        </label>
        <select
          id="area"
          name="area"
          value={formData.area}
          onChange={handleChange}
          required
          className={styles.input}
          disabled={disabled}
        >
          <option value="" disabled>
            Select your area
          </option>
          {AREAS.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        <p className={styles.hint}>
          We prioritise West Auckland applicants. Pickup is in West Auckland.
        </p>
      </div>

      <button
        type="submit"
        className={`btn-primary ${styles.button}`}
        disabled={disabled}
      >
        {disabled ? "Submitting..." : "Submit Application"}
      </button>

      {status === "error" && (
        <p className={styles.error}>Something went wrong. Please try again or email us directly.</p>
      )}
    </form>
  );
}

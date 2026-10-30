"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import styles from "./Admin.module.css";
import EditModal from "@/components/ui/EditModal";
import MachinesPanel from "./MachinesPanel";
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  OPEN_STATUSES,
  STATUS_LABELS,
} from "@/lib/sewingMachines";

interface User {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  registerLink?: string;
  isUpcoming: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface Pattern {
  id: string;
  title: string;
  description: string;
  image: string;
  pdfUrl: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string | null;
}

interface Subscriber {
  id: string;
  email: string;
  createdAt: string | null;
}

interface SewingApplication {
  id: string;
  applicantType: "individual" | "communityGroup";
  groupName: string | null;
  fullName: string;
  email: string;
  phone: string;
  area: string;
  status: ApplicationStatus;
  machineNumber?: number;
  createdAt: string | null;
}

type Tab = "users" | "events" | "patterns" | "machines" | "sewing" | "messages" | "newsletter";

const TABS: { id: Tab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "events", label: "Events" },
  { id: "patterns", label: "Resources" },
  { id: "machines", label: "Machines" },
  { id: "sewing", label: "Waiting List" },
  { id: "messages", label: "Messages" },
  { id: "newsletter", label: "Newsletter" },
];

type SewingFilter = "open" | "done" | "all";

const formatShortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  // Notifications link straight to a tab, e.g. /admin?tab=messages
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const requested = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null;
    return TABS.find(({ id }) => id === requested)?.id ?? "users";
  });
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [applications, setApplications] = useState<SewingApplication[]>([]);
  const [sewingFilter, setSewingFilter] = useState<SewingFilter>("open");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // New location state
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  // Pattern form state
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [patternForm, setPatternForm] = useState({
    title: "",
    description: "",
    image: "",
    pdfUrl: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // User form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "general",
  });

  // Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    dateTbc: "",
    startTime: "",
    endTime: "",
    timeTbc: "",
    location: "",
    description: "",
    registerLink: "",
    isUpcoming: true,
  });

  // Helper functions to convert between display format and input format
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const formatTimeForDisplay = (startTime: string, endTime: string): string => {
    if (!startTime) return "";
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const h = parseInt(hours);
      const period = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${minutes} ${period}`;
    };
    const start = formatTime(startTime);
    const end = endTime ? formatTime(endTime) : "";
    return end ? `${start} - ${end}` : start;
  };

  const parseDisplayDate = (displayDate: string): string => {
    if (!displayDate) return "";
    const date = new Date(displayDate);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const parseDisplayTime = (displayTime: string): { startTime: string; endTime: string } => {
    if (!displayTime) return { startTime: "", endTime: "" };
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const matches = [...displayTime.matchAll(timeRegex)];

    const convertTo24Hour = (match: RegExpMatchArray): string => {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[3].toUpperCase();
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    };

    return {
      startTime: matches[0] ? convertTo24Hour(matches[0]) : "",
      endTime: matches[1] ? convertTo24Hour(matches[1]) : "",
    };
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/");
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, activeTab]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (!data.error) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocationName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLocations([...locations, data.location].sort((a, b) => a.name.localeCompare(b.name)));
      setEventForm({ ...eventForm, location: data.location.name });
      setNewLocationName("");
      setShowNewLocation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
    }
  };

  const openInfoSheet = async (file: string, download = false) => {
    // Open the tab now, before awaiting, so mobile browsers don't block it
    const tab = download ? null : window.open("", "_blank");
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/info-sheets/${file}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Couldn't load the info sheet");
      const url = URL.createObjectURL(await res.blob());
      if (tab) {
        tab.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Couldn't load the info sheet");
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    setError("");
    try {
      if (activeTab === "users") {
        const token = await user?.getIdToken();
        const res = await fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsers(data.users || []);
      } else if (activeTab === "events") {
        const [eventsRes, locationsRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/locations"),
        ]);
        const eventsData = await eventsRes.json();
        const locationsData = await locationsRes.json();
        if (eventsData.error) throw new Error(eventsData.error);
        setEvents(eventsData.events || []);
        setLocations(locationsData.locations || []);
      } else if (activeTab === "patterns") {
        const res = await fetch("/api/patterns");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPatterns(data.patterns || []);
      } else if (activeTab === "messages") {
        const res = await fetch("/api/contact");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages(data.messages || []);
      } else if (activeTab === "sewing") {
        const token = await user?.getIdToken();
        const res = await fetch("/api/sewing-machines", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setApplications(data.applications || []);
      } else if (activeTab === "newsletter") {
        const res = await fetch("/api/newsletter");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSubscribers(data.subscribers || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShowUserForm(false);
      setUserForm({ email: "", password: "", displayName: "", role: "general" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleUpdateRole = async (uid: string, newRole: string) => {
    setError("");
    try {
      const res = await fetch("/api/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          role: newRole,
          adminSecret: prompt("Enter admin secret:"),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleUpdateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    setError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/sewing-machines/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setApplications((apps) =>
        apps.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application");
    }
  };

  const handleCreateOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PUT" : "POST";

      // Format date and time for storage
      // Use TBC message if no date is selected
      const displayDate = eventForm.date
        ? formatDateForDisplay(eventForm.date)
        : eventForm.dateTbc || "TBC";

      // Use custom time message if no start time is provided
      const displayTime = eventForm.startTime
        ? formatTimeForDisplay(eventForm.startTime, eventForm.endTime)
        : eventForm.timeTbc || "";

      const eventData = {
        title: eventForm.title,
        date: displayDate,
        time: displayTime,
        location: eventForm.location,
        description: eventForm.description,
        registerLink: eventForm.registerLink,
        isUpcoming: eventForm.isUpcoming,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setShowEventForm(false);
      setEditingEvent(null);
      setEventForm({
        title: "",
        date: "",
        dateTbc: "",
        startTime: "",
        endTime: "",
        timeTbc: "",
        location: "",
        description: "",
        registerLink: "",
        isUpcoming: true,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    const { startTime, endTime } = parseDisplayTime(event.time);
    const parsedDate = parseDisplayDate(event.date);
    const isDateTbc = !parsedDate && event.date;
    const isTimeTbc = !startTime && event.time;
    setEventForm({
      title: event.title,
      date: parsedDate,
      dateTbc: isDateTbc ? event.date : "",
      startTime,
      endTime,
      timeTbc: isTimeTbc ? event.time : "",
      location: event.location,
      description: event.description,
      registerLink: event.registerLink || "",
      isUpcoming: event.isUpcoming,
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    setError("");
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  // Pattern handlers
  const handleUploadFile = async (
    file: File,
    folder: string
  ): Promise<string> => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storageRef = ref(storage, `${folder}/${timestamp}-${safeName}`);
    try {
      await uploadBytes(storageRef, file);
    } catch (err) {
      if ((err as { code?: string }).code === "storage/unauthorized") {
        throw new Error(
          "Upload blocked by Firebase Storage permissions. Your admin account is fine; the storage rules can't check it yet."
        );
      }
      throw err;
    }
    return getDownloadURL(storageRef);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const url = await handleUploadFile(file, "patterns/images");
      setPatternForm((form) => ({ ...form, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setError("");
    try {
      const url = await handleUploadFile(file, "patterns/pdfs");
      setPatternForm((form) => ({ ...form, pdfUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleCreateOrUpdatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const url = editingPattern
        ? `/api/patterns/${editingPattern.id}`
        : "/api/patterns";
      const method = editingPattern ? "PUT" : "POST";

      const token = await user?.getIdToken();
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(patternForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setShowPatternForm(false);
      setEditingPattern(null);
      setPatternForm({
        title: "",
        description: "",
        image: "",
        pdfUrl: "",
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pattern");
    }
  };

  const handleEditPattern = (pattern: Pattern) => {
    setEditingPattern(pattern);
    setPatternForm({
      title: pattern.title,
      description: pattern.description,
      image: pattern.image,
      pdfUrl: pattern.pdfUrl,
    });
    setShowPatternForm(true);
  };

  const handleDeletePattern = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pattern?")) return;
    setError("");
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/patterns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete pattern");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  // Queue numbers follow application order among applications still in the queue
  const openApplications = applications.filter((app) => OPEN_STATUSES.includes(app.status));
  const queueNumbers = new Map(openApplications.map((app, i) => [app.id, i + 1]));
  const visibleApplications = applications.filter((app) =>
    sewingFilter === "all"
      ? true
      : sewingFilter === "open"
        ? queueNumbers.has(app.id)
        : !queueNumbers.has(app.id)
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>

      {/* Printable info sheets (built in print/, served admin-only) */}
      <div className={styles.infoSheets}>
        <button type="button" className="btn-accent" onClick={() => openInfoSheet("repair-programme.pdf")}>
          View info sheet (PDF)
        </button>
        <button type="button" className="btn-secondary" onClick={() => openInfoSheet("repair-programme.svg", true)}>
          Download SVG (editable)
        </button>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`${styles.tab} ${activeTab === id ? styles.activeTab : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {activeTab === "users" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Users</h2>
            <button
              className="btn-primary"
              onClick={() => setShowUserForm(!showUserForm)}
            >
              {showUserForm ? "Cancel" : "Add User"}
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleCreateUser} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={userForm.displayName}
                  onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Create User
              </button>
            </form>
          )}

          {loadingData ? (
            <p>Loading users...</p>
          ) : (
            <table className={`${styles.table} ${styles.stackedTable}`}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td data-label="Email" className={styles.breakable}>{u.email}</td>
                    <td data-label="Name">{u.displayName || "-"}</td>
                    <td data-label="Role">
                      <span className={`${styles.badge} ${styles[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td data-label="Change role">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.uid, e.target.value)}
                        disabled={u.uid === user?.uid}
                      >
                        <option value="general">General</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Events</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setShowEventForm(!showEventForm);
                setEditingEvent(null);
                setEventForm({
                  title: "",
                  date: "",
                  dateTbc: "",
                  startTime: "",
                  endTime: "",
                  timeTbc: "",
                  location: "",
                  description: "",
                  registerLink: "",
                  isUpcoming: true,
                });
              }}
            >
              {showEventForm ? "Cancel" : "Add Event"}
            </button>
          </div>

          <EditModal
            isOpen={showEventForm && !editingEvent}
            onClose={() => setShowEventForm(false)}
            title="Add Event"
          >
            <form onSubmit={handleCreateOrUpdateEvent} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date (optional)</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value, dateTbc: "" })}
                  />
                </div>
                {!eventForm.date && (
                  <div className={styles.formGroup}>
                    <label>Date Custom Message</label>
                    <input
                      type="text"
                      value={eventForm.dateTbc}
                      onChange={(e) => setEventForm({ ...eventForm, dateTbc: e.target.value })}
                      placeholder="e.g., TBC 2026"
                    />
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Start Time (optional)</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value, timeTbc: "" })}
                  />
                </div>
                {eventForm.startTime ? (
                  <div className={styles.formGroup}>
                    <label>End Time</label>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className={styles.formGroup}>
                    <label>Time Custom Message</label>
                    <input
                      type="text"
                      value={eventForm.timeTbc}
                      onChange={(e) => setEventForm({ ...eventForm, timeTbc: e.target.value })}
                      placeholder="e.g., Morning session"
                    />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Location</label>
                {showNewLocation ? (
                  <div className={styles.newLocationInput}>
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Enter new location"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAddLocation}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowNewLocation(false);
                        setNewLocationName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className={styles.locationSelect}>
                    <select
                      value={eventForm.location}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setShowNewLocation(true);
                        } else {
                          setEventForm({ ...eventForm, location: e.target.value });
                        }
                      }}
                      required
                    >
                      <option value="">Select a location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                      <option value="__new__">+ Add new location</option>
                    </select>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Register Link (optional)</label>
                <input
                  type="text"
                  value={eventForm.registerLink}
                  onChange={(e) => setEventForm({ ...eventForm, registerLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={eventForm.isUpcoming}
                    onChange={(e) => setEventForm({ ...eventForm, isUpcoming: e.target.checked })}
                  />
                  Upcoming Event
                </label>
              </div>
              <button type="submit" className="btn-primary">
                Create Event
              </button>
            </form>
          </EditModal>

          <EditModal
            isOpen={!!editingEvent}
            onClose={() => {
              setEditingEvent(null);
              setShowEventForm(false);
            }}
            title="Edit Event"
          >
            <form onSubmit={handleCreateOrUpdateEvent} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Date (optional)</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value, dateTbc: "" })}
                  />
                </div>
                {!eventForm.date && (
                  <div className={styles.formGroup}>
                    <label>Date Custom Message</label>
                    <input
                      type="text"
                      value={eventForm.dateTbc}
                      onChange={(e) => setEventForm({ ...eventForm, dateTbc: e.target.value })}
                      placeholder="e.g., TBC 2026"
                    />
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Start Time (optional)</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value, timeTbc: "" })}
                  />
                </div>
                {eventForm.startTime ? (
                  <div className={styles.formGroup}>
                    <label>End Time</label>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className={styles.formGroup}>
                    <label>Time Custom Message</label>
                    <input
                      type="text"
                      value={eventForm.timeTbc}
                      onChange={(e) => setEventForm({ ...eventForm, timeTbc: e.target.value })}
                      placeholder="e.g., Morning session"
                    />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Location</label>
                {showNewLocation ? (
                  <div className={styles.newLocationInput}>
                    <input
                      type="text"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="Enter new location"
                      autoFocus
                    />
                    <button type="button" className="btn-primary" onClick={handleAddLocation}>
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowNewLocation(false);
                        setNewLocationName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className={styles.locationSelect}>
                    <select
                      value={eventForm.location}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setShowNewLocation(true);
                        } else {
                          setEventForm({ ...eventForm, location: e.target.value });
                        }
                      }}
                      required
                    >
                      <option value="">Select a location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                      <option value="__new__">+ Add new location</option>
                    </select>
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Register Link (optional)</label>
                <input
                  type="text"
                  value={eventForm.registerLink}
                  onChange={(e) => setEventForm({ ...eventForm, registerLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={eventForm.isUpcoming}
                    onChange={(e) => setEventForm({ ...eventForm, isUpcoming: e.target.checked })}
                  />
                  Upcoming Event
                </label>
              </div>
              <button type="submit" className="btn-primary">
                Update Event
              </button>
            </form>
          </EditModal>

          {loadingData ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p className={styles.empty}>No events yet. Add your first event above.</p>
          ) : (
            <div className={styles.eventsList}>
              {events.map((event) => (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventInfo}>
                    <h3>{event.title}</h3>
                    <p className={styles.eventMeta}>
                      {event.date} | {event.time}
                    </p>
                    <p className={styles.eventMeta}>{event.location}</p>
                    <span className={`${styles.badge} ${event.isUpcoming ? styles.upcoming : styles.past}`}>
                      {event.isUpcoming ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  <div className={styles.eventActions}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleEditEvent(event)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "patterns" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Resources</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setShowPatternForm(!showPatternForm);
                setEditingPattern(null);
                setPatternForm({
                  title: "",
                  description: "",
                  image: "",
                  pdfUrl: "",
                });
              }}
            >
              {showPatternForm ? "Cancel" : "Add resource"}
            </button>
          </div>

          <EditModal
            isOpen={showPatternForm && !editingPattern}
            onClose={() => setShowPatternForm(false)}
            title="Add resource"
          >
            <form onSubmit={handleCreateOrUpdatePattern} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={patternForm.title}
                  onChange={(e) => setPatternForm({ ...patternForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={patternForm.description}
                  onChange={(e) => setPatternForm({ ...patternForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Preview Image</label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                  />
                  {uploadingImage && <p className={styles.uploading}>Uploading...</p>}
                  {patternForm.image && (
                    <div className={styles.filePreview}>
                      <img src={patternForm.image} alt="Preview" className={styles.imagePreview} />
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Pattern PDF</label>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className={styles.fileInput}
                  />
                  {uploadingPdf && <p className={styles.uploading}>Uploading...</p>}
                  {patternForm.pdfUrl && (
                    <div className={styles.filePreview}>
                      <a href={patternForm.pdfUrl} target="_blank" rel="noopener noreferrer">
                        View PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button
                type="submit"
                className="btn-primary"
                disabled={uploadingImage || uploadingPdf}
              >
                Create Pattern
              </button>
            </form>
          </EditModal>

          <EditModal
            isOpen={!!editingPattern}
            onClose={() => {
              setEditingPattern(null);
              setShowPatternForm(false);
            }}
            title="Edit Pattern"
          >
            <form onSubmit={handleCreateOrUpdatePattern} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  value={patternForm.title}
                  onChange={(e) => setPatternForm({ ...patternForm, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={patternForm.description}
                  onChange={(e) => setPatternForm({ ...patternForm, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Preview Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                />
                {uploadingImage && <p className={styles.uploading}>Uploading...</p>}
                {patternForm.image && (
                  <div className={styles.filePreview}>
                    <img src={patternForm.image} alt="Preview" className={styles.imagePreview} />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Pattern PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className={styles.fileInput}
                />
                {uploadingPdf && <p className={styles.uploading}>Uploading...</p>}
                {patternForm.pdfUrl && (
                  <div className={styles.filePreview}>
                    <a href={patternForm.pdfUrl} target="_blank" rel="noopener noreferrer">
                      View PDF
                    </a>
                  </div>
                )}
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button
                type="submit"
                className="btn-primary"
                disabled={uploadingImage || uploadingPdf}
              >
                Update Pattern
              </button>
            </form>
          </EditModal>

          {loadingData ? (
            <p>Loading patterns...</p>
          ) : patterns.length === 0 ? (
            <p className={styles.empty}>No patterns yet. Add your first pattern above.</p>
          ) : (
            <div className={styles.patternsList}>
              {patterns.map((pattern) => (
                <div key={pattern.id} className={styles.patternCard}>
                  {pattern.image && (
                    <img
                      src={pattern.image}
                      alt={pattern.title}
                      className={styles.patternImage}
                    />
                  )}
                  <div className={styles.patternInfo}>
                    <h3>{pattern.title}</h3>
                    <p className={styles.patternDescription}>{pattern.description}</p>
                    {pattern.pdfUrl && (
                      <a
                        href={pattern.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.pdfLink}
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                  <div className={styles.patternActions}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleEditPattern(pattern)}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeletePattern(pattern.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "machines" && <MachinesPanel user={user} />}

      {activeTab === "sewing" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Sewing Machine Waiting List</h2>
            <span className={styles.subscriberCount}>
              {openApplications.length} in queue
            </span>
          </div>

          <div className={styles.filterGroup} role="group" aria-label="Filter applications">
            {(
              [
                ["open", `In queue (${openApplications.length})`],
                ["done", `Done (${applications.length - openApplications.length})`],
                ["all", `All (${applications.length})`],
              ] as [SewingFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={`${styles.filterChip} ${sewingFilter === value ? styles.filterChipActive : ""}`}
                aria-pressed={sewingFilter === value}
                onClick={() => setSewingFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingData ? (
            <p>Loading applications...</p>
          ) : visibleApplications.length === 0 ? (
            <p className={styles.empty}>
              {sewingFilter === "open" ? "Nobody is waiting right now." : "No applications here."}
            </p>
          ) : (
            <div className={styles.applicationsList}>
              {visibleApplications.map((app) => {
                const queueNumber = queueNumbers.get(app.id);
                return (
                  <div key={app.id} className={styles.applicationCard}>
                    <div className={styles.queueNumber} aria-label={queueNumber ? `Queue number ${queueNumber}` : "Not in queue"}>
                      {queueNumber ? `#${queueNumber}` : "–"}
                    </div>
                    <div className={styles.applicationInfo}>
                      <h3>{app.fullName}</h3>
                      <div className={styles.applicationTags}>
                        <span className={`${styles.badge} ${styles.past}`}>
                          {app.applicantType === "communityGroup" ? "Organisation" : "Individual"}
                        </span>
                        <span
                          className={`${styles.badge} ${app.area === "West Auckland" ? styles.upcoming : styles.past}`}
                        >
                          {app.area}
                        </span>
                      </div>
                      {app.groupName && (
                        <p className={styles.eventMeta}>Organisation: {app.groupName}</p>
                      )}
                      <p className={styles.applicationContact}>
                        <a href={`mailto:${app.email}`}>{app.email}</a>
                        <a href={`tel:${app.phone.replace(/[^\d+]/g, "")}`}>{app.phone}</a>
                      </p>
                      {app.machineNumber && (
                        <p className={styles.eventMeta}>Assigned machine #{app.machineNumber}</p>
                      )}
                      <p className={styles.messageDate}>Applied {formatShortDate(app.createdAt)}</p>
                    </div>
                    <div className={styles.applicationStatus}>
                      <label htmlFor={`status-${app.id}`}>Status</label>
                      <select
                        id={`status-${app.id}`}
                        value={app.status}
                        disabled={!!app.machineNumber}
                        title={app.machineNumber ? "Managed from the Machines tab" : undefined}
                        onChange={(e) =>
                          handleUpdateApplicationStatus(app.id, e.target.value as ApplicationStatus)
                        }
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "messages" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Contact Messages</h2>
          </div>
          {loadingData ? (
            <p>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className={styles.empty}>No contact messages yet.</p>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((msg) => (
                <div key={msg.id} className={styles.messageCard}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageName}>{msg.name}</span>
                    <span className={styles.messageEmail}>{msg.email}</span>
                    {msg.createdAt && (
                      <span className={styles.messageDate}>{formatShortDate(msg.createdAt)}</span>
                    )}
                  </div>
                  <p className={styles.messageBody}>{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "newsletter" && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Newsletter Subscribers</h2>
            <span className={styles.subscriberCount}>{subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}</span>
          </div>
          {loadingData ? (
            <p>Loading subscribers...</p>
          ) : subscribers.length === 0 ? (
            <p className={styles.empty}>No subscribers yet.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td className={styles.breakable}>{sub.email}</td>
                    <td className={styles.nowrap}>{formatShortDate(sub.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

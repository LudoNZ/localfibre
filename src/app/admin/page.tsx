"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import styles from "./Admin.module.css";

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

type Tab = "users" | "events" | "patterns";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
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

  const fetchData = async () => {
    setLoadingData(true);
    setError("");
    try {
      if (activeTab === "users") {
        const res = await fetch("/api/users");
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
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const url = await handleUploadFile(file, "patterns/images");
      setPatternForm({ ...patternForm, image: url });
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
      setPatternForm({ ...patternForm, pdfUrl: url });
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/patterns/${id}`, { method: "DELETE" });
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Dashboard</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === "events" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("events")}
        >
          Events
        </button>
        <button
          className={`${styles.tab} ${activeTab === "patterns" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("patterns")}
        >
          Patterns
        </button>
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
            <table className={styles.table}>
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
                    <td>{u.email}</td>
                    <td>{u.displayName || "-"}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
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

          {showEventForm && (
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
                <br/>
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
                {editingEvent ? "Update Event" : "Create Event"}
              </button>
            </form>
          )}

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
            <h2>Patterns</h2>
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
              {showPatternForm ? "Cancel" : "Add Pattern"}
            </button>
          </div>

          {showPatternForm && (
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
                <br/>
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
              <button
                type="submit"
                className="btn-primary"
                disabled={uploadingImage || uploadingPdf}
              >
                {editingPattern ? "Update Pattern" : "Create Pattern"}
              </button>
            </form>
          )}

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
    </div>
  );
}

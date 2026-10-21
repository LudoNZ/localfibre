// Local Fibre service worker: makes the site installable, shows an
// offline page when there's no connection, and shows admin push
// notifications. Pages are always fetched from the network, so nothing
// stale is ever served.
const CACHE = "localfibre-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Local Fibre", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      data: { url: data.url || "/admin" },
    })
  );
});

// Tapping a notification focuses an open Local Fibre window, or opens one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) {
        // navigate() only works on pages this worker controls
        return open
          .navigate(url)
          .then((client) => (client || open).focus())
          .catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    })
  );
});

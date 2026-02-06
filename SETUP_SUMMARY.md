# Local Fibre - Setup Summary

## Overview

This document summarizes the setup and configuration work done to add authentication, admin functionality, and production deployment to the Local Fibre website.

---

## 1. Authentication System

### What we built:
- **Login Modal** - A discreet "Sign in" button in the navigation that opens a modal (not a separate page)
- **Firebase Authentication** - Email/password authentication using Firebase Auth
- **Auth Context** - React context (`AuthContext.tsx`) that manages user state across the app

### Files created:
- `src/lib/firebase.ts` - Firebase client SDK configuration
- `src/context/AuthContext.tsx` - Auth context with signIn/signOut functions
- `src/components/ui/LoginModal.tsx` - Login modal component
- `src/components/ui/LoginModal.module.css` - Modal styles

---

## 2. Role-Based Accounts

### What we built:
- Two tiers: `admin` and `general`
- Roles stored in Firestore `users` collection
- `isAdmin` flag available throughout the app
- Admin-only features (cog icon linking to `/admin`)

### How it works:
1. User signs in via Firebase Auth
2. App fetches their role from Firestore `users/{uid}` document
3. `isAdmin` boolean is available via `useAuth()` hook

### Setting a user's role:
```bash
curl -X POST https://localfibre.co.nz/api/users/role \
  -H "Content-Type: application/json" \
  -d '{"uid": "USER_UID", "role": "admin", "adminSecret": "YOUR_SECRET"}'
```

---

## 3. Admin Dashboard

### What we built:
- Protected `/admin` route (redirects non-admins)
- Three tabs: **Users**, **Events**, **Patterns**

### Users Tab:
- View all users
- Add new users (creates Firebase Auth account + Firestore role)
- Change user roles

### Events Tab:
- View/add/edit/delete events
- Date picker with optional "TBC" custom message
- Time picker with optional custom message
- Location dropdown with ability to add new locations

### Patterns Tab:
- View/add/edit/delete patterns
- Image upload (Firebase Storage)
- PDF upload (Firebase Storage)

### Files created:
- `src/app/admin/page.tsx` - Admin dashboard
- `src/app/admin/Admin.module.css` - Dashboard styles
- `src/app/api/users/route.ts` - List/create users
- `src/app/api/users/role/route.ts` - Update user roles
- `src/app/api/events/route.ts` - List/create events
- `src/app/api/events/[id]/route.ts` - Update/delete events
- `src/app/api/locations/route.ts` - List/create locations
- `src/app/api/patterns/route.ts` - List/create patterns
- `src/app/api/patterns/[id]/route.ts` - Update/delete patterns

---

## 4. Data Migration to Firestore

### What changed:
- Events moved from static file (`src/data/events.ts`) to Firestore
- Patterns moved from static file (`src/data/patterns.ts`) to Firestore
- Pages now fetch data server-side from Firestore

### Server-side data fetching:
- `src/lib/events.ts` - Fetch events from Firestore
- `src/lib/patterns.ts` - Fetch patterns from Firestore

---

## 5. Firestore Security Rules

### File: `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Contact form - public create
    match /contactMessages/{docId} { ... }

    // Newsletter - public create
    match /newsletterSubscriptions/{docId} { ... }

    // Users - authenticated users read own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }

    // Events, Locations, Patterns - publicly readable
    match /events/{eventId} { allow read: if true; }
    match /locations/{locationId} { allow read: if true; }
    match /patterns/{patternId} { allow read: if true; }
  }
}
```

### Deploying rules:
```bash
firebase deploy --only firestore:rules
```

---

## 6. Deployment to Vercel

### Why Vercel instead of Firebase Hosting?
The site was originally configured for **static export** (`output: "export"` in next.config.ts). Once we added:
- API routes (`/api/*`)
- Server-side data fetching
- Dynamic pages

...we needed **server-side rendering (SSR)**, which requires a Node.js runtime. Firebase Hosting only serves static files. Vercel handles Next.js SSR natively.

### Deployment steps:
1. Installed Vercel CLI: `npm install -g vercel`
2. Ran `vercel` to link project and deploy
3. Added environment variables in Vercel dashboard
4. Deployed to production: `vercel --prod`

### Environment variables needed in Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_SECRET`

---

## 7. Custom Domain Setup

### DNS Configuration (Squarespace Domains):

Deleted old Firebase records and added:
| Type | Host | Value |
|------|------|-------|
| A | @ | `216.198.79.1` |
| CNAME | www | `063552a063ae0873.vercel-dns-017.com` |

Then added domain in Vercel project settings.

---

## 8. Firebase Storage CORS Configuration

### Why we needed this:
When uploading files (pattern images/PDFs) from the browser to Firebase Storage, the browser blocks requests to different domains unless CORS (Cross-Origin Resource Sharing) is configured.

### Why Google Cloud CLI (gsutil)?
Firebase Storage is built on Google Cloud Storage. CORS configuration is done at the bucket level using `gsutil`, which is part of the Google Cloud SDK.

### Setup steps:
1. Installed Google Cloud SDK:
   ```bash
   curl -sSL https://sdk.cloud.google.com | bash
   ```

2. Authenticated:
   ```bash
   gcloud auth login
   gcloud config set project localfibre
   ```

3. Created `cors.json`:
   ```json
   [
     {
       "origin": [
         "http://localhost:3000",
         "https://localfibre.co.nz",
         "https://www.localfibre.co.nz",
         "https://localfibre.vercel.app"
       ],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
     }
   ]
   ```

4. Applied CORS config:
   ```bash
   gsutil cors set cors.json gs://localfibre.firebasestorage.app
   ```

### Note:
Before running gsutil, Firebase Storage must be initialized in Firebase Console (Storage → Get Started).

---

## Summary of Services Used

| Service | Purpose |
|---------|---------|
| **Firebase Auth** | User authentication |
| **Firestore** | Database for users, events, locations, patterns |
| **Firebase Storage** | File uploads (images, PDFs) |
| **Vercel** | Hosting with SSR support |
| **Squarespace Domains** | Domain DNS management |
| **Google Cloud SDK** | Configure Firebase Storage CORS |

---

## Useful Commands

```bash
# Local development
npm run dev

# Build
npm run build

# Deploy to Vercel
vercel --prod

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Check/update Storage CORS
gsutil cors get gs://localfibre.firebasestorage.app
gsutil cors set cors.json gs://localfibre.firebasestorage.app
```

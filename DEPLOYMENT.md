# Firebase Deployment Guide

## Prerequisites

✅ Firebase tools installed (`firebase-tools` package)
✅ Next.js configured for static export
✅ Firebase configuration files created

## Steps to Deploy

### 1. Login to Firebase

```bash
npm run firebase:login
```

This will open your browser to authenticate with your Google account that has access to the Firebase project.

### 2. Initialize Firebase Hosting (if not already done)

If this is the first time setting up this project:

```bash
npm run firebase:init
```

When prompted:
- **What do you want to use as your public directory?** → Type `out` (this matches our Next.js static export)
- **Configure as a single-page app (rewrite all urls to /index.html)?** → Yes (type `y`)
- **Set up automatic builds and deploys with GitHub?** → No (unless you want CI/CD)
- **File out/index.html already exists. Overwrite?** → No (unless you want to overwrite)

### 3. Select Your Existing Firebase Project

When initializing, you'll see a list of your Firebase projects. Select the one that hosts your current placeholder site.

Or manually set the project in `.firebaserc`:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 4. Build and Deploy

```bash
npm run deploy
```

This will:
1. Build your Next.js site (creates the `out` folder)
2. Deploy to Firebase Hosting

### 5. Verify Deployment

After deployment, Firebase will provide you with a URL like:
- `https://your-project-id.web.app`
- `https://your-project-id.firebaseapp.com`

## Manual Deployment Steps

If you prefer to run steps separately:

```bash
# Build the site
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Updating the Site

To update your deployed site, simply run:

```bash
npm run deploy
```

## Troubleshooting

### "Firebase project not found"
- Make sure you're logged in: `firebase login`
- Verify your project ID in `.firebaserc`
- Check that you have the correct permissions for the Firebase project

### "Directory out does not exist"
- Make sure you've run `npm run build` first
- Check that `next.config.ts` has `output: "export"`

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check for linting errors: `npm run lint`
- Verify Next.js build works: `npm run build`


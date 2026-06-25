# JobsEdge AI - AI-Powered Job Search & Career Assistant

JobsEdge AI is a highly polished, single-page application built with React, Vite, Tailwind CSS, and Firebase. It features a personalized AI recommendation engine, speech-to-text keyword searches, resume tailoring, and real-time job-tracking capabilities.

---

## 🚀 Deploying to Vercel

This repository is pre-configured and optimized for seamless, single-click deployments on **Vercel**.

### Step 1: Push to GitHub / GitLab / Bitbucket
Ensure your project files (including `firebase-applet-config.json` which contains your Firebase connection settings) are committed and pushed to your git repository.

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your JobsEdge AI repository.

### Step 3: Configure Project Settings
Vercel will automatically detect the **Vite** framework preset and configure the following settings:
- **Framework Preset:** `Vite`
- **Build Command:** `npm run build` (runs `vite build`)
- **Output Directory:** `dist`

### Step 4: Configure Environment Variables
Before clicking **Deploy**, expand the **Environment Variables** section and add the following keys:

| Key | Description | Example / Source |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Required.** Your Gemini API key for all AI insights, recommendations, and speech processing. | Obtain from [Google AI Studio](https://aistudio.google.com/) |
| `VITE_LINKEDIN_CLIENT_ID` | *Optional.* LinkedIn Client ID if utilizing LinkedIn sign-in integrations. | LinkedIn Developer Portal |

> 💡 **Tip:** You can name your API key either `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`. The custom Vite configuration is designed to recognize and bundle both formats during the production build.

### Step 5: Click Deploy!
Click **Deploy**. Vercel will bundle the static assets, compile the TypeScript code, and provide you with a production-ready live URL within minutes.

---

## 🛠️ Key Configurations Included for Vercel

- **SPA Router Support (`vercel.json`):** Configures clean rewrites so that page reloads or direct navigation to nested URL paths are routed directly to `index.html`, allowing React client-side routing to function flawlessly without throwing 404 errors.
- **Robust API Key Loading (`src/lib/ai.ts`):** Includes lazy loading and fallback guards for the Gemini SDK to prevent build-time crashes or startup errors if the environment variables are not yet populated.
- **Firebase Persistence (`src/lib/firebase.ts`):** Firebase config settings are read dynamically from `firebase-applet-config.json`, which is committed to source control to ensure persistent Firestore connectivity across development and deployment.

---

## 💻 Local Development

To run this project locally, execute the following commands in your terminal:

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Your server will be running at `http://localhost:3000`.

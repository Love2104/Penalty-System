# Election Commission Penalty System - Frontend

This is the frontend user interface for the EC Penalty Management System, built with Next.js and intended for Firebase App Hosting or another Next.js-compatible hosting platform.

## Tech Stack
* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Animations:** Framer Motion
* **Icons:** Lucide React
* **Data Fetching:** Axios

## Prerequisites
* Node.js (v18+)
* npm

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create `frontend/.env.local` from [`frontend/.env.example`](./.env.example):
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000/api"
   ```

3. **Backend Configuration:**
   Ensure the backend is running on `http://localhost:5000`. The frontend uses Axios configured in `src/lib/api.ts` to route requests to `NEXT_PUBLIC_API_URL`.

## Running the Application

**Development Mode:**
```bash
npm run dev
```

## Deployment Notes

* Preferred Firebase target: Firebase App Hosting
* App root directory for Firebase App Hosting: `frontend`
* Production API env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`

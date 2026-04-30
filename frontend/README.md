# Election Commission Penalty System - Frontend

This is the frontend user interface for the EC Penalty Management System, built to be responsive, secure, and visually premium.

## Tech Stack
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (v4 structure)
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

2. **Backend Configuration:**
   Ensure the backend is running on `http://localhost:5000`. The frontend uses Axios interceptors configured in `src/lib/api.ts` to automatically route requests to this URL.

## Running the Application

**Development Mode:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## Important Routes (Pages)

* **`/` (Login Page)**
  * The entry point of the app. Handles OTP requests and verification. Unauthenticated users are redirected here.
* **`/dashboard`**
  * Overview page showing quick statistics, recent penalty sheets, and analytics. Protected route.
* **`/students`**
  * Advanced student database search. Features debounced searching and extensive filtering (by Hall, Department, Program, etc.).
* **`/sheets`**
  * List of all penalty sheets in the system. Allows EC members to create new draft sheets.
* **`/sheets/[id]`**
  * The core editor interface. EC members can add penalty rows with student auto-complete here. SuperAdmins (CEO) use this page to review, reject, approve, and dispatch emails for the sheet.

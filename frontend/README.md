# Election Commission Penalty System - Frontend

This is the Next.js frontend for the EC Penalty Management System. The login flow now uses **Firebase Phone OTP** on mobile numbers.

## Tech Stack
* **Framework:** Next.js
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Animations:** Framer Motion
* **HTTP Client:** Axios

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `frontend/.env.local` from `frontend/.env.example`.

3. Add the backend URL and Firebase web config:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000/api"
   NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-web-api-key"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
   NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"
   ```

4. For free local testing with Firebase fictional phone numbers, also add:
   ```env
   NEXT_PUBLIC_FIREBASE_APP_VERIFICATION_DISABLED="true"
   NEXT_PUBLIC_FIREBASE_TEST_PHONE_NUMBER="+919876543210"
   NEXT_PUBLIC_FIREBASE_TEST_OTP="123456"
   ```

5. Start the frontend:
   ```bash
   npm run dev
   ```

## Login flow

1. User enters a mobile number.
2. Firebase sends or simulates the OTP verification.
3. The user enters the 6-digit code.
4. The frontend sends the Firebase ID token to the backend.
5. The backend verifies the token and returns the app JWT for an approved phone number.

## Important notes

* Public Firebase web config belongs in the frontend.
* Firebase Admin credentials belong in the backend only.
* Fictional phone numbers are the recommended no-cost local testing setup.
* Real SMS delivery depends on your Firebase phone-auth billing/quota setup.

See [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md) for the full end-to-end setup.

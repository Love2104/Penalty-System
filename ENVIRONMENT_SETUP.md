# Environment Setup

This project now uses **Firebase Phone OTP** for sign-in. The frontend sends the OTP, Firebase verifies the phone user, and the backend then issues the app JWT only if that phone number is already approved in your database.

## What "free of cost" means here

Based on Firebase's current official docs:

* **Fictional test phone numbers** are the safest free way to develop and test. No real SMS is sent.
* **Real phone OTP SMS** is not something you should assume is fully free. Firebase documents phone-auth pricing and limits separately, and real SMS delivery depends on your plan, region policy, quota, and billing setup.
* For this project, the practical zero-cost setup is: build the whole system with Firebase Phone Auth, test locally with fictional phone numbers, then switch to real SMS only when you are ready.

Official references:
* [Firebase Web phone auth](https://firebase.google.com/docs/auth/web/phone-auth?hl=en)
* [Firebase Auth limits](https://firebase.google.com/docs/auth/limits)

## 1. Backend setup

Copy [`backend/.env.sample`](./backend/.env.sample) to `backend/.env`.

Use values like this:

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
DIRECT_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"

SUPERADMIN_PHONE="+919876543210"
# SUPERADMIN_PHONES="+919876543210,+919812345678"

FRONTEND_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000,https://your-frontend-domain.web.app,https://your-frontend-domain.firebaseapp.com"
PORT=5000

FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_AUTH_SERVICE_ACCOUNT="./secrets/firebase-service-account.json"

GOOGLE_APPLICATION_CREDENTIALS="./secrets/google-service-account.json"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM_NAME="IITK Election Commission"
SMTP_FROM_EMAIL="your-email@gmail.com"
```

Important:

* `SUPERADMIN_PHONE` is now the seed entry point for the first privileged user.
* The backend expects approved users to be stored with phone numbers in **E.164** format, for example `+919876543210`.
* `FIREBASE_AUTH_SERVICE_ACCOUNT` must point to your Firebase Admin service-account JSON.

### Alternative backend Firebase Admin configuration

If you do not want to use a local JSON file, you can use either of these instead:

```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

or

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

## 2. Frontend setup

Copy `frontend/.env.example` to `frontend/.env.local`.

Use values like this:

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

For free local testing with fictional phone numbers, also set:

```env
NEXT_PUBLIC_FIREBASE_APP_VERIFICATION_DISABLED="true"
NEXT_PUBLIC_FIREBASE_TEST_PHONE_NUMBER="+919876543210"
NEXT_PUBLIC_FIREBASE_TEST_OTP="123456"
```

Never put private secrets in frontend env files. Anything prefixed with `NEXT_PUBLIC_` is exposed in the browser.

## 3. Firebase Console setup

Do this in the Firebase Console for the same project whose web config and service account you are using.

### A. Create or open the project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Create a project or open your existing project.

### B. Add the web app

1. Open **Project settings**.
2. In **Your apps**, add a **Web app**.
3. Copy the Firebase web config values into `frontend/.env.local`.

### C. Enable phone authentication

1. Open **Authentication**.
2. Open **Sign-in method**.
3. Enable **Phone**.
4. Open the auth settings page and set the SMS region policy if Firebase asks for it.
5. Add your deployed web domain to the allowed/authorized domains list when you deploy.

### D. Add fictional phone numbers for free testing

1. In **Authentication** -> **Sign-in method** -> **Phone**, open **Phone numbers for testing**.
2. Add a fictional number, for example `+919876543210`.
3. Set a fixed 6-digit code, for example `123456`.
4. Put the same values into:
   * `NEXT_PUBLIC_FIREBASE_TEST_PHONE_NUMBER`
   * `NEXT_PUBLIC_FIREBASE_TEST_OTP`

This is the recommended no-cost way to finish the setup and test the whole login flow.

### E. Download Firebase Admin service account JSON

1. Open **Project settings**.
2. Go to **Service accounts**.
3. Click **Generate new private key**.
4. Save the JSON file locally, for example at `backend/secrets/firebase-service-account.json`.
5. Set:

```env
FIREBASE_AUTH_SERVICE_ACCOUNT="./secrets/firebase-service-account.json"
```

Do not commit this JSON file to Git.

## 4. Database and seed setup

From `backend/` run:

```bash
npx prisma db push
npx prisma generate
npx prisma db seed
```

What this does:

* creates or updates your schema
* creates the seeded `SUPERADMIN` user from `SUPERADMIN_PHONE`
* seeds the clauses
* optionally imports students if `STUDENT_SEED_PATH` is configured

## 5. Start the project

In one terminal:

```bash
cd backend
npm install
npm run dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open:

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend health: [http://localhost:5000/api/health](http://localhost:5000/api/health)

The health endpoint should show `firebase-phone-otp` as the auth method.

## 6. First superadmin login flow

1. Seed the backend with `SUPERADMIN_PHONE`.
2. Open the app.
3. Enter the same mobile number on the login page.
4. If you are using fictional testing, use the configured fixed OTP.
5. After login, open the **Admin** page.
6. Add more approved mobile numbers there for `ADMIN` or `SUPERADMIN`.

Only numbers registered in your database can enter the app after Firebase verification.

## 7. Real SMS later

When you are ready to move from fictional testing to real OTP:

1. Keep the Phone sign-in method enabled in Firebase.
2. Remove or disable the local testing overrides:

```env
NEXT_PUBLIC_FIREBASE_APP_VERIFICATION_DISABLED="false"
NEXT_PUBLIC_FIREBASE_TEST_PHONE_NUMBER=""
NEXT_PUBLIC_FIREBASE_TEST_OTP=""
```

3. Use a real approved phone number already registered in the admin panel or seed.
4. Verify your Firebase plan, region policy, SMS quota, and billing setup before expecting live SMS delivery.

## 8. Production notes

For production deployments:

1. Put backend secrets in your platform secret manager:
   * `DATABASE_URL`
   * `DIRECT_URL`
   * `JWT_SECRET`
   * `SUPERADMIN_PHONE` or `SUPERADMIN_PHONES`
   * Firebase Admin credentials
   * Google Sheets credentials
   * SMTP credentials
2. Set `FRONTEND_URL` and `CORS_ORIGINS` to your real frontend domains.
3. Add those domains in Firebase Authentication authorized domains.
4. Run `npx prisma db push`.
5. Run `npx prisma db seed` once.

## 9. Quick troubleshooting

### `auth/billing-not-enabled`

Your Firebase project is not currently set up for live SMS delivery. Use fictional test numbers for free development, or configure the Firebase plan/billing path needed for real SMS.

### `Unauthorized phone number. Please contact the superadmin for access.`

Firebase OTP worked, but that number is not registered in your app database yet. Add it through seed or the Admin page.

### `Missing Firebase web config`

One or more `NEXT_PUBLIC_FIREBASE_*` values are missing in `frontend/.env.local`.

### Backend login fails after OTP verify

Check:

* `FIREBASE_PROJECT_ID`
* `FIREBASE_AUTH_SERVICE_ACCOUNT`
* the Firebase project used by the frontend and backend must be the same

### CORS problems

Make sure the frontend origin is present in `CORS_ORIGINS`.

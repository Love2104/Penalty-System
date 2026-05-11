# Election Commission Penalty System - Backend

This backend powers the IITK Election Commission penalty system. It exposes REST APIs for student search, sheet workflows, role intelligence, and phone-OTP-based authentication.

## Tech Stack
* **Runtime:** Node.js
* **Framework:** Express with TypeScript
* **Database:** PostgreSQL with Prisma
* **Authentication:** Firebase Phone Auth on the frontend, Firebase Admin token verification on the backend, then app JWT issuance
* **Authorization:** JWT middleware plus role checks (`ADMIN`, `SUPERADMIN`)

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `backend/.env` from [`backend/.env.sample`](./.env.sample) and fill in the important values:
   ```env
   DATABASE_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
   DIRECT_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
   JWT_SECRET="replace-with-a-long-random-secret"
   JWT_EXPIRES_IN="7d"
   SUPERADMIN_PHONE="+919876543210"
   FRONTEND_URL="http://localhost:3000"
   CORS_ORIGINS="http://localhost:3000"
   FIREBASE_PROJECT_ID="your-firebase-project-id"
   FIREBASE_AUTH_SERVICE_ACCOUNT="./secrets/firebase-service-account.json"
   GOOGLE_APPLICATION_CREDENTIALS="./secrets/google-service-account.json"
   ```

3. Push the Prisma schema and generate the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. Seed the database. This creates the superadmin user from `SUPERADMIN_PHONE`, seeds clause data, and optionally imports students if `STUDENT_SEED_PATH` is set:
   ```bash
   npx prisma db seed
   ```

5. Start the backend:
   ```bash
   npm run dev
   ```

Full cross-project setup is documented in [ENVIRONMENT_SETUP.md](../ENVIRONMENT_SETUP.md).

## Phone OTP Flow

1. The frontend uses Firebase Web Phone Auth and `signInWithPhoneNumber`.
2. Firebase verifies the OTP and returns a Firebase ID token.
3. The frontend sends that ID token to `POST /api/auth/firebase-phone-login`.
4. The backend verifies the Firebase token with Firebase Admin.
5. The backend looks up the approved user by phone number in the database and issues the app JWT.

Only mobile numbers already registered in the `User` table are allowed to enter the system.

## Important API Routes

### Authentication
* `POST /api/auth/firebase-phone-login` - Verify a Firebase phone-auth ID token and receive the app JWT.
* `POST /api/auth/register` - Superadmin-only route to register an approved mobile number for `ADMIN` or `SUPERADMIN`.
* `GET /api/auth/users` - Superadmin-only list of privileged users.

### Students
* `GET /api/students/search` - Search students with filters and pagination.

### Sheets
* `GET /api/sheets` - List sheets.
* `POST /api/sheets` - Create a sheet.
* `GET /api/sheets/:id` - Get a sheet with rows and review history.
* `POST /api/sheets/:id/rows` - Add a penalty row.
* `DELETE /api/sheets/:id/rows/:rowId` - Remove a penalty row.
* `POST /api/sheets/:id/status` - Move a sheet through the workflow and send emails when dispatching.

## Notes

* Real phone OTP delivery depends on your Firebase phone-auth billing/quota setup.
* Firebase fictional phone numbers are the easiest zero-cost way to test locally.
* Keep Firebase service-account JSON and Google service-account JSON out of Git.

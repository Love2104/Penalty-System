# Election Commission Penalty System - Backend

This is the backend service for the Election Commission Penalty Management System for IIT Kanpur. It provides secure RESTful APIs to manage students, authentications, and penalty sheets.

## Tech Stack
* **Runtime:** Node.js
* **Framework:** Express with TypeScript
* **Database:** PostgreSQL (Prisma ORM), tested for Neon/serverless Postgres deployments
* **Authentication:** JWT & OTP-based verification
* **Validation:** JWT Middlewares & Role-based Access Control

## Prerequisites
* Node.js (v18+)
* npm

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create `backend/.env` from [`backend/.env.sample`](./.env.sample):
   ```env
   DATABASE_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
   DIRECT_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
   JWT_SECRET="replace-with-a-long-random-secret"
   JWT_EXPIRES_IN="7d"
   SUPERADMIN_EMAIL="superadmin@iitk.ac.in"
   SMTP_HOST="smtp.resend.com"
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER="resend"
   SMTP_PASS="re_xxxxxxxxxxxxxxxxx"
   FRONTEND_URL="http://localhost:3000"
   PORT=5000
   GOOGLE_APPLICATION_CREDENTIALS="./secrets/google-service-account.json"
   STUDENT_SEED_PATH="C:/path/to/students.json"
   ```

   `SUPERADMIN_EMAIL` is now env-driven on purpose. The seed command will fail if you do not set it.

   If you use Neon in production, keep the pooled connection string in `DATABASE_URL` and the non-pooled direct connection string in `DIRECT_URL`. Prisma recommends a direct connection for CLI tasks such as schema pushes and migrations when your runtime uses a pooler.

   For Google Sheets access, keep the service-account JSON file local and out of Git. The backend supports either of these options:
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to a local JSON file path such as `./secrets/google-service-account.json`
   - Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the full JSON string in the environment

   Setup details for both backend and frontend env files, plus the Google credential download flow, are documented in [`../ENVIRONMENT_SETUP.md`](../ENVIRONMENT_SETUP.md).

3. **Database Configuration:**
   Start PostgreSQL locally, or point your env file at Neon, then push the Prisma schema and generate the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed Initial Data:**
   Seed the database with default clauses, the superadmin account from env, and optionally the student dataset if `STUDENT_SEED_PATH` is configured:
   ```bash
   npx prisma db seed
   ```

## Running the Server

**Development Mode:**
```bash
npm run dev
```
The server will start on `http://localhost:5000` with `nodemon` for auto-restarting on changes.

---

## Important API Routes

All routes (except `/auth/*`) require a valid JWT token passed in the `Authorization: Bearer <token>` header.

### Authentication
* `POST /api/auth/login` - Request an OTP for a valid email (e.g., `@iitk.ac.in`).
* `POST /api/auth/verify-otp` - Verify the OTP and receive a JWT token.

### Students
* `GET /api/students/search` - Advanced search for students.
  * **Query Params:** `q` (search term), `page`, `limit`, `roll`, `name`, `dept`, `hall`, `program`, `gender`, `blood_group`.

### Sheets
* `POST /api/sheets` - Create a new penalty sheet (Requires Auth).
* `GET /api/sheets` - Get all sheets.
* `GET /api/sheets/:id` - Get specific sheet details (including rows).
* `POST /api/sheets/:id/rows` - Add a student penalty row to a DRAFT sheet.
* `DELETE /api/sheets/:id/rows/:rowId` - Remove a row from a sheet.
* `POST /api/sheets/:id/status` - Change the status of a sheet (e.g., `DRAFT` -> `UNDER_REVIEW`). Superadmins can approve and send.

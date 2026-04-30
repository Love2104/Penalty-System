# Election Commission Penalty System - Backend

This is the backend service for the Election Commission Penalty Management System for IIT Kanpur. It provides secure RESTful APIs to manage students, authentications, and penalty sheets.

## Tech Stack
* **Runtime:** Node.js
* **Framework:** Express with TypeScript
* **Database:** SQLite (managed via Prisma ORM)
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
   A `.env` file should be present in the root directory. If not, create one:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="supersecret_jwt_key_for_testing"
   JWT_EXPIRES_IN="7d"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=465
   SMTP_USER="test@gmail.com"
   SMTP_PASS="test"
   FRONTEND_URL="http://localhost:3000"
   PORT=5000
   ```

3. **Database Configuration:**
   Push the Prisma schema to the SQLite database and generate the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed Initial Data:**
   Seed the database with default clauses, the CEO account, and the student dataset:
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
* `POST /api/auth/login` - Request an OTP for a valid email (e.g., `@iitk.ac.in`). *(Note: In local dev, the OTP is printed to the terminal console, not emailed).*
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
* `POST /api/sheets/:id/status` - Change the status of a sheet (e.g., `DRAFT` -> `UNDER_REVIEW`). SuperAdmins can approve and send.

# Environment Setup

This project now keeps Google credentials and the seeded superadmin account in environment-driven local setup instead of hardcoded values.

## Backend

1. Copy [`backend/.env.sample`](./backend/.env.sample) to `backend/.env`.
2. Set these required values before running the backend:

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
DIRECT_URL="postgresql://admin:password@localhost:5432/penalty_system?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
SUPERADMIN_EMAIL="superadmin@iitk.ac.in"
SMTP_HOST="smtp.resend.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="resend"
SMTP_PASS="re_xxxxxxxxxxxxxxxxx"
FRONTEND_URL="http://localhost:3000"
PORT=5000
GOOGLE_APPLICATION_CREDENTIALS="./secrets/google-service-account.json"
```

3. If you need more than one seeded superadmin, use:

```env
SUPERADMIN_EMAILS="superadmin1@iitk.ac.in,superadmin2@iitk.ac.in"
```

4. Run the backend seed only after `SUPERADMIN_EMAIL` or `SUPERADMIN_EMAILS` is configured. The seed command now stops with an error if no superadmin env value is present.

## Neon Database

For Neon, use two backend env vars:

```env
DATABASE_URL="postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

- `DATABASE_URL` should use the pooled `-pooler` hostname for the running app.
- `DIRECT_URL` should use the non-pooled hostname for Prisma CLI commands such as `prisma db push`, `prisma migrate`, and `prisma db seed`.
- Because you pasted a live Neon connection string into chat, rotate that database password in Neon after updating your env files.

## Frontend

1. Copy [`frontend/.env.example`](./frontend/.env.example) to `frontend/.env.local`.
2. Set the backend base URL and Firebase web config:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-web-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"
```

3. In Firebase Authentication:
   - enable `Email/Password`
   - enable `Email link (passwordless sign-in)`
   - add your web domain such as `penaltysystemiitk.web.app` to Authorized Domains

4. Do not place Google credentials, JWT secrets, SMTP passwords, or any other private values in frontend env files. Anything prefixed with `NEXT_PUBLIC_` is exposed to the browser.

## Firebase Admin

The backend verifies Firebase Email Link sign-ins before issuing the app JWT used by protected routes.

Preferred production setup:

```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"..."}'
```

Alternative split env vars:

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

## Google Credentials

The backend supports two safe ways to configure Google Sheets access:

1. Preferred: keep the JSON file only on your machine and set `GOOGLE_APPLICATION_CREDENTIALS`.
2. Alternative: store the full JSON string in `GOOGLE_SERVICE_ACCOUNT_JSON` inside `backend/.env` or your production secret manager.

The file-based option is easier to manage locally. In production, the inline JSON env var is usually easier on platforms like Render because you do not need to upload a file to the container.

## Best Email Option

For this backend, the best production option is `EMAIL_PROVIDER=smtp` with a transactional provider such as Resend or Postmark.

Why this is the best fit here:

- Your code already sends mail server-side with Nodemailer, so SMTP works immediately with no code rewrite.
- Transactional providers generally have better deliverability and simpler production setup than personal Gmail SMTP.
- OTP mail is sensitive, so a backend-owned mail flow is better than pushing delivery logic into the frontend.

EmailJS can still work, but it is a less natural fit here because this app already has a backend mailer and OTP flow.

## How To Get SMTP Credentials

Recommended path: Resend SMTP

1. Create a Resend account.
2. Add your sending domain in Resend.
3. Add the DNS records Resend asks for and wait until the domain is verified.
4. Create an API key in Resend.
5. Put these values in `backend/.env` or your production secret store:

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.resend.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="resend"
SMTP_PASS="YOUR_RESEND_API_KEY"
SMTP_FROM_NAME="IITK Election Commission"
SMTP_FROM_EMAIL="no-reply@your-domain.com"
```

6. Make sure `SMTP_FROM_EMAIL` uses your verified domain.
7. Send a test OTP after deployment and confirm `GET /api/health` reports the mailer as ready.

Local/dev fallback: Gmail SMTP

1. Turn on 2-Step Verification for the Gmail account.
2. Create an App Password from the Google account security settings.
3. Use:

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM_EMAIL="your-email@gmail.com"
```

Use Gmail only for development or very low volume. It is not my production recommendation for OTP delivery.

## How To Download The Google Service Account JSON

These steps follow Google Cloud's current service account and API setup flow:

1. Open the Google Cloud Console and select the project you want to use for Sheets access.
2. Enable the Google Sheets API for that project.
3. Open **IAM & Admin** -> **Service Accounts**.
4. Create a new service account, or open an existing one that should access the spreadsheet.
5. Open the **Keys** tab for that service account.
6. Choose **Add Key** -> **Create new key** -> `JSON`.
7. Download the JSON file and save it only on your machine, for example at `backend/secrets/google-service-account.json`.
8. Set `GOOGLE_APPLICATION_CREDENTIALS="./secrets/google-service-account.json"` in `backend/.env`.
9. Open the JSON file and copy the `client_email` value.
10. Share your target Google Sheet with that `client_email`, otherwise the API will authenticate successfully but still fail to open the spreadsheet.

Google notes that a newly created private key JSON should be stored securely because you cannot download that same private key again later.

## Production Setup

For production deployments such as Render:

1. Put `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPERADMIN_EMAIL`, mail credentials, and `GOOGLE_SERVICE_ACCOUNT_JSON` into the platform secret manager.
2. Set `FRONTEND_URL` and `CORS_ORIGINS` to your live frontend domains.
3. Do not rely on `GOOGLE_APPLICATION_CREDENTIALS` unless you also manage a real file inside the deployment container.
4. Run `npx prisma db push` against the production database.
5. Run `npx prisma db seed` once so the superadmin account from env is created.
6. Check `/api/health` after deploy to confirm both mailer and Google Sheets are ready.

## Git Safety

- `backend/.env`, `backend/secrets/`, and common credential file patterns are ignored by Git.
- `frontend/.env.local` stays ignored by the frontend's `.gitignore`.
- If a credential file was ever committed in the past, ignoring it is not enough by itself. Remove it from Git tracking with:

```bash
git rm --cached backend/google-credentials.json
```

Then commit that removal before pushing.

## Reference Links

- [Google Cloud: create service accounts](https://cloud.google.com/iam/docs/creating-managing-service-accounts)
- [Google Cloud: create and delete service account keys](https://cloud.google.com/iam/docs/keys-create-delete?hl=en)
- [Google for Developers: enable Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis)
- [Prisma: Neon with pooled and direct connections](https://www.prisma.io/docs/v6/orm/overview/databases/neon)
- [Resend: send emails with SMTP](https://resend.com/docs/send-with-smtp)

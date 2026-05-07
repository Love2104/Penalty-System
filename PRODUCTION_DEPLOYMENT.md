# Production Deployment Guide

## Recommended topology

- Frontend: Firebase App Hosting
- Backend: Render web service
- Database: Neon PostgreSQL
- Mail delivery: backend-managed SMTP, preferably with Resend or Postmark

This project keeps OTP creation and verification on the backend even when EmailJS is used. Do not move OTP sending to client-only code.

## Frontend on Firebase

The frontend remains a real Next.js app with dynamic routes such as `/sheets/[id]` and `/tabs/[id]`, so Firebase App Hosting is the safest Firebase path for production.

1. Go to the `frontend` directory.
2. Update `apphosting.yaml` with the live backend URL.
3. In Firebase, create an App Hosting backend connected to the repository.
4. Set `NEXT_PUBLIC_API_URL` in Firebase to your Render API URL, for example:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com/api
```

## Backend on Render

The repository includes `render.yaml` for a Render blueprint.

1. Create the web service from `render.yaml`.
2. Fill in all secrets and runtime values in Render.
3. Set `FRONTEND_URL` and `CORS_ORIGINS` to your Firebase production domains.

Example:

```env
FRONTEND_URL=https://your-frontend.web.app
CORS_ORIGINS=https://your-frontend.web.app,https://your-frontend.firebaseapp.com
```

## Email provider

### Recommended: SMTP with Resend or Postmark

Use `EMAIL_PROVIDER=smtp` and configure:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_NAME`
- `SMTP_FROM_EMAIL`

Resend SMTP example:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxx
SMTP_FROM_NAME=IITK Election Commission
SMTP_FROM_EMAIL=no-reply@your-domain.com
```

### Option B: EmailJS

Use `EMAIL_PROVIDER=emailjs` and configure:

- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_TEMPLATE_ID_OTP`
- `EMAILJS_TEMPLATE_ID_PENALTY`
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_PRIVATE_KEY`
- `EMAILJS_FROM_NAME`
- `EMAILJS_FROM_EMAIL`

The backend sends these template parameters:

- `to_email`
- `to_name`
- `subject`
- `message_html`
- `message_text`
- `from_name`
- `from_email`

## Google Sheets

For Google Sheets syncing, configure one of the following on the backend:

- `GOOGLE_SERVICE_ACCOUNT_JSON` - recommended for Render and similar platforms
- `GOOGLE_APPLICATION_CREDENTIALS` - acceptable only if you also manage a real credentials file in the container

You can also paste the service-account JSON from the admin UI or sheets UI.

## Health check

Render can use:

```text
/api/health
```

This endpoint reports:

- application status
- configured CORS origins
- mailer readiness
- Google Sheets readiness

## Neon database

Use Neon pooled and direct URLs separately:

```env
DATABASE_URL=postgresql://<user>:<password>@<project>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://<user>:<password>@<project>.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

- `DATABASE_URL` is used by the running backend.
- `DIRECT_URL` is used by Prisma CLI commands such as `db push` and `db seed`.

## First production bootstrap

1. Set `SUPERADMIN_EMAIL` in Render before the first schema push/seed.
2. Run `npx prisma db push`.
3. Run `npx prisma db seed`.
4. Confirm `/api/health` reports both mail and Google as ready.

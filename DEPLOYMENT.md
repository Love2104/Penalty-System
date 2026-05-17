# Deployment Guide

This repo is now set up for:

* GitHub as the source of truth
* Render for the backend API
* Firebase App Hosting for the Next.js frontend

## 1. GitHub

The remote is already configured:

```bash
git remote -v
```

Current remote:

```text
https://github.com/Love2104/Penalty-System.git
```

Push your latest branch with:

```bash
git add .
git commit -m "Prepare deployment config"
git push origin <branch-name>
```

## 2. Backend on Render

Recommended service type: Render Web Service

Relevant repo files:

* `render.yaml`
* `backend/.env.render.example`
* `backend/package.json`

### Render setup

1. In Render, create a new Blueprint or Web Service from this GitHub repo.
2. If using the included Blueprint, Render will read `render.yaml` from the repo root.
3. Service root directory should be `backend`.
4. Build command:

```bash
npm install && npm run build
```

5. Pre-deploy command:

```bash
npm run prisma:push
```

6. Start command:

```bash
npm start
```

7. Health check path:

```text
/api/health
```

### Required Render environment variables

Use `backend/.env.render.example` as the template.

Required values:

* `DATABASE_URL`
* `JWT_SECRET`
* `JWT_EXPIRES_IN`
* `SMTP_HOST`
* `SMTP_PORT`
* `SMTP_USER`
* `SMTP_PASS`
* `FRONTEND_URL`
* `PORT`

### Recommended values

```env
PORT=10000
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.web.app,https://your-frontend.firebaseapp.com,https://your-custom-domain.com
```

### Database note

Use PostgreSQL for deployment. The backend Prisma schema is now configured for `postgresql`, which is the correct fit for Render and other managed deployments.

You can use:

* Render Postgres
* Neon
* Supabase Postgres
* Any standard PostgreSQL provider

After setting `DATABASE_URL`, run:

```bash
npm run prisma:push
```

If you need initial admin data and clauses:

```bash
npx prisma db seed
```

The intended superadmin email is:

```text
lovec23@iitk.ac.in
```

## 3. Frontend on Firebase App Hosting

Recommended Firebase product: Firebase App Hosting

Why this path:

* Firebase’s current docs recommend App Hosting for full-stack Next.js apps over older framework-aware Hosting preview flows.
* It supports GitHub-driven rollouts directly from your repository.

Relevant repo files:

* `frontend/apphosting.yaml`
* `frontend/.env.example`
* `frontend/package.json`

### Firebase App Hosting setup

1. Open Firebase Console.
2. Go to App Hosting.
3. Create a backend.
4. Connect the GitHub repo:

```text
Love2104/Penalty-System
```

5. Set the app root directory to:

```text
frontend
```

6. Set the live branch to the branch you want to deploy, usually `main`.
7. In App Hosting environment variables, set:

```env
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com/api
```

You can set this either in the Firebase console or by editing `frontend/apphosting.yaml`.

### Firebase CLI fallback

If you prefer CLI setup:

```bash
firebase apphosting:backends:create --project YOUR_PROJECT_ID
```

When prompted for the app root directory, enter:

```text
frontend
```

## 4. Local production-style verification

Backend:

```bash
cd backend
npm install
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm start
```

## 5. Important deployment checks

Before deploying, verify:

* `NEXT_PUBLIC_API_URL` points to the Render backend `/api` base URL.
* `FRONTEND_URL` in Render includes every Firebase domain that will call the API.
* SMTP credentials are valid.
* `DATABASE_URL` points to a reachable PostgreSQL instance.
* `lovec23@iitk.ac.in` exists as the superadmin user in the deployed database.

## 6. If you want me to do the git push next

I can also handle:

* staging the deployment files
* creating a commit
* pushing to GitHub
* helping you prepare the exact Render and Firebase dashboard values

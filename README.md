# Ledgerly Expense Tracker

A full-stack expense tracker built with React/Vite and Flask/SQLite. The backend owns authentication and authorization; public registration can only create `user` accounts, while the initial admin is provisioned from environment variables.

## Current implementation

- Shared login and registration pages with role-based redirect.
- Secure Werkzeug password hashing and JWT-protected APIs.
- User-scoped income/expense transactions with server-side ownership checks.
- User dashboard metrics, category charts, reports, budgets, recurring rules, exports, and INR formatting.
- Admin dashboard with application-wide totals, selected-user financial detail, guarded deletion, audit logs, and transaction exports.
- Responsive fintech-style layout with mobile navigation.
- Financial amounts stored as integer paise to avoid floating-point storage errors.
- Bank balance estimate starts from a manually entered amount and adjusts with recorded transactions; outside bank activity is not synced, and bank PINs/credentials are never collected.

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm
- VS Code

## Setup on Windows

### Terminal 1: backend

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and replace the secret and ADMIN_PASSWORD placeholders.
python -m flask --app run upgrade-db
python seed_admin.py
python run.py
```

The API runs at `http://localhost:5000`.

### Terminal 2: frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. Register a normal user, or sign in with the admin created by `seed_admin.py`.

## Deploy to Vercel and Render

The frontend is a Vite static site for Vercel; the Flask API runs as a Render web service. Use PostgreSQL for production: the local SQLite file is not persistent storage on Render.

### 1. Create the Render database

1. In the Render dashboard, create a **PostgreSQL** database. Choose the same region for the database and web service.
2. Once it is ready, copy its **Internal Database URL**. Keep it private; it will be set as `DATABASE_URL` on the backend service.

### 2. Deploy the backend on Render

1. Create a **Web Service** from this GitHub repository and select the `main` branch.
2. Set **Root Directory** to `backend`, **Build Command** to `pip install -r requirements.txt`, and **Start Command** to `gunicorn run:app`.
3. Add these environment variables in the Render service settings:
   - `DATABASE_URL`: the Render Postgres **Internal Database URL**
   - `SECRET_KEY`: a long, random secret
   - `JWT_SECRET_KEY`: a different long, random secret
   - `ADMIN_EMAIL`: the email for the initial admin
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters, including uppercase, lowercase, and a number
4. Deploy the service. In its Render Shell, run `python -m flask --app run upgrade-db`, then `python seed_admin.py` once to create the initial admin. The shell runs from the `backend` root directory. Remove `ADMIN_PASSWORD` from the service environment after the admin is created.
5. Copy the backend's public URL, for example `https://your-api.onrender.com`.

### 3. Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`. Vercel should detect Vite; use `npm run build` as the build command and `dist` as the output directory.
3. Add the environment variable `VITE_API_URL` with the value `https://your-api.onrender.com/api`, replacing it with the Render URL from step 2.
4. Deploy, then copy the production URL assigned by Vercel.

### 4. Connect and verify both services

1. In Render's environment settings, set `FRONTEND_ORIGIN` to the exact Vercel production origin (scheme included, no trailing slash). Add comma-separated origins if you also use a custom domain. If unset, the backend only allows localhost origins.
2. Save the setting and redeploy the Render service.
3. Open the Vercel site, register a test user, sign in, and create a transaction. Reload the page on a nested route to verify the Vercel rewrite works.

`VITE_API_URL` is embedded into the frontend at build time, so redeploy Vercel after changing it. Never put backend secrets in Vercel environment variables or commit them to the repository.

## API shape

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET/POST /api/user/transactions`, `PUT/DELETE /api/user/transactions/<id>`
- `GET/PUT /api/user/bank-balance` for the separately maintained manual bank-balance reference
- `GET/POST/DELETE /api/user/budgets`, `GET/PUT /api/user/profile`, `GET /api/user/dashboard`, `GET /api/user/reports`
- `GET/POST/PUT/DELETE /api/user/recurring`, `PATCH /api/user/recurring/<id>/status`, `GET /api/user/export/csv`
- `GET /api/admin/dashboard`, `GET /api/admin/users`, `GET /api/admin/users/<id>`, `PATCH /api/admin/users/<id>/status`, `DELETE /api/admin/users/<id>`
- `GET /api/admin/transactions`, `GET /api/admin/export/csv`

All private endpoints require `Authorization: Bearer <access token>`. The browser keeps the short-lived token in `sessionStorage`, so closing the tab ends the browser session.

## Testing and development

Backend dependencies are listed in `backend/requirements.txt`. Initialize or upgrade the schema explicitly with `python -m flask --app run upgrade-db`; the app does not alter the database at startup. Run backend tests with `python -m pytest backend/tests/test_api.py -q`. Frontend production validation is `npm run build`; linting is `npm run lint`.

## Security notes

Never commit `.env` files or production secrets. Use HTTPS, rotate secret keys, and use a persistent production database before deployment. Recurring rules are explicit: they do not silently generate duplicate transactions on refresh. Admin deletion permanently removes the selected user and associated financial records and is recorded in the audit log.

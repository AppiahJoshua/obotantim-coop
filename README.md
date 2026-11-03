# Obotantim Cooperative — Full-Stack Website + Admin Dashboard

A production-ready website and secure admin dashboard for **Obotantim Cooperative Mutual Support and Social Services Society LTD** (Techiman, Ghana).

```
obotantim-coop/
├── backend/      Node.js + Express + MySQL API
└── frontend/     React + Vite + Tailwind CSS
```

---

## 1. Tech Stack

| Layer        | Technology                                    |
|--------------|------------------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS, React Query, React Router |
| Backend      | Node.js, Express                              |
| Database     | MySQL 8+                                      |
| Auth         | JWT (JSON Web Tokens) + bcrypt password hashing |
| File Storage | Cloudinary                                    |
| Icons        | lucide-react                                  |

---

## 2. Default Roles (RBAC)

| Role             | Access |
|------------------|--------|
| **Super Admin**   | Everything — users, content, registrations, audit logs |
| **Manager**       | Registrations, contact messages, reports (no user management) |
| **Content Editor**| Products, gallery, director's message, announcements only |

Default seeded login (**change immediately after first deploy**):

```
Email:    admin@obotantimcoop.com
Password: Admin@2026!
```

---

## 3. Local Setup

### Prerequisites
- Node.js 18+
- A MySQL 8+ database (local or hosted)
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
# JWT_SECRET, and CLOUDINARY_* in .env

npm install

# Create tables + seed default admin, products, testimonials
npm run seed

npm run dev          # starts on http://localhost:5000
```

For an existing database, apply the notification preferences, email outbox metadata, and settings changes without rerunning seed data:

```bash
npm run migrate:notifications
npm run migrate:password-reset
npm run migrate:security
```

The password reset and security migrations add reset-token, MFA, token-version, application tracking-code, and SMS outbox schema. Keep `MFA_ENCRYPTION_KEY` and `BACKUP_ENCRYPTION_KEY` secret and back them up securely; losing them makes stored MFA secrets or encrypted backups unrecoverable.

Configure the `SMTP_*` values in `backend/.env`, then run the email worker in a separate terminal to deliver queued receipts and staff alerts:

```bash
cd backend
npm run worker:email
```

The API persists notification/outbox jobs during form submission; SMTP delivery runs in the worker and retries transient failures.

Run the SMS worker with configured Arkesel credentials:

```bash
npm run worker:sms
```

### Backups and Recovery

Install the MySQL client tools (`mysqldump` and `mysql`) and set `BACKUP_ENCRYPTION_KEY` to a generated 32-byte key encoded as 64 hex characters. Test a manual encrypted backup first:

```bash
npm run backup:now
```

To run daily backups in the API process, set `BACKUP_SCHEDULER_ENABLED=true` and optionally `BACKUP_CRON` (default 2:00 AM). Backups are compressed, AES-256-GCM encrypted, stored in `backend/backups/`, and files older than 30 days are removed.

To restore, stop the API/workers, set `RESTORE_CONFIRM=YES` in the environment, and run:

```bash
npm run restore:backup -- "backups/obotantim_coop-YYYY-MM-DDT....sql.gz.enc"
```

The restore overwrites data in the configured `MYSQL_DATABASE`. Verify the target and retain a separate pre-restore backup before proceeding.

### Verification

Run the mocked-MySQL HTTP integration tests with `npm test`. They cover login, role enforcement, reset-token single use, notification preferences, and settings authorization.

### Frontend

```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000` (see `vite.config.js`), so no extra CORS setup is needed locally.

Visit:
- **Public site:** http://localhost:5173
- **Admin login:** http://localhost:5173/admin/login

---

## 4. Deploying to Render.com

### Step 1 — MySQL Database
1. Provision a MySQL 8+ database with your chosen hosting provider.
2. Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` in the backend environment.
3. Run `npm run seed` from `backend` to create the tables and seed initial content.
4. For an existing database, run `npm run migrate:module-access` from `backend` before deploying the per-staff module access controls.

### Step 2 — Backend (Web Service)
1. Render Dashboard → **New → Web Service** → connect this repo, root directory `backend`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment variables (Render → Environment):
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` → connection details from Step 1
   - `JWT_SECRET` → generate a long random string
   - `JWT_EXPIRES_IN` → `7d`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `FRONTEND_URL` → your deployed frontend URL (Step 3)
   - `NODE_ENV` → `production`

### Step 3 — Frontend (Static Site)
1. Render Dashboard → **New → Static Site** → connect this repo, root directory `frontend`.
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Since the frontend calls relative `/api/...` paths, either:
   - Add a Render **Rewrite Rule** proxying `/api/*` to your backend service URL, **or**
   - Set `vite.config.js`'s dev proxy target as a reference and instead set `VITE_API_URL` and update `src/api/axios.js`'s `baseURL` to point directly at your backend's public URL (e.g. `https://obotantim-api.onrender.com/api`).

### Step 4 — First Login & Hardening
1. Log in with the seeded Super Admin credentials above.
2. **Immediately** change the password (Admin Dashboard → top-right profile → or use `PUT /api/auth/change-password`).
3. Create real staff accounts under **User Management** and deactivate/delete the seed account if desired.

---

## 5. Project Structure Highlights

```
backend/src/
├── config/database.js        MySQL connection pool
├── controllers/               Route handlers (one per resource)
├── middleware/
│   ├── auth.js                JWT verification (+ optional-auth variant)
│   ├── rbac.js                Role-based access guards
│   └── upload.js              Cloudinary/multer upload configs
├── routes/                    Express routers
├── schema.sql                 Full DB schema + seed data
└── server.js                  App entrypoint, security middleware, error handling

frontend/src/
├── api/axios.js               Axios instance with JWT interceptor
├── context/AuthContext.jsx    Auth state, login/logout, role helpers
├── components/                Public-site sections (Hero, Products, Gallery, etc.)
└── pages/
    ├── Home.jsx                Public homepage
    └── admin/                  Full admin dashboard (RBAC-protected routes)
```

---

## 6. Security Features Implemented

- Bcrypt password hashing (cost factor 12)
- JWT auth with expiry + server-side active-user verification on every request
- Role-based route protection on both frontend (route guards) and backend (middleware)
- `helmet` security headers, rate limiting (general + stricter on login)
- express-validator input validation on auth/user endpoints
- Audit logging of all admin write actions (who, what, when, from where)
- File upload validation (type + size limits) via multer + Cloudinary

---

## 7. Support

Designed by **Joslynch Digital** — 0593 328 077 — joeappalu@gmail.com

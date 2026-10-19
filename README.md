# Obotantim Cooperative — Full-Stack Website + Admin Dashboard

A production-ready website and secure admin dashboard for **Obotantim Cooperative Mutual Support and Social Services Society LTD** (Techiman, Ghana).

```
obotantim-coop/
├── backend/      Node.js + Express + PostgreSQL API
└── frontend/     React + Vite + Tailwind CSS
```

---

## 1. Tech Stack

| Layer        | Technology                                    |
|--------------|------------------------------------------------|
| Frontend     | React 18, Vite, Tailwind CSS, React Query, React Router |
| Backend      | Node.js, Express                              |
| Database     | PostgreSQL                                    |
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
- A PostgreSQL database (local or hosted — e.g. Render, Supabase, Neon)
- A free [Cloudinary](https://cloudinary.com) account (for image uploads)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, CLOUDINARY_* in .env

npm install

# Create tables + seed default admin, products, testimonials
psql "$DATABASE_URL" -f src/schema.sql

npm run dev          # starts on http://localhost:5000
```

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

### Step 1 — PostgreSQL Database
1. Render Dashboard → **New → PostgreSQL**
2. Copy the **Internal Database URL** once created.
3. Run the schema against it once (from your machine, using the **External** URL):
   ```bash
   psql "EXTERNAL_DATABASE_URL" -f backend/src/schema.sql
   ```

### Step 2 — Backend (Web Service)
1. Render Dashboard → **New → Web Service** → connect this repo, root directory `backend`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment variables (Render → Environment):
   - `DATABASE_URL` → the **Internal** Postgres URL from Step 1
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
├── config/database.js        PostgreSQL pool
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

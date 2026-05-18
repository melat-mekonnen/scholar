### Scholar Backend (Express + Neon Postgres)

Node.js + Express backend for your Next.js scholarship dashboard. Supports:

- **Email/password auth**: `/auth/signup`, `/auth/login`, `/auth/me`
- **Google OAuth2 auth**: `/auth/google`, `/auth/google/callback`
- **Dashboard summary**: `/dashboard/summary` (auth required)

### 1. Setup

- **Install dependencies**:

```bash
cd d:\scholar-backend
npm install
```

- **Create `.env`** based on `.env.example` and fill:

- **`PORT`** (e.g. `4000`)
- **`DATABASE_URL`** (Neon Postgres connection string)
- **`JWT_SECRET`**
- **`FRONTEND_APP_URL`** (e.g. `http://localhost:3000`)
- **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`**
- **`GOOGLE_REDIRECT_URI`** (e.g. `http://localhost:4000/auth/google/callback`)

- **Create tables** using `db/schema.sql` (single DDL file for this backend).

#### Clean local database (removes messy / duplicate tables)

If the database previously had another app (e.g. Prisma) **and** this app’s tables, you will see duplicate or unused relations. For **local development only**, reset `public` and reapply the canonical schema:

```bash
set CONFIRM_DB_RESET=yes
npm run db:reset
```

Then restart the API. **Never** set `CONFIRM_DB_RESET` against production or shared databases.

#### Test users (one account per role — routing checks)

After DB is ready, seed dev-only accounts (same password for all):

```bash
npm run seed:test-roles
```

Sign in at the frontend with each email; you should land on:

| Role    | Path after sign-in |
|---------|--------------------|
| student | `/dashboard`       |
| manager | `/manager`         |
| owner   | `/owner`           |
| admin   | `/admin`           |

With the API running, you can sanity-check login responses:

```bash
npm run verify:role-routing
```

### 2. Run the server

```bash
npm run dev
```

Server listens on `PORT` (default `4000`).

### 3. HTTP API

- **POST `/auth/signup`**

Body:

```json
{ "fullName": "string", "email": "string", "password": "string" }
```

Returns:

```json
{ "user": { "id": "uuid", "fullName": "string", "email": "string" }, "token": "jwt-token-string" }
```

- **POST `/auth/login`** – same response shape.
- **GET `/auth/me`** – requires `Authorization: Bearer <token>`.
- **GET `/dashboard/summary`** – requires `Authorization: Bearer <token>`, returns stats, recommended scholarships, and recent activity.
- **GET `/auth/google`** – starts Google OAuth.
- **GET `/auth/google/callback`** – Google redirects here; backend creates/loads user and then redirects to:

`<FRONTEND_APP_URL>/auth/callback?token=<jwt>`

Your Next.js pages can read `token` from the query, store it (or set a cookie), and then `router.push("/dashboard")`.


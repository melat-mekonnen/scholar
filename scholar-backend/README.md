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

- **Create tables** in Neon using `db/schema.sql`.

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


# EthioScholar — Subscription & Payments Plan (AI Chat)

Freemium for **AI Chatbot only**: **3 messages/day** on **Free**, **unlimited** on **Pro**.  
Payments via **Stripe**, **Chapa**, and **Telebirr** (Ethiopia-friendly).

**Auth stays the same** (email/password + Google). Subscription is a **plan on the user record**, enforced on **`POST /api/chatbot/query`**, not a separate login system.

---

## Scope

| In scope | Out of scope (v1) |
|----------|-------------------|
| Daily quota on AI chat | AI Matches paywall |
| `free` / `pro` plans | Multiple paid tiers |
| Stripe + Chapa + Telebirr checkout | Owner/manager billing |
| Webhooks → activate Pro | Changing JWT or auth provider |
| Student settings: plan + usage | Full invoice PDF system |

**Stack touchpoints:** `scholar-backend` (source of truth), `scholar-f` (UI), `scholar-ai` (unchanged for quota v1).

---

## Product rules

| Plan | AI chat |
|------|---------|
| **Free** | **3 requests per calendar day** (configurable) |
| **Pro** | **Unlimited** (optional fair-use cap in env, e.g. 200/day) |

- **1 request** = one successful `POST /api/chatbot/query` (count before calling `scholar-ai`).
- **Reset:** UTC midnight by default (`CHAT_USAGE_TIMEZONE=UTC`); document in UI.
- **Roles:** `admin` / `owner` may bypass quota (optional env flag).

---

## Architecture

```text
┌─────────────┐     GET /api/chatbot/quota      ┌──────────────────┐
│  scholar-f  │ ──────────────────────────────►│  scholar-backend │
│  ai-chat    │     POST /api/chatbot/query    │  quota + billing │
│  settings   │ ◄──────────────────────────────│  PostgreSQL      │
└─────────────┘     402 if quota exceeded      └────────┬─────────┘
        │                                                │
        │         checkout (Stripe / Chapa / Telebirr)   │
        └────────────────────────────────────────────────┤
                                                         ▼
                                              ┌──────────────────┐
                                              │  scholar-ai      │
                                              │  /ai/chat/query  │
                                              └──────────────────┘

Payment providers (webhooks → backend):
  Stripe      → POST /api/billing/webhooks/stripe
  Chapa       → POST /api/billing/webhooks/chapa
  Telebirr    → POST /api/billing/webhooks/telebirr  (or via Chapa — see M6)
```

---

## Data model (PostgreSQL)

### `users` (extend)

```sql
subscription_plan TEXT NOT NULL DEFAULT 'free'
  CHECK (subscription_plan IN ('free', 'pro')),
subscription_expires_at TIMESTAMPTZ,          -- NULL = no expiry (lifetime/manual)
subscription_provider TEXT,                   -- 'stripe' | 'chapa' | 'telebirr' | 'manual'
subscription_external_id TEXT                 -- customer/subscription id at provider
```

### `ai_chat_usage` (daily quota for free users)

```sql
user_id UUID REFERENCES users(id),
usage_date DATE NOT NULL,
request_count INT NOT NULL DEFAULT 0,
PRIMARY KEY (user_id, usage_date)
```

### `subscription_payments` (audit + idempotency)

```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL REFERENCES users(id),
provider TEXT NOT NULL,                       -- stripe | chapa | telebirr
provider_payment_id TEXT NOT NULL,            -- unique per provider
amount_cents INT,
currency TEXT,                                -- ETB, USD, etc.
status TEXT NOT NULL,                         -- pending | succeeded | failed | refunded
plan TEXT NOT NULL DEFAULT 'pro',
period_start TIMESTAMPTZ,
period_end TIMESTAMPTZ,
metadata JSONB,
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE (provider, provider_payment_id)
```

### `subscription_checkout_sessions` (optional, recommended)

```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL,
provider TEXT NOT NULL,
provider_session_id TEXT,
status TEXT NOT NULL,                         -- created | completed | expired
expires_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**Migration:** `scholar-backend/scripts/migrate-subscription-tables.js` + update `db/schema.sql`.

---

## API surface (backend)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/chatbot/quota` | `{ plan, used, limit, remaining, unlimited, resetsAt }` |
| `POST` | `/api/chatbot/query` | Existing chat; **402** if quota exceeded |
| `GET` | `/api/billing/subscription` | Current plan + expiry + provider |
| `POST` | `/api/billing/checkout/stripe` | Create Stripe Checkout Session → `{ url }` |
| `POST` | `/api/billing/checkout/chapa` | Initialize Chapa payment → `{ checkout_url }` |
| `POST` | `/api/billing/checkout/telebirr` | Telebirr session (direct or Chapa) → `{ url \| instructions }` |
| `POST` | `/api/billing/webhooks/stripe` | Stripe signed webhook |
| `POST` | `/api/billing/webhooks/chapa` | Chapa callback |
| `POST` | `/api/billing/webhooks/telebirr` | Telebirr callback |
| `PUT` | `/api/admin/users/:id/subscription` | Manual grant/revoke Pro (admin) |

**402 response example:**

```json
{
  "message": "Daily AI chat limit reached. Upgrade to Pro for unlimited chat.",
  "code": "CHAT_QUOTA_EXCEEDED",
  "plan": "free",
  "used": 3,
  "limit": 3,
  "resetsAt": "2026-05-16T00:00:00.000Z"
}
```

---

## Environment variables

Add to `scholar-backend/.env.example`:

```env
# Quota
CHAT_FREE_DAILY_LIMIT=3
CHAT_USAGE_TIMEZONE=UTC
CHAT_PRO_FAIR_USE_DAILY=0

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=

# Chapa (supports cards + local methods; often used for ETB)
CHAPA_SECRET_KEY=
CHAPA_WEBHOOK_SECRET=
CHAPA_CALLBACK_URL=

# Telebirr (direct integration — if not using Chapa as aggregator)
TELEBIRR_APP_ID=
TELEBIRR_APP_KEY=
TELEBIRR_SHORT_CODE=
TELEBIRR_WEBHOOK_SECRET=
TELEBIRR_CALLBACK_URL=

# Billing URLs (frontend)
FRONTEND_BILLING_SUCCESS_URL=http://localhost:3000/settings/subscription?status=success
FRONTEND_BILLING_CANCEL_URL=http://localhost:3000/settings/subscription?status=cancel
```

---

## Payment providers — roles

| Provider | Best for | Notes |
|----------|----------|--------|
| **Stripe** | International cards, USD/EUR, diaspora | Checkout Session + Customer Portal (later) |
| **Chapa** | **ETB**, Ethiopian cards, mobile money | Official API; verify webhook signatures |
| **Telebirr** | **Telebirr wallet** (very common in ET) | Often available **through Chapa**; use direct API only if Chapa does not expose Telebirr for your merchant account |

**Recommendation:** Implement **Chapa first** for local ETB, **Stripe** for global, then **Telebirr** as Chapa payment method **or** direct Telebirr API (M6).

---

## Milestones

### M0 — Decisions & repo setup

**Goals**

- Lock plan: Free = 3 chat/day, Pro = unlimited.
- Choose Pro pricing (e.g. **ETB 149/month**, **USD 4.99/month** on Stripe).
- Register sandbox accounts: [Stripe](https://dashboard.stripe.com), [Chapa](https://chapa.co), Telebirr merchant (bank/partner onboarding).
- Document which Telebirr path: **Chapa-aggregated** vs **direct**.

**Exit**

- This file reviewed; sandbox keys stored in team password manager (not committed).

---

### M1 — Database & subscription state (no payments)

**Goals**

- Migration: `users` columns, `ai_chat_usage`, `subscription_payments` (empty OK).
- `SubscriptionRepository`, `AiChatUsageRepository`.
- `checkAiChatQuota(userId)`, `consumeAiChatQuota(userId)`.

**Files**

- `scholar-backend/db/schema.sql`
- `scholar-backend/scripts/migrate-subscription-tables.js`
- `scholar-backend/src/repositories/SubscriptionRepository.js`
- `scholar-backend/src/repositories/AiChatUsageRepository.js`
- `scholar-backend/src/usecases/subscription/checkAiChatQuota.js`
- `scholar-backend/src/usecases/subscription/consumeAiChatQuota.js`

**Exit**

- SQL migration runs on local DB; manual `UPDATE users SET subscription_plan='pro'` works.

---

### M2 — Enforce quota on AI chat (backend only)

**Goals**

- In `queryChatbot.js`: check quota → 402 if exceeded → consume on allowed request → call `scholar-ai`.
- `GET /api/chatbot/quota` for UI.
- Env: `CHAT_FREE_DAILY_LIMIT`, `config/env.js`.

**Files**

- `scholar-backend/src/usecases/chatbot/queryChatbot.js`
- `scholar-backend/src/controllers/chatbotController.js`
- `scholar-backend/src/routes/chatbot.routes.js`

**Exit**

- Free user: 4th message returns 402; Pro user: no limit.

---

### M3 — Frontend: quota UI & upgrade entry (no payment yet)

**Goals**

- `ai-chat/page.tsx`: load quota on mount; banner “X of 3 left”; handle 402 with upgrade CTA.
- `settings/subscription/page.tsx` (or section): plan, usage, “Upgrade” buttons (disabled or “coming soon” until M4+).
- i18n strings (EN + Amharic if used elsewhere).

**Files**

- `scholar-f/app/ai-chat/page.tsx`
- `scholar-f/app/settings/subscription/page.tsx` (new)
- `scholar-f/lib/billing.ts` (optional API helpers)

**Exit**

- Demo: hit limit → clear upgrade message; admin-granted Pro unlocks chat.

---

### M4 — Stripe integration ✅ (implemented)


**Goals**

- Create **Stripe Checkout Session** (subscription mode, `STRIPE_PRICE_ID_PRO_MONTHLY`).
- Webhook: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- On success: `subscription_plan='pro'`, set `subscription_expires_at` from subscription period, store `subscription_provider='stripe'`.
- Idempotency: unique `(provider, provider_payment_id)` in `subscription_payments`.

**Files**

- `scholar-backend/src/modules/billing/stripe/stripeClient.js`
- `scholar-backend/src/modules/billing/stripe/createCheckout.js`
- `scholar-backend/src/modules/billing/stripe/webhookHandler.js`
- `scholar-backend/src/routes/billing.routes.js`
- `scholar-backend/src/controllers/billingController.js`

**Frontend**

- “Pay with card (Stripe)” → redirect to Checkout URL.

**Exit**

- Stripe test card completes → user is Pro → unlimited chat.

---

### M5 — Chapa integration ✅ (implemented)

**Goals**

- Initialize payment (ETB amount, `tx_ref`, customer email, callback URL).
- Verify webhook signature; on `success` / `completed` → activate Pro for billing period (e.g. 30 days).
- Store payment row in `subscription_payments`.

**Files**

- `scholar-backend/src/modules/billing/chapa/chapaClient.js`
- `scholar-backend/src/modules/billing/chapa/createPayment.js`
- `scholar-backend/src/modules/billing/chapa/webhookHandler.js`

**Frontend**

- “Pay with Chapa (ETB)” → redirect to Chapa checkout.

**Exit**

- Chapa sandbox payment → Pro activated; webhook replay is idempotent.

---

### M6 — Telebirr integration

**Goals**

- **Option A (preferred):** Enable Telebirr as a payment method inside **Chapa** checkout (minimal extra code; document in UI as “Telebirr via Chapa”).
- **Option B:** Direct Telebirr API — init payment, receive callback, same `activatePro(userId, periodEnd)` use case as Chapa.

**Files**

- Option A: Chapa config + UI label only.
- Option B: `scholar-backend/src/modules/billing/telebirr/*` + `POST /api/billing/webhooks/telebirr`

**Exit**

- User can complete Pro purchase using Telebirr in test/sandbox.

---

### M7 — Unified billing orchestration (backend + frontend)

**Goals**

- Single use case: `activatePro({ userId, provider, externalId, periodEnd })` and `downgradeToFree(userId)` (on expiry/cancel).
- `GET /api/billing/subscription` returns unified status for all providers.
- Settings page: three buttons — Stripe | Chapa | Telebirr — one success/cancel flow.

**Exit**

- One settings screen; any provider upgrades same `pro` plan.

---

### M8 — Subscription lifecycle & expiry

**Goals**

- Cron or daily job: `subscription_expires_at < NOW()` → `subscription_plan='free'`.
- Stripe: handle `subscription.deleted` / failed renewal.
- Chapa/Telebirr: typically **fixed period** (30 days) unless you add recurring — document one-time vs recurring in UI.

**Files**

- `scholar-backend/src/jobs/subscriptionExpiryJob.js`
- Wire in `app.js` on server start (same pattern as `scholarshipExpiryJob`).

**Exit**

- Expired Pro user gets 402 on 4th message again.

---

### M9 — Admin, security & testing

**Goals**

- Admin: grant/revoke Pro, view payment history.
- Webhook routes: **raw body** for signature verification (Stripe); reject unsigned Chapa/Telebirr callbacks.
- Integration tests: quota 402, webhook idempotency (mock).
- Rate-limit `POST /api/billing/checkout/*` per user.

**Exit**

- Test checklist passed; secrets not in git.

---

### M10 — Production readiness

**Goals**

- Live keys in deployment env only.
- HTTPS webhook URLs whitelisted in Stripe/Chapa/Telebirr dashboards.
- Privacy/terms line: “Payments processed by …”
- Monitoring: log payment failures, alert on webhook errors.

**Exit**

- Go-live checklist signed off.

---

## Dependency order

```text
M0 → M1 → M2 → M3 → M4 (Stripe) ─┐
                    → M5 (Chapa)  ├→ M7 → M8 → M9 → M10
                    → M6 (Telebirr)┘
```

M4–M6 can run in parallel after **M3**.

---

## Frontend routes (suggested)

| Route | Purpose |
|-------|---------|
| `/settings/subscription` | Plan, usage, pay buttons, success/cancel query params |
| `/ai-chat` | Quota banner + 402 upgrade modal |

---

## Security checklist

- [ ] Enforce quota only on **backend** (`queryChatbot.js`).
- [ ] Verify **every** webhook signature before activating Pro.
- [ ] Use **idempotent** payment inserts (`UNIQUE (provider, provider_payment_id)`).
- [ ] Never expose secret keys to `scholar-f`.
- [ ] Authenticate all checkout endpoints (`authMiddleware` + `requireStudent`).
- [ ] Log `user_id` + `tx_ref` for support; no card numbers in logs.

---

## FYP / demo mode (before live payments)

1. Complete **M1–M3** (quota + UI).
2. Admin SQL or `PUT /api/admin/users/:id/subscription` to set Pro for demo users.
3. Add **M4** with Stripe test mode for viva demo.
4. Add Chapa/Telebirr when merchant accounts are ready.

---

## What does *not* change

- Login / register / Google OAuth (`/api/auth/*`).
- `scholar-ai` service (no payment logic there).
- AI Matches, browse, saved, applications (unless you expand scope later).

---

*Document version: 1.0 — AI Chat freemium + Stripe, Chapa, Telebirr.*

# Artix Backend (Express + Prisma + Supabase + OAuth)
## Quick start

1. Copy this `server/` folder into the root of your repo `artix-hub/server/`.
2. Install dependencies:
   ```
   cd server
   npm install
   ```
3. Create `.env` (already included) and update secrets if needed.
4. Initialize Prisma:
   ```
   npx prisma generate
   npx prisma migrate dev --name init
   ```
5. Run server:
   ```
   npm run dev
   ```

## OAuth setup
- Google: set redirect URI to `http://localhost:4000/auth/google/callback`
- GitHub: set redirect URI to `http://localhost:4000/auth/github/callback`
- Microsoft (Azure): set redirect URI to `http://localhost:4000/auth/microsoft/callback`

## How cookies & CSRF work here
- After OAuth success the server sets:
  - `session` cookie (HttpOnly, Secure in production, SameSite=Lax)
  - `csrf` cookie (readable by JS)
- For state-changing requests (POST/PUT/DELETE) the client must:
  - Read `csrf` cookie (JS) and send it in header `x-csrf-token`
  - Example fetch:
    ```js
    const csrf = getCookie('csrf'); // implement getCookie
    fetch('/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({ name: 'New name', bio: '...' }),
      credentials: 'include'
    })
    ```
- `protect` middleware validates session cookie and sets `req.user`.

## Rate limiting

All limiters use **express-rate-limit with MemoryStore** (the default, in-process). This is correct for a single Render instance. If the app ever scales to multiple instances, replace the stores with a shared backend (e.g. `rate-limit-redis`) so limits are enforced across all processes.

| Limiter                | Scope     | Window | Max | Endpoints                          |
|------------------------|-----------|--------|-----|------------------------------------|
| `authLimiter`          | IP        | 15 min | 20  | `/auth/login`, `/auth/register`    |
| `checkUsernameLimiter` | IP        | 1 min  | 30  | `/auth/check-username`             |
| `generalLimiter`       | IP        | 15 min | 500 | Public API endpoints               |
| `passwordResetLimiter` | IP        | 15 min | 3   | `/auth/reset-password`             |
| `aiAssistLimiter`      | User ID\* | 10 min | 30  | `/api/ai/assist`                   |
| `aiSearchLimiter`      | User ID\* | 10 min | 60  | `/api/ai/search`                   |

\* AI limiters key by `req.user.id` when authenticated, fall back to `req.ip` for unauthenticated requests.

## Security note
- Do not pass JWT in URL in production.
- Rotate your Supabase password since the DB URL was shared.

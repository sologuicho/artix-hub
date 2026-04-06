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

## Security note
- Do not pass JWT in URL in production.
- Rotate your Supabase password since the DB URL was shared.

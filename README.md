# Ajrak Impex International

Full-stack Next.js version of the Ajrak Impex website: the same interface as the original React + Vite
frontend, now with a real backend (MongoDB) for accounts and the contact form.

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, **JavaScript only** (no TypeScript), **no `src/` folder** |
| Rendering | **Cache Components** + **React Compiler** enabled |
| Styling | Tailwind CSS v4 (same theme, colours and animations as the original) |
| Database | MongoDB via Mongoose |
| Auth | Email + password, bcrypt, JWT in an **httpOnly cookie** |
| Lint | ESLint (`eslint-config-next`) |
| Agents | `AGENTS.md` included |

## Getting started

```bash
npm install
copy .env.example .env.local   # Windows; then fill in the values
npm run dev                    # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |

### Environment variables

| Name | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas (`mongodb+srv://...`) or local (`mongodb://127.0.0.1:27017/ajrak-impex`) |
| `JWT_SECRET` | yes | 32+ random characters: `openssl rand -base64 48`. Changing it logs everyone out. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Public URL, used for social-sharing metadata. Set it before building for production. |

The app builds without `MONGODB_URI` and `JWT_SECRET`; they are only read when an API route runs.
Set `NEXT_PUBLIC_SITE_URL` to the production URL before building.
For MongoDB Atlas, replace the example URI placeholders with your cluster and database user.
URL-encode any special characters in the username or password.

## Deploying to GoDaddy

This is a full-stack Next.js app (API routes, authentication, and MongoDB), so it needs a GoDaddy plan
that supports a persistent Node.js application. Static-only Web Hosting cannot run it. For cPanel,
confirm **Setup Node.js App** is available and that its Node.js version is 20.19 or newer; otherwise
use a GoDaddy VPS or another Node.js-capable plan.

1. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS URL in `.env.local` before building. Build on a
   machine with Node.js 20.19 or newer:

   ```bash
   npm ci
   npm run build
   ```

   The build creates `.next/standalone` and automatically copies `public` and `.next/static` into it.
2. In cPanel **Setup Node.js App**, select Node.js 20.19 or newer, create an application, and use
   `.next/standalone` as its application root and `server.js` as its startup file. Upload the
   **contents** of `.next/standalone` to that application root. The generated server listens on the
   `PORT` provided by the hosting platform.
3. Configure `MONGODB_URI` and `JWT_SECRET` in the application's environment variables. Set
   `NEXT_PUBLIC_SITE_URL` before building (it is embedded in the built site). Do not upload `.env`
   files or put secrets in `NEXT_PUBLIC_*` variables.
4. In MongoDB Atlas, allow connections from the hosting server's outbound IP address, then restart
   the application. Collections (`users`, `contactmessages`) are created automatically on first use.

For a GoDaddy VPS, deploy the same standalone folder and run `node server.js` with the environment
variables set in the process manager. For later releases, rebuild, replace the application files,
and restart the app.

## Deploying to Vercel

1. Create a MongoDB Atlas cluster and database user. Allow connections from your deployment
   environment in Atlas **Network Access**.
2. Push this folder to GitHub and import it in Vercel.
3. Add `MONGODB_URI`, `JWT_SECRET`, and `NEXT_PUBLIC_SITE_URL` in the Vercel project settings.
4. Deploy. Collections (`users`, `contactmessages`) are created automatically on first use.

## Project structure

```
app/
  layout.js            Root layout: Navbar, Footer, AuthProvider, site metadata
  page.js              Home            /
  about/ products/ careers/ contact/ legal/ login/ signup/ account/
  news/                List /news  and  [slug]/ article pages
  models/[model]/      trade-with-us, back-a-product, grow-with-us
  not-found.js         404 page
  icon.png             Favicon (bull emblem)
  globals.css          Tailwind theme, brand colours, animations
  api/
    auth/register|login|logout|me/route.js
    contact/route.js
components/            Navbar, Footer, Logo, UI, Reveal, ImageBox, forms ...
context/AuthContext.js Session state for the UI (useAuth)
data/                  content.js (all copy and news articles), images.js
hooks/useReveal.js     Scroll-reveal animation
lib/                   mongodb.js, jwt.js, session.js, validators.js, rateLimit.js, http.js, api.js ...
models/                User.js, ContactMessage.js (Mongoose)
proxy.js               Redirects visitors without a session away from /account
public/images/         Photos and logos
```

## API

All endpoints take and return JSON. Errors look like `{ "message": "..." }` with a matching status code.

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/auth/register` | `{ name, email, password }` | `201 { user }` and sets the session cookie. `409` if the email exists. |
| `POST /api/auth/login` | `{ email, password }` | `200 { user }` and sets the cookie. `401` for wrong credentials. |
| `POST /api/auth/logout` | none | Clears the cookie. |
| `GET /api/auth/me` | none | `{ user }`, or `{ user: null }` when signed out. |
| `POST /api/contact` | `{ name, email, subject, message }` | `201 { message }`; the message is stored in MongoDB. |

Validation rules live in `lib/validators.js` and are shared by the browser forms and the API,
so they cannot drift apart.

### Reading contact messages

Messages are stored in the `contactmessages` collection (newest first, `status: "new"`).
Open them in MongoDB Atlas (*Browse Collections*), Compass, or:

```js
db.contactmessages.find().sort({ createdAt: -1 })
```

## Security notes

- Passwords are hashed with bcrypt (cost 12) and never returned by the API.
- The session is a signed JWT (7 days) in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie,
  so page scripts cannot read it. (The original React app kept its token in `localStorage`.)
- `/account` is protected twice: by `proxy.js` on the server and by `ProtectedRoute` in the UI.
- Login/register/contact are rate limited per IP. The limiter is in memory, which is fine for one server;
  on serverless each instance counts separately, so use a shared store (e.g. Upstash Redis) if you need strict limits.
- Safari does not accept `Secure` cookies on `http://localhost` when running `npm start`; use `npm run dev`
  there (cookies are not `Secure` in development).

## Notes on the port

- URLs are unchanged. `/services` and `/global-trade` redirect to `/products` (as before, they showed the same page).
- Unknown news articles and models return a real 404 page.
- Images moved to `public/images` and are served through `next/image` (resized, modern formats, lazy-loaded).
- The footer year is cached (`use cache`) so every page stays in the static shell under Cache Components.
- Read `AGENTS.md` before changing framework-level code: this Next.js version has APIs newer than most training data.

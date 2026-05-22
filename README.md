# Lattice — Shared Team Calendar

A dense, shared **event calendar** for a small team. Frontend: React 19 + Vite +
TypeScript (hosted on Cloudflare Pages). Backend: Firebase (Firestore + Auth).

## What this app is for

This is **not** a tool for tracking individual members' personal schedules. It is a
single shared event calendar whose purpose is to keep everyone on the same page about
team events. Concretely it exists to:

- **Avoid double-booking from forgetfulness** — overlapping events are detected and
  surfaced (conflict badges, a top-bar conflict count, and inline warnings while you
  create an event).
- **Support pre-planning** — Year and Timeline (Gantt) views make it easy to lay out a
  quarter or a whole year at a glance.
- **Act as a historical record** — past events stay on the calendar as the team's log
  of what happened and when.
- **Assist scheduling new events** — built-in smart helpers answer questions like
  "which upcoming days are quietest?" (Suggest dates) and "what time slots are free on
  this day?" (Find free slot), so you can slot in a road-trip weekend or a free Sunday
  evening without clashing with existing events.

Events have categories (Product, Meeting, Social, Workshop, Deadline, Travel, Holiday),
optional recurrence, all-day / multi-day spans, locations, and notes. There are no
attendees and no per-person availability — conflicts are computed **event-vs-event**.

Views: **Month** (primary), **Week** (hour grid + now-line), **Agenda**, **Timeline**
(category swimlanes), **Year** (heatmap). Plus search, drag-to-reschedule, and a
per-user appearance panel (theme / accent / density / default view / weekends).

## Access model

Three tiers. The frontend resolves them with the Firebase JS SDK; **Firestore security
rules (`firestore.rules`) enforce them server-side.**

| Tier       | Sign-in                                                                 | Can do                                  |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------- |
| **Member** | Shared **password** (the password of a single fixed Firebase account)   | View everything + **create** events     |
| **Admin**  | **Google** sign-in, email approved in the `admins` collection           | Full create / edit / delete / drag       |
| **Owner**  | Google sign-in as `yilongwang05@gmail.com` (hardcoded)                  | Everything + approve / revoke admins     |

The password is enforced by Firebase Auth itself: members sign in to one shared
Email/Password account whose password *is* the team password — a wrong password is
rejected by Firebase, so **no Cloud Functions / Blaze plan are required.** A Google user
who isn't yet an admin lands on an "awaiting approval" screen and an entry is written to
`accessRequests`; the owner approves them from the in-app **Access** panel (Sidebar
footer → "Access").

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in apiKey + appId (see below)
npm run dev
```

`.env.local` (gitignored) holds the Firebase web config. Get **apiKey** and **appId**
from the Firebase console → Project settings → General → your Web app. The web API key
is not a secret but is required. Other values default to the `cisa-cal` project.

## Firebase setup (one-time, in the console)

Project: **`cisa-cal`** (number `50267769259`).

1. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
2. **Create the shared member account** (Authentication → Users → Add user) with the
   email in `VITE_MEMBER_EMAIL` (default `members@cisa-cal.web.app`) and the team
   password. Keep this email in sync with `firestore.rules` (`MEMBER_EMAIL()`).
3. **Firestore:** create a database. Collections are created on first write:
   - `events/{id}` — the shared calendar.
   - `admins/{emailKey}` — approved admins (`{ email, approved, addedBy, addedAt }`).
   - `accessRequests/{emailKey}` — pending Google users.
4. **Deploy security rules** from `firestore.rules`:
   ```bash
   npx firebase deploy --only firestore:rules --project cisa-cal
   ```
   (or paste them in the console → Firestore → Rules). Confirm `MEMBER_EMAIL()` and
   `OWNER_EMAIL()` inside the rules match your accounts.
5. **Authorized domains** (Authentication → Settings): add your Cloudflare Pages domain
   so Google sign-in popups work in production.

## Deploy to Cloudflare Pages

The frontend is a static SPA; Firebase is the only backend.

- **Build command:** `npm run build` · **Output directory:** `dist`
- Set the `VITE_FIREBASE_*` and `VITE_MEMBER_EMAIL` values as **environment variables**
  in the Pages project settings (they're inlined at build time).
- `public/_redirects` provides the SPA fallback (`/* → /index.html 200`).

Connect the repo in the Cloudflare dashboard, or deploy a local build:

```bash
npm run build
npx wrangler pages deploy dist
```

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run lint` — ESLint
- `npm run preview` — serve the production build locally

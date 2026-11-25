# 🌿 Plantify

**Find your plant. Grow your space. Keep it thriving.**

Plantify is a full-stack plant and gardening e-commerce app. It is a shop (catalogue, search, cart, checkout, orders) wrapped around a plant companion: a Plant Matchmaker, care guides, Plant SOS, a compatibility checker, a personal garden with care reminders, plant kits and a room planner.

| Layer    | Tech                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | React 19, Vite, React Router, Lucide React, hand-written CSS (no UI framework)     |
| Backend  | Node.js, Express 4 (ESM), REST API                                                 |
| Database | MongoDB with Mongoose 8                                                            |
| Auth     | JWT (7 days by default) + bcrypt-hashed passwords (`bcryptjs`, cost 12)           |

Currency is INR (₹). Payments are **mock** (COD, mock UPI, mock card). Nothing is ever charged.

---

## Contents

1. [Quick start](#quick-start)
2. [Configuration](#configuration)
3. [Seeding](#seeding)
4. [Scripts](#scripts)
5. [Production build](#production-build)
6. [Features](#features)
7. [Architecture](#architecture)
8. [API overview](#api-overview)
9. [Project structure](#project-structure)
10. [Testing](#testing)
11. [Artwork](#artwork)
12. [Limitations and honest notes](#limitations-and-honest-notes)

---

## Quick start

Requirements: **Node.js 18.18+** and a running **MongoDB** (local, Docker or Atlas).

```bash
# 1. API
cd server
npm install
cp .env.example .env          # edit MONGODB_URI / JWT_SECRET if needed
npm run seed -- --demo        # catalogue + a demo account (optional but handy)
npm run dev                   # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

Open <http://localhost:5173>. The demo account (after `--demo`) is:

```
demo@plantify.test
Plantify123
```

Or just register a new account from the Account menu. (A root `package.json` offers shortcuts too: `npm run install:all`, `npm run dev:server`, `npm run dev:client`, `npm run seed`, `npm run build`, `npm start`, `npm test`.) A MongoDB started with Docker works fine:

```bash
docker run -d --name plantify-mongo -p 27017:27017 mongo:7
```

If the catalogue is empty when the server starts, it seeds itself automatically (set `AUTO_SEED=false` to disable this).

## Configuration

### Server (`server/.env`)

| Variable             | Default                                | Notes                                                                     |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `PORT`               | `5000`                                 |                                                                           |
| `MONGODB_URI`        | `mongodb://127.0.0.1:27017/plantify`   |                                                                           |
| `JWT_SECRET`         | dev-only fallback                      | **Required** when `NODE_ENV=production`; the server refuses to start without it. |
| `JWT_EXPIRES_IN`     | `7d`                                   |                                                                           |
| `CLIENT_ORIGIN`      | `http://localhost:5173`                | Comma-separated browser origins allowed by CORS.                          |
| `SHIPPING_FLAT`      | `79`                                   | Flat shipping fee in ₹.                                                   |
| `FREE_SHIPPING_OVER` | `999`                                  | Orders at or above this subtotal ship free.                               |
| `ORDER_STAGE_MS`     | `120000`                               | Length of each simulated order stage (2 min → "Delivered" after ~8 min).  |
| `AUTO_SEED`          | `true`                                 | Seed an empty catalogue on first start.                                   |

### Client (`client/.env`, optional)

| Variable            | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `VITE_API_URL`      | Absolute API base (e.g. `https://api.example.com/api`). Default: relative `/api`. |
| `VITE_PROXY_TARGET` | Where the Vite dev server proxies `/api` (default `http://localhost:5000`).  |

The browser sends an `X-TZ-Offset` header so due dates and the care calendar follow the user's local day.

## Seeding

```bash
npm run seed                    # upsert categories, 59 products, sample reviews (keeps users/orders/carts)
npm run seed -- --demo          # also create the demo user with a small sample garden
npm run seed -- --reset-all     # drop users, orders, reviews and gardens first (fresh start)
```

The catalogue has 10 categories and **59 products**: 32 plants plus pots, soil and fertilisers, tools, accessories and 6 plant kits (the five named kits from the brief plus a gift kit). Every product has descriptions, care data (light, water, difficulty, pet safety, humidity, size…), stock and images.

Coupons available in the demo checkout: `PLANT10`, `WELCOME15`, `GREENGIFT`, `FREESHIP`.

## Scripts

**server/**

| Script              | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm start`         | Run the API (serves `client/dist` too if it exists).                  |
| `npm run dev`       | Run with `node --watch`.                                              |
| `npm run seed`      | Seed the database (see above).                                        |
| `npm test`          | 71 unit and in-memory HTTP tests (no database needed).                |
| `npm run test:api`  | Full API integration test against a real MongoDB (needs `TEST_MONGODB_URI`). |

**client/**

| Script          | What it does                                                         |
| --------------- | -------------------------------------------------------------------- |
| `npm run dev`   | Vite dev server on :5173.                                            |
| `npm run build` | Production build into `client/dist`.                                 |
| `npm run preview` | Serve the built bundle locally.                                    |
| `npm run art`   | Regenerate the SVG plant/product illustrations in `client/public`.   |

## Production build

```bash
cd client && npm install && npm run build
cd ../server && npm install
NODE_ENV=production JWT_SECRET=$(openssl rand -hex 32) MONGODB_URI=... npm start
```

Express serves the built client and the API from a single origin on `PORT`, with an SPA fallback for client-side routes. No CORS configuration is needed in that setup.

---

## Features

**Shop**
- Home page with hero, 10 category tiles, "Find your perfect plant", featured plants, 6 room collections, beginner-friendly picks, 5 named plant kits, plant-care teaser (guides, SOS, calendar, diary), community section (no invented numbers or testimonials) and a footer with a working newsletter form.
- Shop with search, category, price range, plant type, difficulty, light, pet safety, indoor/outdoor and rating filters; sort by price, popularity, rating and newest; URL-synced filters; mobile filter drawer.
- Product page: gallery, care facts, stock state, reviews (verified-purchase badge, add/edit your own), related products, recently viewed.
- Global search with live suggestions and recent searches. It is keyword search plus simple intent rules ("low light for pets", "easy plants"), not typo-tolerant fuzzy matching.
- Wishlist, cart (database-backed when signed in; `localStorage` for guests and **merged on login**), coupons, shipping rules.
- 6-stage checkout (cart → address → delivery → payment → review → confirmation) with COD, mock UPI and mock card (Luhn + expiry validation), saved addresses, stock re-check, and a confirmation page.
- Orders with status **Order Placed → Processing → Packed → Shipped → Delivered**, order history, a detail view and a tracking timeline. Stages advance automatically on a timer (`ORDER_STAGE_MS`), and the order page has a demo button to jump to the next stage.
- Profile: details, password change, address book and plant preferences (experience, typical light, pets, climate, plant types you love). There is no account-deletion feature.

**Plant companion**
- **Plant Matchmaker** – 7 questions (space, light, care time, experience, plant types, size, pets). Each plant is scored on six weighted factors: light 30, care-time 20, experience 15, room suitability 15, plant preference 10, space 10. Pets act as a safety rule (toxic plants are excluded or flagged, unverified ones are ranked lower). Results show match %, reasons, warnings and a plant "personality", and the last result is saved for signed-in users.
- **Plant Care** hub – guides, per-plant care sheets, **Plant SOS** (symptom-based diagnosis with likely causes and fixes) and a **compatibility checker** (plant vs. light/space/pets/experience, with a verdict).
- **My Garden** – add plants (from purchases or manually), per-plant care schedules (water / mist / fertilise / rotate / prune / repot with editable intervals), diary entries, growth log with chart, care history, XP / levels / streaks / challenges / badges.
- **Care calendar** and reminders (overdue / due today / upcoming) with an optional browser notification toggle.
- **Plant Kits** – premade kits plus a **custom kit builder** with live pricing and tiered bundle discounts (3+ items 5%, 4+ 8%, 5+ 12%).
- **Room planner** – pick a room, window direction and size; see a light map, place plants and get a per-plant fit rating, suggestions, and save/load plans; add the plan to the cart.

**Quality**
- Glassmorphism on the hero overlay, floating cards, matchmaker results, widgets and modals; subtle neumorphism on buttons, toggles and care controls.
- Toasts, modals, skeleton/loading, empty and error states on every data view; keyboard focus styles, ARIA labels/roles, `prefers-reduced-motion`, responsive from 320 px up with a mobile menu.

## Architecture

```
Browser (React SPA) ── /api ──▶ Express ──▶ services (pure logic) ──▶ Mongoose ──▶ MongoDB
```

- **Routes** are thin: validate input, call a service, shape the response.
- **Services** hold the logic and are pure functions where possible, so they are unit-tested without a database: `pricing`, `search`, `matchmaker`, `compatibility`, `kitBuilder`, `care`, `gamification`, `sos`, `planner`, `gardenService`.
- **Pricing is always computed on the server** (subtotal, coupon, kit discount, shipping, total). The client displays what the API returns.
- **Auth**: `protect` middleware verifies the JWT; `optionalAuth` is used for endpoints that work for guests (e.g. product pages with "reviewed by you").
- **Errors** go through one handler and return a JSON `message` (plus field errors where relevant) with the right status code. Basic in-process rate limiting protects the sign-in/register and newsletter/contact endpoints.
- **Client state** lives in small contexts (Auth, Cart, Wishlist, Reminders, Toast). Data fetching uses a tiny `useApi` hook with abort and reload support.

## API overview

All JSON, base path `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Area           | Endpoints |
| -------------- | --------- |
| Auth           | `POST /auth/register`, `POST /auth/login`, 🔒 `GET /auth/me`, 🔒 `PUT /auth/me`, 🔒 `PUT /auth/me/password`, 🔒 `POST/PUT/DELETE /auth/addresses[/:id]` |
| Catalogue      | `GET /categories`, `GET /products` (filters + sort + paging), `GET /products/suggest`, `GET /products/:slug`, `GET/POST /products/:slug/reviews` |
| Search         | `GET /search?q=` |
| Cart           | `POST /cart/quote` (price a guest cart), 🔒 `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:productId`, `DELETE /cart`, `POST /cart/merge` |
| Wishlist       | 🔒 `GET /wishlist`, `POST /wishlist/merge`, `POST/DELETE /wishlist/:productId` |
| Orders         | 🔒 `POST /orders`, `GET /orders`, `GET /orders/:ref`, `POST /orders/:ref/advance` (demo helper) |
| Matchmaker     | `GET /matchmaker/questions`, `POST /matchmaker/recommend`, 🔒 `GET /matchmaker/last`, `POST /matchmaker/save-preferences` |
| Care           | `GET /care/guides[/:slug]`, `GET /care/plants`, `GET /care/tip`, `GET /care/sos/config`, `POST /care/sos/diagnose` |
| Compatibility  | `POST /compatibility/check` |
| My Garden      | 🔒 `GET/POST /garden`, `GET /garden/reminders`, `/calendar?month=YYYY-MM`, `/stats`, `GET/PUT/DELETE /garden/:id`, `POST /garden/:id/care`, `POST/DELETE /garden/:id/diary[/:entryId]`, `POST/DELETE /garden/:id/growth[/:entryId]` |
| Kits           | `GET /kits`, `GET /kits/builder`, `POST /kits/custom/quote`, `POST /kits/custom/add-to-cart` |
| Room planner   | `GET /planner/config`, `POST /planner/map`, `/evaluate`, `/suggest`, 🔒 `GET/POST /planner/plans`, `DELETE /planner/plans/:id` |
| Misc           | `POST /newsletter`, `POST /contact`, `GET /coupons` (mounted at `/api`, not `/api/misc`) |

## Project structure

```
plantify/
├── README.md
├── server/
│   ├── .env.example
│   ├── scripts/run-tests.js          portable test runner
│   ├── src/
│   │   ├── index.js · app.js         bootstrap and Express app
│   │   ├── config/                   env + DB connection
│   │   ├── middleware/               auth, error handling, rate limiting
│   │   ├── models/                   User, Product, Category, Review, Order, GardenPlant, misc
│   │   ├── routes/                   one file per API area
│   │   ├── services/                 pricing, matchmaker, compatibility, care, planner …
│   │   ├── seed/                     catalogue, plants, supplies, kits, care content, seed script
│   │   └── utils/
│   └── test/
│       ├── unit/                     71 tests, no database required
│       └── api/api.test.js           live-database integration test
└── client/
    ├── index.html · vite.config.js
    ├── public/                       generated SVG illustrations
    ├── scripts/                      SVG art generator (`npm run art`)
    └── src/
        ├── App.jsx · main.jsx        routes
        ├── api/                      fetch wrapper
        ├── components/               Navbar, Footer, ProductCard, modals, UI kit
        ├── context/                  Auth, Cart, Wishlist, Reminders, Toast
        ├── hooks/ · utils/
        ├── pages/                    Home, Shop, ProductDetail, Cart, Checkout, Orders, Matchmaker,
        │                             PlantCare, GuidePage, MyGarden, GardenPlant, CareCalendar,
        │                             PlantKits, RoomPlanner, Profile, Auth, Info …
        └── styles/                   base.css (tokens), components.css, pages.css
```

## Testing

```bash
cd server
npm test
```

Runs 71 tests (pricing, search ranking, matchmaker scoring, compatibility, kit pricing, care scheduling, gamification, SOS, planner, model validation/hooks, catalogue integrity, and an HTTP layer exercised through the real Express app).

To run the full integration suite against a real MongoDB (it registers users, builds carts, places orders, exercises the garden, etc. in a **throw-away database** — use a dedicated name):

```bash
cd server
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/plantify_test npm run test:api
```

## Artwork

Product and hero images are **generated SVG illustrations** (`client/scripts/generate-art.mjs`, run with `npm run art`) so the project is self-contained and has no licensing questions. To use real photos, drop files into `client/public/` and change the `images` arrays in `server/src/seed/*.js` (or the `image` helper in the generator), then re-seed.

## Limitations and honest notes

- **Never run against a real MongoDB in the build environment.** A Mongo-compatible server could not be installed there, so the server was verified with unit tests, in-memory HTTP tests and a browser click-through that used an in-memory stand-in for the Mongoose models. `npm run test:api` is the live check; please run it once on your machine (see [Testing](#testing)). Mongoose-specific behaviour (indexes, query operators, transactions-free stock updates) is therefore the least-verified part.
- **Truncated brief.** The specification I received was cut off at section 13, so the rest of the "unique features" were inferred (care guides and sheets, Plant SOS, compatibility checker, My Garden with schedules/diary/growth/gamification, care calendar/reminders, plant kits and builder, room planner).
- **SVG illustrations instead of photos** (see above).
- **Demo data.** Ratings, review texts, "popularity"/sales numbers and stock are sample data generated by the seed. There are no real customers, testimonials or community statistics anywhere in the UI.
- **Mock payments.** COD, UPI and card flows validate input but never contact any payment provider; no card data is stored (only the last four digits and brand).
- **Reminders are in-app.** Due tasks show in the navbar bell, My Garden and the calendar. An optional browser notification fires only while the app is open in a tab; there is no push, email or SMS when it is closed (that would need a service worker/push service or a mail provider).
- **Order tracking is simulated.** Orders advance through the stages on a timer (`ORDER_STAGE_MS`); there is no courier integration.
- **`bcryptjs`** (pure JS) is used instead of native `bcrypt` to avoid native build steps. The API is identical; swap if you prefer.
- **Search** is an in-memory keyword and intent scorer over the catalogue, with no typo tolerance. It suits a catalogue of this size; for thousands of products use MongoDB text indexes, Atlas Search or a search engine.
- **Kits are their own SKU** for stock purposes (a kit is not decremented from its component plants).
- **Rate limiting** is per-process memory, which is fine for one instance; use a shared store behind several.
- Not included: admin/back-office UI, email delivery, image upload, i18n, a service worker/PWA.

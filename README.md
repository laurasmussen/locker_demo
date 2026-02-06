# Den Blaa Planet - Locker Rental Prototype

Interactive prototype for self-service locker rental kiosks at Den Blaa Planet aquarium in Copenhagen. Customers scan a QR code on a physical locker, choose a duration, pay, and get instant lock/unlock control from their phone.

**Live demo:** https://laurasmussen.github.io/locker_demo/demo

---

## Product Strategy

### Problem
Guests need somewhere to store bags and jackets during their visit. The current solution (coins / manual keys) creates friction, requires cash, and generates staff overhead.

### Solution
Replace physical keys with a phone-based self-service flow:

1. Guest walks up to a locker and **scans the QR code** on the door
2. An EasyPark-style **circular dial** lets them set duration (30 min - 8 hours) with tiered pricing
3. They **pay with card or MobilePay** (Danish mobile payment)
4. The locker unlocks - they can **lock/unlock freely** during the rental by re-scanning the QR or returning to the page
5. They can **extend time** if needed (charged via open PSP authorization)
6. **Late returns** are handled automatically - overstay fees (15 DKK / started 30 min) are charged to the open payment authorization
7. Optional: save phone/email for a **receipt** and **share access** with travel companions

### Key Design Decisions
- **No app download required** - runs as a mobile web page
- **No account creation** - session stored as a browser cookie with a PSP-generated token
- **Tiered pricing** - not linear per-hour; discounts for longer stays (see pricing table below)
- **Open PSP balance** - the payment service provider keeps the authorization open so extensions and overstay can be charged without a new payment flow
- **Bilingual** - Danish (default) and English, toggleable at any time
- **Gantner integration point** - the mock API (`gantner-api.ts`) mirrors the interface needed for the real Gantner lock system

### Pricing

| Duration | Price |
|----------|-------|
| Up to 1 hour | 20 DKK |
| Up to 2 hours | 30 DKK |
| Up to 3 hours | 35 DKK |
| Up to 4 hours | 40 DKK |
| Up to 6 hours | 45 DKK |
| Up to 8 hours (all day) | 50 DKK |
| Overstay | 15 DKK per started 30 min |

---

## Architecture

```
src/
├── App.tsx                    # Router setup
├── main.tsx                   # Entry point
├── index.css                  # Tailwind v4 + custom theme tokens
│
├── pages/
│   ├── DemoPage.tsx           # Demo landing (simulates QR scanning)
│   ├── HomePage.tsx           # Direct locker ID entry
│   ├── LockerPage.tsx         # Checks session -> shows RentFlow or LockerControl
│   └── AdminPage.tsx          # Staff dashboard (all lockers, open/release)
│
├── components/
│   ├── Layout.tsx             # Shell with header + language toggle
│   ├── DurationDial.tsx       # EasyPark-style SVG circular dial for time selection
│   ├── RentFlow.tsx           # Multi-step: duration -> payment -> confirmation
│   ├── LockerControl.tsx      # Post-rental: lock/unlock, extend, overstay, share
│   ├── CardScanner.tsx        # Camera-based card scanning UI (mock)
│   ├── MobilePayFlow.tsx      # MobilePay payment flow (mock)
│   ├── Spinner.tsx            # Loading spinner
│   └── ui/                    # shadcn/ui primitives (Button, Card, Input)
│
├── lib/
│   ├── gantner-api.ts         # Mock Gantner lock API (replace with real API)
│   ├── session.ts             # Cookie-based session management
│   ├── language-context.tsx   # i18n context (DK/EN)
│   ├── translations.ts        # All UI strings in Danish and English
│   └── utils.ts               # cn() helper for Tailwind class merging
│
└── assets/
    └── blaaplanet-logo.svg
```

### Key Flows

**New rental:** `DemoPage` -> `LockerPage` -> `RentFlow` (duration dial -> payment -> confirmed)

**Return visit:** `DemoPage` -> `LockerPage` (detects session cookie) -> `LockerControl` (lock/unlock/extend)

**Session persistence:** A cookie (`blaaplanet_locker_sessions`) stores active sessions as JSON. On page reload, `LockerPage` reads the cookie and calls `gantnerApi.syncFromSession()` to restore the mock API state (since the in-memory mock resets on reload).

---

## What's Real vs. Mocked

| Component | Status | Notes |
|-----------|--------|-------|
| UI / UX flow | **Real** | Production-ready React components |
| Gantner lock API | **Mocked** | `gantner-api.ts` - in-memory Map, simulated delays. Replace with real HTTP calls to Gantner server |
| Payment (PSP) | **Mocked** | `RentFlow.tsx` simulates card/MobilePay. Integrate with actual PSP (Nets, Adyen, etc.). The open balance pattern needs PSP support for incremental authorizations |
| QR scanning | **Mocked** | In production, QR on each locker encodes a URL like `https://locker.blaaplanet.dk/locker/A003`. The demo page simulates this by navigating directly |
| Session tokens | **Mocked** | Currently `crypto.randomUUID()`. In production, the PSP would issue the token |
| Camera card scan | **Mocked** | `CardScanner.tsx` accesses the camera but doesn't do real OCR |

### What Needs to Happen for Production

1. **Replace `gantner-api.ts`** with real HTTP client to Gantner lock server (REST or WebSocket). The interface is already defined - match the existing method signatures (`getLocker`, `rentLocker`, `unlockLocker`, `lockLocker`, `extendRental`, etc.)
2. **Integrate PSP** (Nets Easy, Adyen, Stripe, etc.) for:
   - Initial payment authorization (with amount hold)
   - Incremental authorization for extensions
   - Capture on session end
   - Overstay charges via open authorization
3. **Move session storage** from client-side cookies to a server-side database + API. The cookie approach works for the prototype but isn't secure for production.
4. **Print QR codes** for each physical locker, encoding the URL `https://{domain}/locker/{lockerId}`
5. **Remove `base: '/locker_demo/'`** from `vite.config.ts` when deploying to a custom domain
6. **Remove `basename`** from `BrowserRouter` in `App.tsx` (same reason as above)
7. **Add a backend** - the prototype is 100% client-side. Production needs a server for API proxying, session validation, and webhook handling from the PSP.

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install & Run

```bash
git clone https://github.com/laurasmussen/locker_demo.git
cd locker_demo
npm install
npm run dev
```

Open http://localhost:5173/locker_demo/demo in your browser.

> **Note:** The `/locker_demo/` prefix exists because `vite.config.ts` has `base: '/locker_demo/'` for GitHub Pages hosting. For local development on a custom domain, remove the `base` config and the `basename` prop in `App.tsx`, then visit http://localhost:5173/demo instead.

### Build

```bash
npm run build
```

Output goes to `dist/`. The build script also copies `index.html` to `404.html` for GitHub Pages SPA routing.

### Deploy

Push to `main` - GitHub Actions automatically builds and deploys to GitHub Pages:

```bash
git push origin main
```

### Type Check

```bash
npx tsc --noEmit
```

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool + dev server |
| Tailwind CSS | v4 | Utility-first styling |
| React Router | v7 | Client-side routing |
| Lucide React | - | Icons |
| shadcn/ui | - | Button, Card, Input primitives |
| GitHub Actions | - | CI/CD to GitHub Pages |

No backend. No database. Everything runs client-side with mock data.

---

## Locker Zones

The prototype simulates 140 lockers across 3 zones:

- **Zone A:** A001-A020 (20 lockers, near entrance)
- **Zone B:** B001-B100 (100 lockers, main hall)
- **Zone C:** C001-C020 (20 lockers, upper level)

Each locker has a size (small/medium/large) assigned cyclically. A few are randomly marked as "rented" and two (B025, B076) are permanently "out of service" for demo purposes.

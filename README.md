# Find My Business

Look up US businesses by name + state, see their registered owners and officers from corporate filings, then click **Enrich** on any officer to pull personal contact info (phone, email, age) via the EnformionGo Contact Enrich endpoint.

## Stack

- **Next.js 16 (App Router)** + TypeScript
- **Tailwind CSS** for styling
- API routes proxy all EnformionGo calls server-side so your API password never reaches the browser

## Setup

1. Install deps (already done if you ran the scaffold):

   ```bash
   npm install
   ```

2. Create `.env.local` from the template and fill in your **rotated** EnformionGo credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Then edit `.env.local`:

   ```env
   ENFORMION_BASE_URL=https://devapi.enformion.com
   ENFORMION_AP_NAME=your-access-profile-name
   ENFORMION_AP_PASSWORD=your-access-profile-password
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## How it works (the 2-step flow)

1. **Search** (`/api/business-search` → EnformionGo `BusinessV2/Search`): user submits a business name + state, gets back matched filings with embedded officers and business phones.
2. **Enrich** (`/api/enrich-contact` → EnformionGo `Contact/Enrich`): per-officer button uses the officer's name + address (and `tahoeId` when available) to pull personal phones, emails, and age.

The UI flattens the nested EnformionGo response — see `src/lib/flatten.ts`.

## Files

- `src/lib/enformion.ts` — server-side EnformionGo client (the only place that reads the API password)
- `src/lib/types.ts` — TS types for response payloads
- `src/lib/flatten.ts` — normalizes nested `newBusinessFilings` + `usCorpFilings` into a flat UI model
- `src/app/api/business-search/route.ts` — proxy route for Business Search V2
- `src/app/api/enrich-contact/route.ts` — proxy route for Contact Enrich
- `src/components/SearchForm.tsx` — the form
- `src/components/BusinessCard.tsx` — one match, with addresses, phones, and officer list
- `src/components/OfficerRow.tsx` — single officer + Enrich button

## EnformionGo endpoints used (verified live)

- `POST https://devapi.enformion.com/BusinessV2Search` with `galaxy-search-type: BusinessV2`
- `POST https://devapi.enformion.com/Contact/Enrich` with `galaxy-search-type: DevAPIContactEnrich`

Constants live at the top of `src/lib/enformion.ts`.

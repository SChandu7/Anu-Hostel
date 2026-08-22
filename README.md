# InfoREDZ — web

Plain HTML, CSS and JavaScript. No build step, no framework, no npm. Open a file, it runs.
Built as a website, not an app shell: a real sticky header with a slide-in drawer on small screens, full-bleed sections, and a proper footer. The palette, type and card language carry over from the Flutter app — the layout does not.

## Files

```
inforedz-web/
├── index.html        splash → routes to donors or sign-in
├── auth.html         sign in · register (donor or centre) · guest
├── donors.html       hero, sticky search toolbar, donor grid, helper cards
├── banks.html        centre grid, stock chips, full detail sheet
├── map.html          donors + centres on one map (Leaflet, no API key)
├── emergency.html    request board, post a request, matching donors
├── profile.html      profile hero, panels, history, stock editor
├── admin.html        network dashboard, charts, searchable tables
├── style.css        the whole design system
├── core.js          config · storage · auth · demo DB · API · shared UI
├── pages.js         one controller per page
└── README.md
```

Every page loads exactly three assets: `style.css`, `core.js`, `pages.js`. The page tells the JS who it is via `<body data-page="…">`.

## Run it

Because the pages use `fetch`, open them over HTTP, not `file://`:

```bash
cd inforedz-web
python3 -m http.server 5500
# then open http://localhost:5500
```

## Demo logins

Password for all of them: `demo123`

| Email | Role |
|---|---|
| `akif@demo.in` | Donor, B−, Guntur, 6 donations |
| `sameena@demo.in` | Donor, O+, Vijayawada |
| `famous@demo.in` | Blood bank, Bapatla |
| `cityblood@demo.in` | Blood bank, Guntur, well stocked |

Or press **Continue as guest** — everything is browsable, contact buttons ask you to sign in.

Demo data: 12 donors, 6 centres, 4 requests, 8 logged donations, all with real coordinates across Andhra Pradesh and Telangana so the map and the distance sorting have something to work with. Edits persist in `localStorage`; **Reset demo data** on the Profile page restores the original set.

## Switching to the live API

One line, in `core.js`:

```js
const CONFIG = {
  DEMO_MODE: false,                                    // ← was true
  API_BASE : 'https://api.chandus7.in/api/inforedz',
  ...
};
```

Every function in `Api` has the same signature in both modes, so nothing else changes. **CORS on the Django side has to be configured first or every request fails** — see the backend notes.

Endpoints already wired to your existing views: `/login/`, `/register/`, `/profile/` (GET, PATCH), `/location/`, `/donors/`, `/donors/map/`, `/donors/<id>/`, `/blood-banks/`, `/blood-banks/map/`, `/blood-banks/<id>/`, `/blood-banks/stock/`, `/stats/`.

Endpoints the site expects that don't exist yet: `/requests/` and `/donations/`. Both are ready to paste from the backend changes. Until they're live, the requests board and donation history work in demo mode only.

## Maps

Uses **Leaflet + OpenStreetMap** rather than Google Maps. Reason: your Android Maps API key does not work on the web — Google keys are restricted by platform, so a browser key is a separate key with its own billing and referrer restrictions. Leaflet needs neither, and you already use Nominatim (the same OSM project) for reverse geocoding, so the stack stays consistent.

To switch to Google Maps later, replace `MapPage` in `pages.js` and add a browser-restricted key. The pin data (`Api.donorsMap()`, `Api.banksMap()`) stays identical.

## What the web has that the app doesn't

- **Request board** — post a need, see open requests, filter to the groups you personally can supply, one tap to call or WhatsApp the contact.
- **Compatibility matching** — from any request, "Find matching donors" lists everyone whose group can actually give to that patient, not just an exact match.
- **Nearest first** — sorts donors by real distance from your location.
- **Eligibility checker** — self-check against age, weight, gap since last donation, and the usual deferral rules. Available from the ⋮ menu on every page.
- **Donation history** — donors log past donations; the count and "last donated" update automatically.
- **Dashboard** — donors by group, units on shelf by group, availability donut, top cities, and searchable tables of donors, centres and requests. Charts are hand-drawn SVG, so there's no chart library to load.
- **Guest mode with real depth** — guests see everything except phone numbers, which is what keeps the listing honest without exposing donors to scrapers.

## Known items before launch

1. **CORS** — nothing works without it.
2. **`user_id` auth** — safe enough inside an APK, not safe in a browser where anyone can edit `localStorage`. the backend notes has a token fix that takes about an hour.
3. **Phone numbers in `/donors/`** — the public list payload includes every donor's number. Section 5.
4. **Play Store listing language** — the same neutral-community wording you applied to the app listing should carry over to any store or ad copy for the site. The site's own copy is written that way already.

## Browser support

Chrome, Edge, Firefox, Safari — current versions and one back. Keyboard focus rings are visible throughout, `prefers-reduced-motion` is respected, and there's a print stylesheet so a centre can print a donor list.

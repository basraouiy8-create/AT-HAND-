# Wardrobe — personal wardrobe, outfits, cycle, calendar & journal app

A working prototype built from `Cahier_des_charges_App_Garde_robe.docx`. It implements the functional spec (sections 3–5) as a client-side web app, in English by default with a French switch (Réglages / Settings → Language).

## How to run

No install, no build step. Just open [index.html](index.html) in any modern desktop or mobile browser (Chrome, Edge, Firefox, Safari). Everything runs locally in the browser and is saved to that browser's `localStorage` — there is no server or account.

To try it on a phone on the same network, or avoid any local file restrictions some browsers apply, you can serve the folder instead of opening the file directly, e.g. with any static file server pointed at this folder.

## Installing it as an app (PWA)

The app includes a web manifest, a service worker, and app icons, so once it's served over `https://` (or `http://localhost` during local dev) it can be installed like a real app:

- **iPhone (Safari):** open the site, tap the Share icon, then **"Add to Home Screen"**. It launches full-screen with its own icon and keeps working offline afterwards.
- **Android (Chrome):** open the site, tap the menu (⋮), then **"Add to Home screen"** / **"Install app"**.
- **Desktop (Chrome/Edge):** an install icon appears in the address bar.

Note: service workers (the offline-caching part) only activate over `https://` or `localhost` — opening `index.html` directly as a `file://` URL still works for normal use, but skips the offline install step. To get the full installable/offline experience, host the folder somewhere with `https` (e.g. GitHub Pages) or serve it locally.

## What's implemented

Mapped to the cahier des charges:

- **Wardrobe** (§3.1): add items by photo (auto-resized/compressed client-side), category/color/material/brand/size/season/purchase date/price/tags, status (available, in laundry, lent, lost, given/sold), filters (category, season, occasion) + search, usage stats (favorites, recently worn, never worn).
- **Outfits** (§3.2): compose an outfit from wardrobe items, occasion/weather tagging, mark-as-worn history log, favorites, random outfit suggestion, link an outfit to a calendar event.
- **Cycle tracking** (§3.3): daily log (flow, symptoms, mood), next-period and fertile-window prediction from logged history, quarterly symptom analysis, PIN-lock, calendar phase overlay.
- **Calendar** (§3.4): month view, add/delete events (title, time, location, category, notes), optional cycle-phase color overlay, linked outfit per event.
- **Journal** (§3.5): one entry per day with photo(s) + free text, mood, tags, auto-linked cycle phase, search by keyword/tag/date, shares the PIN lock with Cycle.
- **Transverse** (§3.6): language switch (EN/FR), light/dark/system theme, PIN lock for Cycle & Journal, JSON export/backup, full local data erase, dashboard with cross-module stats.

Everything runs fully offline by design (§6.2) since there's no backend in this prototype — see "Scope & next steps" below.

## What's simplified vs. the full spec

- **No backend / cloud sync** (§7 proposes Flutter or React Native + Firebase/Supabase). This build is a browser-based prototype so it could be reviewed and used immediately without a build toolchain; the data model (`js/storage.js`) mirrors the entities in §8 and would map directly onto that architecture if/when a developer or agency builds the native app.
- **Notifications** (règles à venir, event reminders) are not implemented — a real push-notification system needs a backend or native app shell.
- **Biometric lock** is a 4-digit PIN instead of Face ID/fingerprint, since those require native APIs.
- **Weather-based suggestions and AI "what to wear"** (§4, Could-have) are out of scope for this prototype, per the MoSCoW prioritization in §9.
- Photos are stored as compressed base64 inside `localStorage`, which is fine for a personal prototype but has a practical size ceiling (a few hundred items); a production build should move to real cloud/object storage as proposed in §7.

## Project structure

```
index.html         App shell
css/style.css       All styling (light/dark themes via CSS variables)
js/i18n.js          English + French dictionaries and the t() translation helper
js/storage.js       localStorage persistence, seed/default data, image compression
js/app.js           All app logic: routing, rendering, and every module's behavior
manifest.json       Web app manifest (name, icons, colors) for "Add to Home Screen"
sw.js               Service worker: caches the app shell for offline use once installed
icons/              App icons used by the manifest and iOS home screen
```

## Data & privacy

All data (items, outfits, cycle entries, events, journal entries, photos) stays in your browser's local storage on your device — nothing is sent anywhere. Use Settings → "Export all data" to download a full JSON backup, and "Erase all data" to wipe it from that browser.

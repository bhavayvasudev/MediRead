# MediRead

Point. Scan. Listen. A React + TypeScript + Vite medicine-label accessibility workspace with simulated OCR, browser speech, and locally maintained medicine records.

## Run locally

Use **Node.js 24.x and npm** (tested with Node 24.12.0 and npm 11.6.2). Dependencies are pinned by `package-lock.json`.

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). No API keys, backend, database, or environment variables are required. There is intentionally no `.env.example`: the current application has no environment configuration to supply. Never place secrets in frontend source or `VITE_*` variables; those values are public in browser bundles.

## Working product journeys

- **Login → Dashboard:** use Continue with Demo Account, or create a browser-local account. New accounts start empty; the optional Load samples action is explicit. Counts and recent activity come from actual local records.
- **Scan:** upload, drag and drop, or capture a photo, select one of three labeled scenarios, and run the simulated scan. Edit the displayed text and apply changes. Listen, Stop, Replay, and English/Hindi controls use browser speech.
- **Information Check:** open from a result to save its scan snapshot. Each of six label fields distinguishes scenario evidence, user input, and unknown information. Copy unresolved questions, enter confirmed field details, then explicitly record pharmacist confirmation to resolve a question. Editing a field clears its confirmation. Changed scan snapshots reset prior confirmations.
- **Medicine Timeline:** create, edit, review, search, filter by date/type/source, and delete manual entries. Optionally link to a scan or saved medicine. No scan infers a treatment change.
- **Accessibility Audit:** optionally attach a packaging photo, assess seven issues using Issue found / Not observed / Not assessed, add observations, and save the report. Review, edit, or delete it. Readability suggestions reflect selected issues only.
- **Medicine Composition:** enter details and their source, optional actual price/currency/price basis, and any explicitly recorded professional confirmation. Select two or more records, compare them, and save an independent snapshot. Text matches require complete ingredient, strength, and dosage-form fields. Matching text does not establish medical equivalence. Price differences require matching text fields, currency, price unit, and two supplied prices; no market price or savings is invented.
- **History / Saved Medicines:** independent collections with search, filters, details, and confirmed deletion.
- **Account Settings:** Profile, Preferences, Accessibility, Help & Safety, Privacy, and Account. Text size, contrast, motion, result language, speech speed, and spoken output persist locally. Privacy includes controls to clear all local data.

## Data and safety limits

All OCR is simulated. Uploaded scan images are **not analyzed**; output always comes from the selected scenario. The simulated record factory is isolated in `src/store.tsx` (`newRecord`) and sample/label parsing lives in `src/medicine.ts`; no OCR engine is needed to use the interface. Existing unused OCR assets under `public/ocr/` are not invoked by the demo.

Scan photos remain in memory and clear on refresh or sign out. Saved accessibility audits include a resized JPEG preview (maximum 1000px on the longest side) in browser storage until the audit or all local data is deleted. This preview is not an archival copy of the photograph. All accounts, checks, confirmation notes, timeline entries, audits, composition records, comparison snapshots, and preferences use the existing `mediread.demo.v2` localStorage account store. Older accounts are migrated in memory; malformed records are filtered, invalid preferences default safely, and unavailable/full storage displays a warning. Session identifiers use sessionStorage unless Remember me is selected. Records do not sync between browsers or devices.

Local authentication is demo navigation control, **not secure authentication or user isolation**. Password verifiers are salted, but anyone with access to this browser can inspect/change records or reset passwords without identity verification. Avoid sensitive information and use a unique demo password. Browser storage can be cleared or lost; do not rely on this application as a medical record system.

Information Check confirmation means the user recorded it; MediRead does not verify a pharmacist's identity or statements. Timeline entries are manual, unverified records. Packaging audits are user-guided, not computer vision or measured contrast/font assessments. Composition comparison has no verified medicine-reference integration.

**Do not substitute medicines based on this comparison alone. A doctor or pharmacist must confirm the active ingredients, strength, dosage form, suitability, and any relevant differences before a substitution.**

Hindi speech requires an installed Hindi voice. Browser/device speech services may require network access. Camera capture needs permission and HTTPS or localhost. Playback requires an explicit action. Optional Google Fonts requests have system font fallbacks.

## Validate

```powershell
npm run validate
npm run test:e2e
```

`validate` runs application lint, Node tests, the TypeScript/Vite production build, and built-artifact/configuration checks. Vendor OCR assets are excluded from lint. `test:e2e` builds then tests the production preview at `http://127.0.0.1:4173`, covering the main journeys, local persistence, nested-route refresh, settings, responsive navigation, confirmation dialogs, malformed storage, and not-found behavior.

Browser tests use installed Google Chrome by default. For Playwright's bundled Chromium instead:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:e2e
```

Speech tests check API calls and controls with a deterministic service stub. Actual audible output, installed Hindi voices, and physical camera capture need a device check. Tests do not contact any medicine database or hosting account.

## Deployment: static Netlify site

The simplest configured path is a static site at the domain root. **Nothing has been deployed by this implementation.**

```powershell
npm ci
npm run validate
npm run preview -- --host 127.0.0.1 --port 4173
```

Production output is **`dist/`**; Vite preview is for local verification, not a production server. The smaller build-only command is `npm run build` (`tsc -b && vite build`).

When ready to publish, connect this project to Netlify using your own account and repository. This workspace may need to be initialized as a Git repository first. Use the project root as the base directory. `netlify.toml` sets:

| Setting | Value |
| --- | --- |
| Node version | `24` (also in `.nvmrc` and package engines) |
| Build command | `npm run validate` |
| Publish directory | `dist` |
| Application environment variables | None |
| SPA fallback | `/*` → `/index.html`, HTTP `200`, existing assets take priority |

The configuration includes response security headers, same-origin camera permission, a content security policy compatible with the app and optional fonts, and immutable caching for hashed assets. It uses the documented [Netlify file configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/) and [SPA rewrite behavior](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/). Enable HTTPS on the hosting account. Netlify serves existing files before the fallback, so assets remain directly accessible. An unknown application route renders the in-app not-found screen after the SPA document loads.

On another static host, upload `dist/` and configure the equivalent fallback to `/index.html` while preserving existing files, HTTPS, and the headers from `netlify.toml`. Root-relative navigation assumes root hosting; subdirectory hosting would need an explicit router/base-path update. Do not deploy under a subpath unchanged. No server health endpoint is necessary for a static SPA; `scripts/check-dist.mjs` verifies linked JS/CSS/favicon files, absence of localhost dependencies, and expected deployment settings.

After publishing, check `/timeline`, `/audit`, `/composition`, `/information-check`, `/history`, and `/settings?section=accessibility` directly and after refresh; verify CSS, images, camera permission, speech, and the configured headers in that host. Local preview tests validate the app and nested-route behavior; actual Netlify headers and routing still need a post-deployment check. No external deployment, DNS change, or account connection is performed here.

## Requirements before handling real medical records

These safeguards are **future work**, not features already present:

- Server-side authentication, identity verification, authorization, and enforceable per-user data isolation.
- Secured persistent storage, encryption as appropriate, backup/recovery, and access monitoring.
- Secure transport, privacy disclosures/consent, retention/export/deletion controls, and jurisdiction-specific review.
- Reliable, licensed medicine-reference sources with provenance and update controls.
- Audit trails for medicine-record changes and professional confirmations.
- Medical safety validation, clinical review, accessibility testing with intended users, and operational incident response.

Do not treat static deployment of this demo as completion of those requirements.

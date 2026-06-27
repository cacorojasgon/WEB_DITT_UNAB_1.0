# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Public website for DITT UNAB (Dirección de Innovación y Transferencia Tecnológica, Universidad Andrés Bello). It is a **dependency-free static site** (vanilla HTML/CSS/JS, no framework, no build toolchain) plus two Vercel serverless functions. Node 22.x. Content and UI text are in Spanish — keep new copy in Spanish and match the institutional tone.

## Commands

```bash
npm run dev        # local static server at http://localhost:3000 (scripts/serve.mjs)
npm run validate   # check internal links + asset references resolve (scripts/validate-links.mjs)
npm run build      # runs validate, then copies static entries into public/
```

There is no test runner and no linter. `npm run validate` (aliased as `npm run check`) is the closest thing to a test — run it after editing any HTML or moving/renaming files. The build **fails** if any internal `href`/`src` points to a missing file, so a passing `validate` is the gate for correctness.

## Architecture

### Source lives in the repo root; `public/` is generated

Pages are authored as `.html` files directly in the root and in route-named directories (`servicios/`, `portafolio/`, `institucional/`, etc.). `scripts/build.mjs` validates links and then copies an explicit allowlist of `staticEntries` into `public/`, which Vercel serves (`vercel.json` → `outputDirectory: public`). **Never edit files under `public/`** — they are overwritten on every build. If you add a new top-level page directory, add it to the `staticEntries` array in `scripts/build.mjs` or it will not ship.

`vercel.json` sets `cleanUrls: true` (so `/contacto` serves `contacto/index.html`) and `trailingSlash: false`. The local dev server in `scripts/serve.mjs` mirrors this resolution (tries `path`, `path.html`, then `path/index.html`).

### Two module systems by directory — this is intentional

- `scripts/*.mjs` are ESM (build/dev tooling, run via Node directly).
- `api/*.js` are CommonJS (`module.exports`) Vercel serverless functions.

Don't convert one to the other.

### Serverless form handling (`api/`)

`api/contact.js` and `api/declarar.js` are thin handlers that share `api/_utils.js`. The flow: parse JSON body → honeypot check (`body.website` non-empty ⇒ silently return success) → validate required fields → build a record with a generated `id` → `deliver()`.

`deliver()` in `_utils.js` fans out to optional integrations, all gated by env vars and all non-fatal:
- **Webhook**: `FORM_WEBHOOK_URL` or `DITT_FORMS_WEBHOOK_URL`
- **Email via Resend**: `RESEND_API_KEY` + `SUBMISSION_TO_EMAIL` (+ optional `SUBMISSION_FROM_EMAIL`)

With no env vars set, submissions still validate and return `ok: true` (logged to stdout only). When adding fields, validate and `clean()` (trim + length cap) them in the handler before they reach `deliver()`.

### Client-side JS is one file

`assets/js/main.js` is a single minified IIFE handling **all** interactivity site-wide: the mobile nav toggle, the portfolio filter/search (driven by `data-*` attributes like `[data-filters]`, `[data-tech-card]`, `card.dataset.area`), and async form submission. Forms opt in with `data-async-form` and configure themselves via `data-endpoint`, `data-success-url`. It posts JSON to the `api/` endpoints and handles the honeypot, validation, and success redirect client-side too. All styling is in the single `assets/css/main.css`.

## Conventions

- Brand: blue `#0C2340`, red `#A6192E`, Montserrat (loaded from Google Fonts with Helvetica/Arial fallback).
- Assets under `/assets/` get a 1-year immutable cache header (`vercel.json`); change filenames, not contents, when busting cache.
- When adding a page, also update `sitemap.xml` and any nav links, then run `npm run validate`.

## License

Restricted-use license (see `LICENSE.md`). Not for redistribution/reuse without written authorization from OTL UNAB (`otl@unab.cl`).

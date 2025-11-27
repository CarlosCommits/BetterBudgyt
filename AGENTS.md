# Repository Guidelines

This repository contains a Chrome extension that enhances Budgyt dashboards. Use this guide as the source of truth for contributing and for automated tools working in this tree.

## Project Structure & Module Organization

- `manifest.json` – Extension configuration and permissions (Manifest V3).
- `content.js` – Main Budgyt page logic, DOM observers, and calculations.
- `popup.html` / `popup.js` – User-facing settings UI and sync/local storage wiring.
- `styles.css` – Popup and injected styles; keep Budgyt overrides minimal and targeted.
- `images/` – Extension icons and assets.

## Build, Test, and Development

- There is no build step; load the folder directly in Chrome via `chrome://extensions` → **Load unpacked**.
- During development, use **Reload** on the extension, then refresh a `*.budgyt.com` page to verify changes.
- Use Chrome DevTools on Budgyt pages to debug `content.js` and on the popup for `popup.js`.

## Coding Style & Naming Conventions

- Use 2-space indentation, ES6+ syntax, and `const`/`let` instead of `var`.
- Prefer descriptive function and variable names tied to Budgyt concepts (e.g., `initializeScenarioObserver`, `updateColumnSelectors`).
- Keep logic for page behavior in `content.js` and configuration/UI logic in `popup.js`.

## Testing Guidelines

- No automated test framework is configured yet; rely on manual testing in Chrome.
- When adding features, verify scenarios on representative Budgyt pages (different dashboards, departments, and comparison views).
- If you introduce automated tests, place them under a new `tests/` directory and document commands in `README.md`.

## Commit & Pull Request Guidelines

- Follow the existing history: short, imperative-style messages (e.g., `Add total-only toggle`, `Fix comparison table UI`).
- Each PR should include: a clear summary, affected Budgyt views, and before/after screenshots or GIFs for UI changes.
- Avoid expanding extension permissions or adding network calls without explanation and reviewer approval.


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

## Budgyt Session Management

Budgyt uses a server-side session model that restricts modifications to **one active budget scenario at a time**. Understanding this is critical for any feature that writes data.

### How Sessions Work

- **Single Active Session**: Only one budget (identified by `BudgetUID`) can be "in session" for modifications at any given time. Attempting to modify a budget that isn't active will fail silently or return errors.
- **Session Priming**: Before making write operations (e.g., saving comments), the target budget must be activated by calling `CheckBudgetInSession`.
- **Session Context**: The session is tied to a specific `BudgetUID` and `BudgetYear`. These values are extracted from the page URL (e.g., `/Budget/DataInput/{budgetId}/{budgetYear}`).

### Key APIs for Session Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Budget/CheckBudgetInSession` | POST | Activates a budget for modification. Must be called before write operations. |
| `/Budget/GetUserComments` | POST | Fetches comments for a planning element. Also helps establish session context. |
| `/Budget/SaveUserComments` | POST | Saves a comment. Requires an active session for the target budget. |

### Current Extension Implementation

The extension handles session management in `modules/features/comparison/comments.js`:

1. **Before saving a comment**, we call `CheckBudgetInSession` with the `BudgetUID` extracted from the datasheet info.
2. **Then call `GetUserComments`** for the target `PlElementUID` and field—this ensures session context is fully established.
3. **Finally call `SaveUserComments`** with the comment data.

```javascript
// Simplified flow in activateCommentSession() and saveComment()
await fetch('/Budget/CheckBudgetInSession', {
  method: 'POST',
  body: JSON.stringify({ BudgetUID: budgetId })
});

await fetch('/Budget/GetUserComments', {
  method: 'POST', 
  body: JSON.stringify({ PlElementUID, CommentDoneOnField })
});

await fetch('/Budget/SaveUserComments', {
  method: 'POST',
  body: JSON.stringify({ PlElementUID, CommentText, NotifyUserIdCSV, ... })
});
```

### Important Considerations

- **Cross-budget comparisons**: When comparing two different budgets, comment operations will only work on one at a time. The session must be switched if commenting on items from the other budget.
- **Referer header**: The `SaveUserComments` request requires a correct `Referer` header pointing to the budget's DataInput page (e.g., `/Budget/DataInput/{budgetId}/{budgetYear}`).
- **User mentions**: To mention users in comments, prepend `@username` to `CommentText` and include user IDs in `NotifyUserIdCSV`. Use `"-1"` when no users are selected.
- **Planning Element UID**: Each transaction row has a unique `plElementUID` used to identify it in comment API calls. This is extracted from the DOM or parsed from API responses.

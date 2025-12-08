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

### Packaging for Chrome Web Store

Run `.\build.ps1` to create a zip file for submission. The script reads the version from `manifest.json` and outputs `BetterBudgyt-v{version}.zip`.

**Important:** If you add new files or folders to the extension, update the `$includes` array in `build.ps1` to ensure they are included in the package. The current includes are:

- `manifest.json`, `content.js`, `popup.html`, `popup.js`, `styles.css`
- `images/`, `modules/`, `lib/`

Development artifacts like `context/`, `*.bak`, `AGENTS.md`, and `README.md` are intentionally excluded.

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

Budgyt uses a server-side session model that restricts operations to **one active budget scenario at a time**. This affects both READ and WRITE operations. Understanding this is critical for any feature that fetches or modifies data.

### How Sessions Work

- **Single Active Session**: Only one budget (identified by `BudgetUID`) can be "in session" at any given time. This applies to BOTH reading datasheet data AND writing (comments, etc.).
- **Session Priming**: Before any operation on a budget, the session must be primed/activated. This happens via GET requests to the DataInput page or POST to `CheckBudgetInSession`.
- **Session Context**: The session is tied to a specific `BudgetUID` and `BudgetYear`. These values are extracted from the page URL (e.g., `/Budget/DataInput/{budgetId}/{budgetYear}`).

### Critical: Sequential Fetching Required

**⚠️ NEVER fetch data for multiple budget scenarios in parallel.** Each fetch operation primes the session for its budget. Parallel fetches will cause session conflicts and return incorrect data.

```javascript
//  WRONG - Parallel fetching causes session conflicts
const [data1, data2] = await Promise.all([
  fetchDatasheetData(params1, ...),  // Primes session for budget A
  fetchDatasheetData(params2, ...)   // Primes session for budget B - CONFLICT!
]);

//  CORRECT - Sequential fetching respects sessions
const data1 = await fetchDatasheetData(params1, ...);  // Primes & fetches budget A
const data2 = await fetchDatasheetData(params2, ...);  // Primes & fetches budget B
```

### Key APIs for Session Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Budget/DataInput/{id}/{year}` | GET | Primes session for a budget (done by `primeBudgetSession`) |
| `/Budget/CheckBudgetInSession` | POST | Activates a budget for modification |
| `/Budget/GetUserComments` | POST | Fetches comments; also establishes session context |
| `/Budget/SaveUserComments` | POST | Saves a comment; requires active session |

### Data Fetching Implementation

The extension handles session management in `modules/features/comparison/data-fetcher.js`:

1. **`primeBudgetSession(dataHref)`** - Makes a GET request to the DataInput URL to prime the session
2. **`fetchDatasheetData(...)`** - Calls `primeBudgetSession` first, then fetches transaction data
3. **`openDatasheetsParallel(...)`** - Despite the name, fetches datasets SEQUENTIALLY to respect sessions

```javascript
// Simplified flow in fetchDatasheetData()
async function fetchDatasheetData(parameters, accountName, dataType, dataHref) {
  // STEP 1: Prime session with GET request
  await primeBudgetSession(dataHref);
  
  // STEP 2: Fetch StoreUIDs
  const storeUIDs = await fetchStoreUIDForDepartment(...);
  
  // STEP 3: Initialize session context
  await fetchPercentApprovedValues(...);
  
  // STEP 4: Fetch actual transaction data
  // ... fetch department data ...
}
```

### Comment Operations

For saving comments (`modules/features/comparison/comments.js`):

1. **Call `CheckBudgetInSession`** with the `BudgetUID`
2. **Call `GetUserComments`** to establish context
3. **Call `SaveUserComments`** with the comment data

```javascript
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

- **Cross-budget comparisons**: When comparing two different budgets, operations will only work on one at a time. Data must be fetched sequentially, and comment operations require switching sessions.
- **Referer header**: The `SaveUserComments` request requires a correct `Referer` header pointing to the budget's DataInput page (e.g., `/Budget/DataInput/{budgetId}/{budgetYear}`).
- **User mentions**: To mention users in comments, prepend `@username` to `CommentText` and include user IDs in `NotifyUserIdCSV`. Use `"-1"` when no users are selected.
- **Planning Element UID**: Each transaction row has a unique `plElementUID` used to identify it in comment API calls. This is extracted from the DOM or parsed from API responses.
- **Background refresh**: When refreshing cached data in the background, fetches must still be sequential. See `openDatasheetsParallel` for implementation.

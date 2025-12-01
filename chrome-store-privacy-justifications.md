# Chrome Web Store – BetterBudgyt Privacy & Permission Justifications

## Single-purpose description

BetterBudgyt enhances Budgyt.com budgeting dashboards by adding customizable variance calculations, comparison tools, and clearer visual indicators, all computed locally in the users browser on existing Budgyt pages.

---

## activeTab permission justification

The `activeTab` permission is used so that when the user clicks the BetterBudgyt toolbar icon, the extension can communicate with the currently active Budgyt tab (via `chrome.tabs.sendMessage`) to apply variance calculations, comparison mode, and visual tweaks. 

The extension logic is designed specifically for `https://*.budgyt.com/*` pages and does not inspect or modify the contents of non-Budgyt sites.

---

## Host permissions justification (`https://*.budgyt.com/*`)

Host permissions for `https://*.budgyt.com/*` are required so the extension can:

- Read budget values and headers from Budgyt dashboard/DataInput tables in the current page DOM.
- Observe changes on Budgyt pages to keep calculated variances and labels in sync.
- Call existing Budgyt backend endpoints (for example, to retrieve budget rows, percent-approved values, and user comments) in the context of the signed-in Budgyt user.

All access is limited to Budgyt-owned domains. No other domains are accessed, and data is used only to compute and display enhanced views on the same Budgyt pages.

---

## Remote code usage justification

BetterBudgyt **does not execute any remote code**.

All JavaScript logic is packaged with the extension and runs locally in the browser. Network requests are limited to:

- Budgyt backend endpoints on the currently open `budgyt.com` environment (for example, to fetch budget row data and comments), and
- Loading the extensions own CSS via `chrome.runtime.getURL`.

Responses from these requests are treated strictly as data (HTML/JSON/text) to be parsed and displayed; no scripts or executable code are loaded or evaluated from remote servers. The extension does not use `eval`, `new Function`, or similar dynamic code execution.

---

## scripting permission justification

The `scripting` permission is used to run the extensions own logic that modifies Budgyt dashboard pages. This includes:

- Applying custom variance calculations and recalculated headers to Budgyt tables.
- Injecting and updating visual indicators (such as highlights and total-only views).
- Responding to user actions in the popup by updating the content of the current Budgyt tab.

Only the extensions bundled scripts and styles are applied, and only on Budgyt pages. No third-party or untrusted scripts are injected.

---

## storage permission justification

The `storage` permission is used for two narrow purposes:

1. **User settings and preferences (sync storage)**  
   BetterBudgyt stores configuration data such as:
   - Which scenarios/columns are used for variance 1 and variance 2.
   - Whether the calculator, comparison mode, total-only view, color gradients, and debug mode are enabled.
   - Any variance thresholds and highlighting options.

   These settings are non-sensitive configuration values that help provide a consistent experience across the users own Chrome profiles (via `chrome.storage.sync`).

2. **Local performance cache (local storage)**  
   To improve performance on large Budgyt datasets, the extension stores a cache of previously retrieved Budgyt datasheet responses and scenario names in `chrome.storage.local`. This cache may include budget line values that are already visible to the user in Budgyt, and it is used only to avoid redundant network requests and speed up rendering.

No authentication credentials or passwords are stored, and the cached data never leaves the users device. The extension does not send stored data to any external or third-party servers.

---

## Data usage & Developer Program Policies certification (Privacy practices)

BetterBudgyt accesses and uses data only as necessary to provide its stated functionality on Budgyt dashboards:

- It reads budget values, headers, and related information from Budgyt pages to compute variances and display enhanced views.
- It calls Budgyts own backend endpoints (on `https://*.budgyt.com/*`) solely to retrieve the same budget and comment data the user can already access, for purposes of calculation and display.
- It stores limited configuration and cached budget data in Chrome storage to improve usability and performance.

The extension **does not** collect, transmit, sell, or share user data with any third parties. It does not send data to any server controlled by the developer outside of `budgyt.com`, and it does not include analytics, tracking beacons, or advertising.

You can certify on the Privacy practices tab that data usage complies with the Chrome Web Store Developer Program Policies on the basis of the above: data access is limited, transparent, and strictly tied to providing budgeting/visualization features on Budgyt.

---

## Single purpose confirmation

This item has a single, clear purpose: to enhance Budgyt dashboards with better variance calculations, comparisons, and visual clarity. It does not provide unrelated functionality, does not alter other websites, and does not run in the background for unrelated tasks.

---

## Contact email (Account tab)

In the **Account** tab, provide a valid contact email address that you or your support team monitors, such as:

`you@example.com`

(This should be replaced with your real support or owner email. No special wording is required; Chrome just needs a verified contact address.)

---

## Contact email verification (Account tab)

After entering your contact email on the **Account** tab, follow Chrome Web Stores prompts to verify it (typically by clicking a verification link sent to that address).

No additional free-text explanation is required for this step; completing the verification process satisfies the publishing requirement.

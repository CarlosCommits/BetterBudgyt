# BetterBudgyt Chrome Extension – Privacy Policy

_Last updated: 12/1/25_  

## 1. Overview

BetterBudgyt is a Chrome extension that enhances Budgyt.com budgeting dashboards with customizable variance calculations, comparison tools, and improved visual indicators. This Privacy Policy explains what information the extension accesses, how it is used, and what is **not** done with that data.

By using the BetterBudgyt extension, you consent to the practices described in this policy.

---

## 2. Information the extension accesses

The extension itself does **not** create a new account or collect information directly from you. Instead, it operates on data that is already available to you in your existing Budgyt account within your browser.

Specifically, the extension may access:

- **Budget data displayed on Budgyt pages**  
  Values, headers, and table structures shown on `https://*.budgyt.com/*` pages (e.g., budget lines, totals, scenarios, and comments) so it can compute and display custom variance calculations and visual highlights.

- **Responses from Budgyt backend endpoints**  
  When needed for its functionality, the extension may call Budgyt endpoints (such as those that return budget rows, percent‑approved values, or user comments). These requests are made only to Budgyts own servers on `https://*.budgyt.com/*` and use the same credentials and session as your logged‑in Budgyt browser session.

- **Extension settings and preferences**  
  The extension stores configuration data such as:
  - Which scenarios/columns to use for variance 1 and variance 2
  - Whether the calculator, comparison mode, total‑only view, color gradients, and debug mode are enabled
  - Any variance thresholds or highlighting options

This configuration is stored using Chromes `chrome.storage.sync` and `chrome.storage.local` APIs.

The extension does **not** request or access your browsing history, passwords, or other websites content.

---

## 3. How information is used

The information described above is used solely to:

- Compute and display customized variance calculations and percentages.
- Provide comparison and total‑only views of your Budgyt data.
- Improve performance by caching selected Budgyt responses locally so that large tables and dashboards load faster.
- Keep scenario labels and headers in sync with the Budgyt UI.

The extension does **not** use this data for advertising, tracking unrelated browsing activity, or user profiling.

---

## 4. Data storage and retention

The extension stores data only in your browser (and optionally via Chrome Sync if enabled in your browser profile):

- **Sync storage (`chrome.storage.sync`)** – Stores user preferences and settings so they can follow you across Chrome installations where you are signed in and sync is enabled.
- **Local storage (`chrome.storage.local`)** – Stores a cache of certain Budgyt responses (e.g., datasheet data and scenario names) to reduce repeated network requests and speed up page operations.

Cached data reflects information that is already visible to you in Budgyt. It is not transmitted to any server controlled by the BetterBudgyt developer. Cache entries may be periodically pruned or cleared by the extension or by Chrome itself (e.g., due to quota limits or browser data clearing).

If you uninstall the extension or clear your browser/extension data, the stored settings and cache will be removed from your device.

---

## 5. Data sharing and third parties

- The extension **does not** send any data to servers controlled by the BetterBudgyt developer or to any third‑party analytics, advertising, or tracking services.
- Network requests initiated by the extension are limited to:
  - Budgyts own servers on `https://*.budgyt.com/*`, and
  - Loading the extensions own resources (such as CSS) via `chrome.runtime.getURL`, which is local to the extension.
- The extension does not sell, rent, or otherwise share your data with third parties.

Your use of Budgyt itself is governed by Budgyts own terms of service and privacy policy, which are separate from this extension.

---

## 6. Childrens privacy

BetterBudgyt is intended for use by business and professional users of Budgyt and is **not** directed to children. The extension does not knowingly collect personal information from children under 13. If you believe that a child under 13 has used the extension in a way that provides personal data to the developer, please contact us so the data can be addressed appropriately.

---

## 7. Security

Because the extension does not maintain its own backend or external database, data is protected primarily by:

- The security measures of the Budgyt platform and your existing Budgyt account; and
- Chromes own browser security and extension sandboxing.

You are responsible for maintaining the security of your Budgyt account (for example, protecting your credentials and device).

---

## 8. Changes to this Privacy Policy

This Privacy Policy may be updated from time to time. When changes are made, the Last updated date at the top of this document will be revised. Material changes will generally relate only to new features or clarifications of how the extension uses data.

Your continued use of the extension after any changes to this policy constitutes your acceptance of the updated policy.

---

## 9. Contact

If you have any questions about this Privacy Policy or how the BetterBudgyt extension handles data, please contact:

`tech@theesa.com`

You should also update this contact email to match the one provided in your Chrome Web Store developer account.

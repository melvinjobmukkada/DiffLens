# E2 vs E3 Content Comparator (Playwright edition)

This edition uses Chromium through Playwright instead of Node's basic fetch, which can help with pages that rely on JavaScript or reject simple HTTP clients.

## Setup on Windows / VS Code

1. Extract the ZIP and open this folder in VS Code.
2. Open Terminal in VS Code.
3. Run these commands:

```bash
npm install
npx playwright install chromium
npm start
```

4. Open http://localhost:3000.
5. Paste the E2 and E3 public URLs and compare.

## Notes
- The app opens each page in a headless Chromium browser and extracts headings, paragraphs, list items and table rows.
- Green = content found in E2 but not E3.
- Red = content found in E3 but not E2.
- Search filters headings and text.
- This does not bypass website access controls. If Amex requires corporate VPN, login, cookies, or blocks automated browsers, use a permitted authenticated browser session or export the page content.
- The first comparison is exact-text based. Reworded paragraphs may be shown as one removed item and one new item.

# Hotel Atlas

A personal, static hotel directory for U.S. personal Amex Platinum and Chase Sapphire Reserve. Search, program/country/brand filters, list and map views, map bounds filtering, local favorites, CSV export, hotel details, and official portal links.

Website: https://hotels.samermetri.com

Repository: https://github.com/samermetri/hotel-atlas

## Data

3,622 hotel records from the publicly available AwardHack hotel map, retrieved November 13, 2026. This snapshot reports 1,874 FHR, 1,442 The Hotel Collection, and 1,537 The Edit participations; overlaps explain why these totals exceed the record count. No claim of a complete or issuer-verified directory. No prices, reviews, proprietary interface code, or hotel photography are included.

178 Chase Select Hotels candidates are inferred from the directory's Chase brand labels. These are not confirmed eligibility; Select-only properties outside the three covered programs are missing. The published credit is for 2026 and the filter stops returning candidates in 2027. The guide separately explains the FHR two-night credit requirement starting January 1, 2027. Always verify the booking and remaining credits with the issuer.

The directory is a fixed snapshot. There is no scheduled refresh. Original-source merges may leave duplicates or missed overlaps. Program participation, credit terms, and map coordinates can be inaccurate or change.

Sources: https://awardhack.com/tools/hotel-credits-map ; https://www.americanexpress.com/en-us/travel/discover/hotel-finder ; https://www.americanexpress.com/en-us/travel/benefits/lodging-credit/ ; https://www.chase.com/sapphire-cards/personal/reserve ; https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve

## Running locally

Serve `public/` with any static HTTP server, e.g. `python3 -m http.server 4391 --directory public`, then visit http://127.0.0.1:4391. Map tiles require internet access. Leaflet 1.9.4 is bundled with its license. OpenStreetMap attribution remains visible. Favorites are stored locally per browser and origin; they do not sync. CSV export provides a backup. No accounts, credentials, or card details are collected.

## Hosting

The static site is in `public/`. GitHub Pages hosts it, and Cloudflare manages the custom domain's DNS. `.github/workflows/pages.yml` tests and publishes `public/` on every push to `main`, or when run manually. `public/CNAME` records the custom hostname. No database, build dependencies, or deployment secrets are needed. This is a public website and repository; favorites remain private to each visitor's browser. The site has no outbound calls except OpenStreetMap tile requests and user-initiated provider links.

Run `npm test` with Node 22 or newer to check directory integrity and credit filters. No package installation is required.

# HIGHGROUNDS\*

Storefront for HIGHGROUNDS\* — Philippine tech resale (consoles, handhelds, laptops, PC parts).

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript. Every route is statically
prerendered.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Pages

| Route          | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `/`            | Brand landing, featured inventory, trust principles, buyback band |
| `/shop`        | Full inventory grid                                               |
| `/shop/[slug]` | Single-unit detail: specs, test log, grade, warranty              |
| `/sell`        | "We buy your old tech" — the sourcing engine                      |

## Before going live

1. **Set the Messenger link.** `lib/site.ts` has `messenger` and `facebook` pointing at
   `REPLACE_WITH_PAGE_USERNAME`. Every CTA on the site routes through these.
2. **Add product photos.** Drop files in `public/products/` and set the `image` field on the
   product in `lib/products.ts` (e.g. `image: "/products/ps5-disc.jpg"`). Until then a
   placeholder frame renders. Photograph the actual unit — not a stock image.
3. **Check prices** in `lib/products.ts` against current market before publishing.

## Managing inventory

All stock lives in `lib/products.ts`. To add a unit, append to the `products` array. To mark one
sold, set `status: "sold"` — it drops off `/shop` automatically but the page stays reachable.

Statuses: `available`, `incoming`, `reserved`, `sold`.
Grades: `New`, `A`, `B`, `C` — copy for each is in `gradeCopy`.

## Design system

Brand tokens are defined once in `app/globals.css` under `@theme`:

| Token      | Hex       | Use                            |
| ---------- | --------- | ------------------------------ |
| `summit`   | `#0E1214` | Page background                |
| `panel`    | `#1C2429` | Cards, panels                  |
| `gold`     | `#C9A227` | One accent per view, max       |
| `verdant`  | `#1E9E6A` | Structural marks (test checks) |
| `signal`   | `#DC4030` | Markdowns and urgency only     |
| `steel`    | `#8B949C` | Secondary text                 |
| `ash`      | `#F4F4F2` | Primary text, trust badges     |

Type: Space Grotesk (display) + Inter (body), loaded via `next/font`. The `.label` utility is the
recurring letterspaced-caps treatment.

House rules: one gold element per view, gold never on white, trust badges are ash-on-summit with
a check mark, no gradients/glows/RGB.

## Deploying

Push to GitHub and import the repo on Vercel — no configuration needed. Any static host works
too, since every route prerenders.

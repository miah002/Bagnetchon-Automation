# Item Mapping — Questions for Client (real org 871137692)

The automation bills the **Zoho catalog price** of whichever item we map each
form option to. The live catalog has several similarly-named items at different
prices, so we need the client to pick the correct one per menu option.

Pulled live from Zoho on 2026-06-24 (`real_zoho_items.csv`, 88 items).

Legend: ✅ = clear single match, confidence high · ⚠️ = multiple candidates,
needs client pick · ❓ = no good match / price conflict.

---

## A. Variable-size LECHON (form shows price RANGES)

The invoice charges ONE fixed price. The form advertises ranges. For each size:
which catalog item + price should bill? (Or: "always adjust manually before
sending"?)

| Form option | Form price | Candidate catalog items (id · price) |
|---|---|---|
| Roasted Lechon Belly **450g / per pack** | $25/pack ❓ | NO $25 item exists. Closest: Roasted Lechon Belly `5729797000000179019` · **$120**. **What item/price for a single 450g pack?** |
| Roasted Lechon Belly **half roll** (8–11 lb) | $120–160 | Roasted LechonBelly `...447029` · $290 ⚠️ · or Roasted Lechon Belly `...179019` · $120 |
| Roasted Lechon Belly **full roll** (14–22 lb) | $200–320 | Roasted Lechon Pig `...144055` · $420 ⚠️ (note: name says "Pig", desc "Whole Lechon Pig") |
| Roasted **Cochinillo** (12–15 lb) | $450 | Roasted lechon Cochinillo `...365198` · $450 (15–20 lb) ✅ · or Roasted Cochinillo `...140023` · $380 (35–40 lb) ⚠️ |
| Roasted Lechon **De Leche** (30–39 lb) | $450–480 | Roasted Lechon De Leche `...225005` · $480 (40 lb) · or Whole De Leche `...170019` · $480 · or `...571041` · $500 ⚠️ |
| Roasted Lechon **Medium** (50–59 lb) | $500–550 | Roasted Whole Pig lechon `...164031` · $550 ⚠️ |
| Roasted Lechon **Large** (60–69 lb) | $550–600 | Roasted. Lechon pig `...379011` · $600 · or Whole Pig Lechon `...149019` · $1148 (61–65 lb) ⚠️ |
| Roasted Lechon **Extra-large** (70–80 lb) | $600–650 | Roasted Lechon `...145019` · $1100 (70–75) · or ROASTED PIG `...118035` · $550 (70–75 raw) ⚠️❓ |

**Key conflicts:** Belly 450g ($25 form vs $120 catalog, no $25 item exists);
XL ($600–650 form vs $1100/$1148 catalog).

---

## B. Sides with MULTIPLE catalog candidates

| Form option | Form price | Candidates (id · price) | Need |
|---|---|---|---|
| Shanghai Rolls (full tray) | $180 | Shanghai Rolls `...457030` $180 · Lumpia Shanghai Rolls `...222019` $180 · LUMPIANG SHANGHAI `...178001` $180 | ⚠️ pick one (all $180) |
| Pansit Canton Bihon (full tray) | $190 | Manila Pansit Canton-Bihon `...240019` **$170** · Pansit Canton Bihon `...173078` **$60** | ⚠️ which + price? (form says $190, neither matches) |
| Chop Suey (full tray) | $250 | Chop Suey `...410030` **$250** · Classic Chop Suey `...325019` **$190** | ⚠️ pick one |

---

## C. Likely-correct matches (confirm only)

| Form option | Catalog item (id · price) | |
|---|---|---|
| Steamed Rice (full tray) $90 | Steamed Rice `...173059` · **$80** | ✅ (price $80 vs form $90 — confirm) |
| Beef Kare Kare $250 | Kare-Kare Beef `...388023` · $250 | ✅ |
| Beef Bistek Tagalog $270 | Bistek Tagalog `...399019` · **$265** | ✅ (price $265 vs $270 — confirm) |
| Pork Siomai $250 | Pork Siomai `...410019` · $250 | ✅ |
| Pork Menudo $220 | Pork Menudo `...325030` · $220 | ✅ |

---

## D. Form/data fix needed

- **Chop Suey** row in `item_config` has `match_text = "Option 1"` (placeholder).
  Must be the EXACT Chop Suey option text as it appears in the form/sheet, or it
  won't match and will bill as ad-hoc with a review flag.

---

## Decisions to capture (then update `item_config_real_org.csv`)

1. Per lechon size: which catalog item_id + is the single fixed price OK, or
   manual-adjust each time?
2. Belly 450g: what item/price for a single pack? (no $25 item today)
3. Shanghai / Pansit / Chop Suey: which of the duplicates?
4. Price-conflict items (Rice $80↔$90, Bistek $265↔$270, Pansit): fix the form
   or fix the Zoho catalog?
5. Chop Suey form option exact text.

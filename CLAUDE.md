# Patch Kraze — Shopify Theme + Quote Backend

Shopify theme for **patchkraze.com** (store: `patchkraze.myshopify.com`, admin: `admin.shopify.com/store/patchkraze`). Custom patch e-commerce: embroidered/chenille/PVC/leather patches, stickers, DTF transfers, letterman jackets.

## Deployment — IMPORTANT

- This repo is **git-connected to the LIVE Shopify theme** (`patch-kraze/main`, theme id `140182224980`). **Every push to `main` auto-deploys to the live storefront within ~1 minute.** There is no staging branch — treat pushes as production deploys.
- The Shopify GitHub integration only syncs theme directories (`assets, blocks, config, layout, locales, sections, snippets, templates`). Non-theme folders (`backups/`, `quote-backend/`) are ignored by the sync — safe to keep in the repo.
- Direct theme-file writes to the live theme via Admin API are blocked by tooling policy; git push IS the deploy path.
- Note: this working copy previously had a stale `.git/index.lock` blocking commits. If git commands fail, `rm .git/index.lock` first. If local is behind origin, `git pull` (recent work was pushed from a separate clone).

## Pricing architecture (the heart of this theme)

`sections/main-product-patch-kraze.liquid` (~1750 lines) is the custom product page for all patch/sticker/DTF products. Inside its main script:

- **`PRODUCT_CONFIGS`** — per-handle size limits/defaults (min/max/default inches, step).
- **`METAFIELD_MATRIX`** — pricing grid injected from the **`custom.prices` product metafield** (JSON type, namespace `custom`, key `prices`, on ~58 products). Grid shape: `{ sizeBrackets: [...], quantityTiers: [{min, max, prices: [...]}] }`. Sticker products have a formula-shaped value (`type: 'stickers'`) which is **inert** — see below.
- **`FALLBACK_MATRIX`** — embroidered-patches grid used only if a product lacks the metafield (e.g. newly added products).
- **Display vs charge:** the matrix drives *displayed* prices; the actual cart price comes from matching a real Shopify **variant** by title (e.g. `"2.0 inch - 25-49"`, `"4 sq in - 25-49"` for DTF, `"3\" - 25-49"` for flex, `"Style #1-5 - 25-49"` for stickers). Metafield and variant prices must be kept in sync when changing prices.
- **Stickers** (`custom-vinyl-stickers`, `holographic-stickers`, `uv-transparent-stickers`, `custom-stickers`) bypass the matrix entirely and read live variant prices directly (`IS_STICKER` branch).
- Variant title quirks: `full-color-printed-patches` uses `"1 inch"` (no `.0`) for whole sizes; `pvc-patches` tier labels are `25-49` even though its matrix first tier is `min:10`; sticker last tier label is `"500+"`.

### $70 minimum-order floor (July 2026)

Cart enforces a $70 minimum. All variant prices AND `custom.prices` metafields were raised so that `tier_min_qty × price ≥ $70` (rounded up to $0.25) on every violating cell (~200 cells across 47 products). **Backups** (pre-change snapshots): `backups/custom-prices-metafield-backup-2026-07-07.json` (all metafield values + definition id) and `backups/main-product-patch-kraze.liquid.bak-2026-07-07` (pre-metafield-cutover liquid with the old hardcoded `ALL_MATRICES`).

### New pricing grids (August 2026)

Source: `New Patch Kraze Pricing.xlsx` (8 sheets). Applied to **39 products** across 5
categories; every cell verified against the workbook. Pre-change snapshot:
`backups/shopify-full-backup-2026-08-08.jsonl` (all products, options, variant
ids/titles/prices/SKUs).

- **Embroidery — 31 products, 20 sizes x 8 tiers = 160 variants each.** Sizes now run to
  **16"** (was 12"); `PRODUCT_CONFIGS.maxSize` raised to 16 for these 31 only.
- **`{min:10, max:10}` is a real tier** — the workbook prices *exactly 10 pcs* on its own,
  with graduated pricing starting at `11-25`. Variant titles must render a single-quantity
  tier as `"10"`, not `"10-10"`. Both `qtyRangeStr` (variant lookup) and the pricing-table
  row label special-case `min === max`. Getting this wrong sends the lookup to
  `"2.0 inch - 10-10"`, which misses and silently falls back to a same-size variant at the
  wrong price.
- 3D / Chenille / PVC / Woven kept their size axes; each gained a `10-24` tier.
- **`full-color-printed-patches` was deliberately left on the old grid** ("keep intact"), so
  it now diverges from the 30 products it used to share a grid with.
- `backpack-patches` and `patches-for-beanies` have no `custom.prices` metafield and fall
  back to `FALLBACK_MATRIX` (still the old grid) — also now out of step.
- **Woven inverts at 5"-7"**: 10 pcs is cheaper per piece than 25 pcs ($8.21 vs $11.95 at
  7"). That's how the workbook is written; "Buy More. Save More." reads backwards there.
- **2026-08-18 size-inversion regrade (diverges from workbook):** the embroidery grid
  priced small patches above bigger ones. Fixed on all 32 embroidery-grid products (the 31
  plus `velcro-hat-patches`, which lacks 1"/1.5" variants): 11-25 tier sizes 1"-2" dropped
  6.99 → 6.36 (joins the 2.5"-4.5" plateau; 11 × 6.36 = $69.96 still clears the $69.90 cart
  minimum in `snippets/cart-summary.liquid`), and 51-100 tier sizes 2.5"-3" raised
  2.20/2.14 → 2.40 (joins the 1"-2" plateau). Variants and metafields updated together;
  pre-change snapshot: `backups/embroidery-1125-51100-regrade-backup-2026-08-18.json`.
  The sublimation pair (`sublimation-patches-for-hats`, `full-color-printed-patches`, now
  on the sublimation book) had the same 51-100 dip and got the same fix: sizes 2.5"-3"
  raised 1.38 → 1.44 (row now 1.44 ×5, then 1.5). Same backup file covers all 34 products.
- ~14 embroidered-grid products have `templateSuffix: null` — they render on the **default**
  product template, not `patch`, so they never use the matrix at all (no size stepper, no
  tier table, every variant directly selectable from a dropdown). Predates this work.

### Workbook migration — 10-tier grids (August 2026, later pass)

Source: `New Patch Kraze Pricing.xlsx` (kept in the repo root). The store was moved
**wholesale onto the workbook**, on explicit instruction, including consequences that were
flagged and accepted: bulk prices rise steeply (1" at 301-400 went $0.27 -> $1.60, +493%),
three 16-25 cells fall below the $69.90 cart minimum and are unbuyable as written, and the
workbook's nine size-axis dips were reinstated (the 2.51-3.00" column is cheaper than 2" in
every tier from 51-100 down).

- **Quantity axis changed from 8 tiers to 10** on the embroidery family:
  `10-15, 16-25, 26-50, 51-100, 101-200, 201-300, 301-400, 401-500, 501-700, 701+`.
  Old `10`/`11-25`/`101-199`/`200-499`/`500-999`/`1000+` were renamed; `501-700` and `701+`
  are new. 30 embroidery products went 160 -> 200 variants; `velcro-hat-patches` was sparse
  (40) and went to 200.
- Sublimation (2 products) and leather (3 + 1 faux) already matched their sheets' tier
  structure, so those were price-only updates - no renames, no new variants.
- **38 products migrated, 6912 cells, all verified**: 856 cells re-read from Shopify across
  all four families with zero mismatches, and the live PDP confirmed resolving the new
  `501-700`/`701+` tiers to real variants.
- **Tier labels are NOT stored in ascending order on a product** - a real product lists
  `200-499` before `10`. Any positional remap must sort by the tier's lower bound first;
  walking them in order of appearance scrambles every price on the product (it maps the
  workbook's cheapest tier onto the most expensive variants). Cost an entire near-miss.
- No theme change was needed: `qtyRangeStr` and the pricing-table label logic in
  `main-product-patch-kraze.liquid` already derive labels from whatever tiers the metafield
  carries, including `701+` (max >= 999999) and single-quantity tiers.

**Not migrated - 23 products need a decision** *(superseded 2026-08-27, see below - most of
this list turned out to already be fine once actually checked)*. The PVC (5), woven (1) and
3D (1) sheets carry a *different size axis* than the live products (PVC sheet has 14 sizes vs
6 live), so following them changes which sizes customers can order and needs a theme stepper
change too. Seven products have no sheet at all (`dtf-transfers`, the 5 flex products,
`letterman-jacket-patches`) - my first classification pass would have swept these onto the
embroidery grid, which is badly wrong since DTF prices by square inch. Chenille (2) uses a
different sheet layout. Six more sit on older 16-size or 6-size grids.

- **2026-08-27: audited the full "23 products" list against live data + every workbook
  sheet, on explicit request ("do the 23 remaining products next").** Conclusion: most of it
  was already fine; the original count was never re-verified against actual current state.
  - **7 products need zero changes - already match their sheet exactly, cell for cell**:
    `chenille-patches`, `chenille-letter-patches`, `letterman-jacket-patches`, and
    `varsity-jacket-patches` (a name not previously tracked anywhere in this file) all match
    the **Chenille** sheet's main table (rows 4-10, tiers `10-24` through `1000+`) exactly -
    "Chenille uses a different sheet layout" was true (transposed, plus a legacy `Qty 10`
    half-inch mini-table at rows 12-13 that isn't a pricing source, same red herring pattern
    as Woven's mini-table) but the *prices* were already right. Separately,
    `custom-soccer-patches`, `american-flag-patches`, and `designer-patches` (also not
    previously named anywhere) are already on the correct 10-tier **Embroidery** grid,
    matching the sheet exactly - they were evidently part of the original 38-product pass's
    unlisted remainder, not stragglers. `custom-keychains` was already confirmed separately
    on 2026-08-27 (PVC section above).
  - **PVC size-axis expansion: explicitly declined.** `pvc-patches`/`pvc-rubber-patches`/
    `3d-pvc-patches` already have correct prices at the 6 sizes they sell; asked whether to
    add the sheet's 8 larger sizes (4.55"-8", which would need a `PRODUCT_CONFIGS.maxSize`/
    stepper change, not just new prices) - user chose to leave them at 6 sizes. No further
    PVC work pending.
  - **9 products have no matching sheet anywhere in the workbook - nothing to apply without
    new source data from the user**: `dtf-transfers` (prices by sq in; no such table exists),
    the 5 flex products (`full-color-flex-patches`, `silver-flex-patches`,
    `gold-flex-patches`, `metallic-flex-patches`, `matte-black-flex-patches`),
    `glow-in-the-dark-pvc-rubber-patches` (already known, see PVC section above),
    `tackle-twill-letters`, and `silicone-patches` (each has its own unique tier structure
    matching no sheet). **Flagged but not fixed**: `metallic-flex-patches` charges the exact
    same price at every quantity tier from `25-49` through `1000+` - no bulk discount at all,
    which reads as a data bug independent of any workbook question. Needs the user to supply
    correct numbers; not something "follow the sheet" can resolve since there's no sheet.

- **2026-08-27: compared a separate new file, `PVC UPDATE PRICING.xlsx` (in Downloads, not
  the repo), against live PVC prices - no changes made.** The `25-49` through `1000+` tiers
  are byte-identical to what's already live on `pvc-patches`/`pvc-rubber-patches`/
  `3d-pvc-patches`/`custom-keychains` at all 6 sizes - confirms those prices are current.
  The file also has a `10-24` tier in a separate, disconnected mini-table (same shape as the
  legacy mini-tables on Woven/Chenille) with meaningfully lower values (e.g. 1.5" $10.00 live
  vs $6.80 in the file) - and applying $6.80 would put 1.5" at qty 10 ($68.00) under the
  $69.90 cart minimum. User chose to leave the `10-24` tier as-is rather than trust the
  mini-table, same call as the Woven/Chenille precedent. The file's `10-24` tier for
  `custom-keychains` (which has no `10-24` tier at all today) was left un-added for the same
  reason. The file also extends PVC's size axis further than even the original workbook
  (up to 11", 19 size buckets) - not evaluated further since the size-axis question was just
  declined above.

- **2026-08-27 (later same day): reversed course, migrated `pvc-patches`/`pvc-rubber-patches`/
  `3d-pvc-patches` to the full 20-size grid from `PVC UPDATE PRICING.xlsx`.** User pointed at
  a specific cell ("PVC Rubber Patches, 2x2 its 8, 10 piece") that turned out to be the exact
  `10-24` mini-table value already flagged above - but this time wanted it applied, reversing
  the "leave as-is" call. Scope confirmed explicitly via follow-up questions: apply to all
  three products (not just Rubber), and go to the file's full 11" range rather than a smaller
  cap. Also caught mid-implementation: **`3d-pvc-patches` had no `PRODUCT_CONFIGS` entry at
  all** and was silently using the `embroidered-patches` fallback (1.0"-16.0" stepper range
  with no PVC price data past 4.0") - added its own entry as part of this change, independent
  of the size-axis decision.
  - **Sizes now run 1.5" to 11.0", 20 points, not a uniform step.** The file's own size list
    is clean 0.5" steps from 1.5" to 10.0" (18 sizes) then jumps straight to 11.0", skipping
    10.5" - and the theme's stepper (`PRODUCT_CONFIGS` min/max/step) only supports one uniform
    step per product, unlike the metafield's explicit `sizeBrackets` array. Confirmed via
    explicit follow-up question: **10.5" is linearly interpolated** between the file's 10.0"
    and 11.0" values, per tier - not a literal sheet number. The `10-24` tier's own separate
    mini-table has an *additional*, different gap (skips 8.5", not 10.5") - **8.5" is also
    interpolated** for that one tier only, applying the same approved principle without
    re-asking (a natural extension of "interpolate it yourself," not a new decision).
  - **10-24 tier, existing 6 sizes (1.5"-4.0"): raised from the old workbook's
    `[10,12,13,14,15,16]` to the new file's `[6.8,8,8.5,9.2,10,11.5]`, with 1.5" floor-fixed
    to $7.00** (10 x $7.00 = $70.00, clears $69.90; $6.80 would have been $68.00). No other
    tier or size needed a floor fix - every other tier's minimum-quantity cell was checked
    against $69.90 before writing (25-49 tier's cheapest cell alone is $125, etc.).
  - **112 new variants created per product (14 new sizes x 8 tiers), 6 existing `10-24`
    variants repriced, metafield replaced - 336 variants total across 3 products.** All
    variant-create chunks (4 x 28 per product) fired in parallel per product, since chunks
    within one product don't overlap and don't depend on each other - unlike the 3D
    Embroidered near-miss, nothing here required a second pass. Verified: fresh API re-read
    (160/160 variants match the metafield on all 3 products) plus live PDP checks at the new
    ceiling (11.0"), both interpolated sizes (8.5" and 10.5"), and confirming `3d-pvc-patches`
    now resolves a real config (`max` attribute reads 11, not the old 16 fallback).
  - **Deployment order inverted from the usual pattern, and this matters**: the stepper range
    itself lives in theme code (`PRODUCT_CONFIGS`), not the metafield, and git push auto-
    deploys within ~1 minute. Pushing the code first would have let customers select sizes up
    to 11" *before* any matching variants or metafield existed - the same "no matching price"
    failure mode this file already warns about, just triggered by a deploy instead of a
    partial API write. Order used: all Admin API writes (variants + metafields, all 3
    products) completed and verified first, theme code committed and pushed last.
  - Backup: `backups/pvc-size-expansion-backup-2026-08-27.json`.

- **2026-08-27: PVC prices updated (still not size-axis migrated).** On explicit request,
  `pvc-patches`/`pvc-rubber-patches`/`3d-pvc-patches` (identical grid) and `custom-keychains`
  had prices set to match the sheet's "Pvc Patches" tab, but **only at the 6 sizes
  (1.5"-4.0") the live products already sell** - the sheet's larger sizes (4.55"-8", 8 more
  columns) were deliberately not added, since that's a stepper/`PRODUCT_CONFIGS.maxSize`
  change, not a price change. The main PVC grid's quantity axis went from 7 tiers to 8: the
  sheet splits what was one `200-499` tier into `200-399` and `400-499` at different prices
  (avoids reinstating a same-shape inversion to the one fixed in the embroidery grid on
  2026-08-18 - a customer ordering 450 must not pay less than one ordering 350). Verified
  live: variant counts (48/48/48/36), a fresh metafield re-read, and PDP price/variant
  resolution at 250/450/600 pcs all matched the sheet with no fallback. `custom-keychains`
  was a straight price-only update (its tier structure already matched the sheet 1:1, no
  10-24 tier, no 200-499 split). **`glow-in-the-dark-pvc-rubber-patches` was left untouched**
  - the workbook has no sheet/section for it, so its prices were never guessed at. Backup:
  `backups/pvc-workbook-price-update-backup-2026-08-27.json`.

- **2026-08-27: 3D Embroidered Patches (`3d-embroidered-patches`) migrated to the 10-tier
  grid.** On explicit request ("update the woven and 3D size sheets too"), followed by three
  rounds of scope confirmation, the product's 16 sizes (1"-12") were moved from the old
  7-tier grid to the workbook's 10 tiers (adds `11-25`, `301-400`, `401-500`; renames the
  rest). Sizes 1"-9" use the sheet's own numbers; **sizes 10"-12" have no sheet coverage** and
  were linearly extrapolated per-tier from the sheet's 6"-9" trend (R² 0.948-1.000 across all
  10 tiers) — user explicitly chose extrapolation over leaving those sizes on old prices,
  since the metafield's `quantityTiers[].prices[]` is one shared axis across all sizes and
  can't mix tier structures. 112 variants renamed+repriced, 48 created new, metafield
  replaced in one pass; final state verified both via a fresh API re-read (160/160 variants
  match the metafield exactly) and live PDP checks across old/new/extrapolated tiers and
  sizes. Backup: `backups/3d-embroidered-workbook-backup-2026-08-27.json`.
  - **Two flagged issues, both now fixed**: (1) the sheet itself inverted in the `11-25`
    tier — 5.0"→6.0" dropped $7.60→$7.50 (bigger patch cheaper than a smaller one). Initially
    applied as-is since "follow the sheet" was explicit, same as the 2026-08-18 embroidery
    regrade left comparable dips alone — but on explicit follow-up request ("fix the 5 to 6
    dip on 3D too"), raised 6.0" from $7.50 to **$7.60** to match 5.0" (rather than lowering
    5.0", to avoid cutting revenue on a cell nobody flagged). Verified live at 6.0"/15pcs
    ($7.60, correct variant). Backup:
    `backups/3d-embroidered-5to6-dip-fix-backup-2026-08-27.json`. (2) **2026-08-27 (same
    day), on explicit follow-up request ("fix the 11-25 tier so it doesn't undercut
    $69.90")**: sizes 2.5"/3.0"/3.5"/4.0"
    in the `11-25` tier were below the cart floor at qty 11 (as low as $4.40 → $48.40 total).
    Raised all four to **$6.36** — the same floor-clearing price already established for this
    exact constraint (11 × $6.36 = $69.96) in the 2026-08-18 regrade — rather than a fresh
    per-cell computation, so the tier now reads 6.99, 6.99, 6.99, 6.36, 6.36, 6.36, 6.36, 6.40,
    7.60... This also shrinks (but doesn't eliminate) the 2.0"→2.5" dip from $6.99→$4.40 down
    to $6.99→$6.36. Variants + metafield updated together, verified live at 2.5"/4.0" × 11 pcs
    (both resolve the correct variant, cart total $69.96). Backup:
    `backups/3d-embroidered-workbook-backup-2026-08-27.json` (pre-migration) plus
    `backups/3d-embroidered-1125-floor-fix-backup-2026-08-27.json` (the 4 cells just before
    this fix).
  - **Near-miss caught by live verification, not by the write itself**: the 48 new variants
    were meant to be created in two chunks (sizes 1"-4.5" then 5"-12"), but only the first
    chunk actually ran before this was picked back up — the product was live for a period
    with sizes 5"-12" missing their `11-25`/`301-400`/`401-500` variants entirely, so those
    size/qty combinations would have silently fallen back to a same-size variant at the wrong
    price (the exact failure mode this file already warns about for metafield-before-variant
    ordering — turns out a partial variant-create can produce the identical symptom). Caught
    by testing an actual under-covered combo (11" @ 350 pcs) on the live page instead of only
    re-reading the API. Lesson: after any multi-chunk variant create, verify the *live PDP*
    resolves a real variant (not a fallback) for a cell in every chunk, not just a metafield
    diff — a metafield/API re-read alone would not have caught this, since the metafield was
    already correct.

- **2026-08-27: Woven Patches (`woven-patches`) migrated to the 10-tier grid.** Same request
  batch as 3D above ("update the woven and 3D size sheets too"). Re-verified against a fresh
  read of the workbook before writing anything (not just the prior session's dry-run CSV) —
  confirmed the "Woven Patches" sheet has a second, single-row mini-table (rows 23-24, finer
  half-inch sizes, "Qty 10" only) whose 6"/7" values ($7.26/$8.208) match the *old* live
  10-24 tier prices almost exactly. That mini-table is legacy reference data, not a second
  source to reconcile against — the migration draws entirely from the sheet's main
  quantity-tier table (rows 4-14), same as the already-delivered dry-run. 9 sizes (2"-7",
  no 1"/1.5" — this product never sold those) × 7 old tiers → 10 new tiers (adds `11-25`,
  `301-400`, `401-500`; renames the rest, same shape as the embroidery/3D migrations). 63
  variants renamed+repriced (3 chunks of ≤27), 27 created new (**one single call this time**,
  specifically to avoid repeating the 3D near-miss above), metafield replaced. Verified via a
  fresh API re-read (90/90 variants match the metafield exactly) and live PDP checks at
  2.5"/11pcs, 4.0"/350pcs (new 301-400 tier), 6.0"/450pcs (new 401-500 tier), and 7.0"/800pcs
  (701+ tier) — all resolved the correct variant, no fallback.
  - **Same $69.90-floor problem as 3D, caught before writing this time**: the sheet's `11-25`
    tier prices sizes 2.5"-4.5" as low as $4.30, which × 11 pcs undercuts the cart minimum by
    as much as $22.60. Applied the same fix pre-emptively, per your explicit instruction on
    3D earlier the same day: sizes 2.5"/3.0"/3.5"/4.0"/4.5" raised to **$6.36** (any sheet
    value already ≥ $6.36 — 2.0", 5.0", 6.0", 7.0" — was left alone). No other tier had a
    floor violation (checked every tier's minimum-quantity cell against $69.90 before
    writing). Backup: `backups/woven-workbook-backup-2026-08-27.json`.
  - **Root cause of the old "25 pieces cheaper than 24" inversion, now resolved as a side
    effect**: live 6"/7" prices at the old 10-24 tier ($7.26/$8.21, from the mini-table) were
    *higher* per-unit than the old 25-49 tier ($8.55/$11.95, from the main table) — buying 25
    cost more per patch than buying 24. The new grid draws both tiers from the same main
    table throughout, so this specific inversion is gone; the sheet's own smaller dips
    (documented project-wide, e.g. 3D's 5"→6" dip) were not hunted down separately here.

Tooling: `scripts/apply_workbook_pricing.py` (applies a sheet to given handles, `--dry-run`
supported; reads `SHOPIFY_ADMIN_TOKEN` from env, never logs it), `scripts/plan_workbook_offline.py`
(classifies every product against the sheets offline), `scripts/dryrun_report.py` (per-cell
CSV of every change). Backups: `backups/shopify-full-backup-2026-08-21-pre-workbook.jsonl`
(full pre-change snapshot) and `backups/workbook-migration-dryrun-2026-08-21.csv`.

Note: the backend's OAuth scope list is hardcoded in `quote-backend/server.js` - the Dev
Dashboard granting a scope is not enough, and a released app version is required too.

**Migration order matters.** Variants first, metafield last — ideally the price updates and
the `metafieldsSet` in one aliased mutation so there is no window where the displayed price
(metafield) and the charged price (variant) disagree. Setting metafields first makes the
theme compute new tier labels that have no matching variants, and the fallback at
`main-product-patch-kraze.liquid` ~L1731 then picks any same-size variant at the wrong price.

## Back to School landing page

- `sections/back-to-school-landing.liquid` + `templates/page.back-to-school.json` → live at **/pages/back-to-school** (page already created in admin, templateSuffix `back-to-school`).
- Category cards + hero pull `featured_image` and URL from real products via `all_products[...]` (block setting `product`), overridable with `image`/`link` settings. Includes card for the `letterman-jackets` product.
- `letterman-jackets` product: $100, 18 variants (Black/Navy/Red/Royal Blue/Forest Green/Maroon × S/M/L), standard product template. **Still needs photos.**

## Quote form + backend

- `sections/quote-form.liquid` — used on `/pages/quote`, service pages, back-to-school. Uses native `{% form 'contact' %}` (a previous hand-rolled version silently discarded every submission — do not regress this).
- Section setting **`backend_url`**: when set (in theme editor or template JSON), submissions POST to `{backend_url}/quote` (multipart, includes real file upload) with the native contact email fired via sendBeacon as backup; when empty, email-only flow + best-effort customer creation via `form_type=customer` beacon.
- **`quote-backend/`** — Node/Express service (deploy target: Railway, root directory `quote-backend`). Per quote: uploads design file to Shopify Files (staged upload), upserts customer tagged `quote-request`, creates a `quote_request` **metaobject** (definition auto-created on boot; view in admin under Content → Metaobjects).
- **Auth (Shopify 2026 model):** no static `shpat_` tokens. Backend exchanges `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` for short-lived Admin tokens via client-credentials grant (`POST /admin/oauth/access_token`), auto-refreshing. Requires the app installed on the store with scopes: `read/write_files, read/write_customers, read/write_metaobjects`.
- The Shopify app: "Quote Backend" in the Partners dashboard (org 2626091, app id 402895667201), custom distribution to patchkraze.
- `quote-backend/setup_railway.py` — one-shot Railway provisioning script (creates project/service from this repo, sets root dir, env vars, domain). Contains a Railway account token; prompts for Shopify client credentials.

### Current status (July 2026): LIVE and working

- Railway: project `patch-kraze-quote`, service `patch-kraze-quote`, URL `https://patch-kraze-quote-production.up.railway.app`. Deploy with `railway up --service patch-kraze-quote` from `quote-backend/`.
- Shopify app "Quote Backend" is a **Dev Dashboard app** (dashboard org 128992815, app id 402895667201). Client ID `60c05d84a31426d23482cffad0b51458` (note: starts with 60c, easy to misread as 68c).
- **Client credentials grant does NOT work here** (`shop_not_permitted`): the store belongs to a different org (user only has collaborator access). Auth instead uses the **authorization code grant**: one-time browser flow at `{backend}/auth` (redirect URL registered in the app version) → permanent offline `shpca_` token, stored in Railway as `SHOPIFY_ADMIN_TOKEN`. Re-run `/auth` only if the token is revoked/reinstalled.
- `quote_request` metaobject definition was created via Shopify MCP (the token lacks `write_metaobject_definitions`; boot-time ensureQuoteDefinition logs a scope error — harmless since the definition exists).
- `backend_url` is set in all quote-form templates (quote, back-to-school, 4 service pages).
- End-to-end verified 2026-07-28: file upload, customer tagged `quote-request`, metaobject created.

### Remaining

- Add product photos to `letterman-jackets`; add hero banner image to back-to-school page via theme editor.
- Create the 4 service pages in admin (assign templates page.service-*).

## Conventions

- Sections are self-contained: `{% schema %}` first, then `<style>`, then markup/JS. Plain CSS classes, no external deps.
- Theme is OS 2.0 (JSON templates). Default product template is `product-information` (Horizon); patch products use the custom section via their template.
- When changing prices: update BOTH variant prices and `custom.prices` metafields, and respect the $70 floor rule.
- Cart quirk: velcro backing adds a companion `velcro-backing` product line item (+$0.25/pc) via JS on add-to-cart.

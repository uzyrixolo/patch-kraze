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

**Not migrated - 23 products need a decision.** The PVC (5), woven (1) and 3D (1) sheets
carry a *different size axis* than the live products (PVC sheet has 14 sizes vs 6 live), so
following them changes which sizes customers can order and needs a theme stepper change too.
Seven products have no sheet at all (`dtf-transfers`, the 5 flex products,
`letterman-jacket-patches`) - my first classification pass would have swept these onto the
embroidery grid, which is badly wrong since DTF prices by square inch. Chenille (2) uses a
different sheet layout. Six more sit on older 16-size or 6-size grids.

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
  - **Two flagged issues, one fixed, one left as-is**: (1) the sheet itself inverts in the
    `11-25` tier — 5.0"→6.0" still drops $7.60→$7.50; this is real sheet data and "follow
    the sheet" was explicit, so it was applied as-is, same as the 2026-08-18 embroidery
    regrade left comparable dips alone. (2) **2026-08-27 (same day), on explicit follow-up
    request ("fix the 11-25 tier so it doesn't undercut $69.90")**: sizes 2.5"/3.0"/3.5"/4.0"
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

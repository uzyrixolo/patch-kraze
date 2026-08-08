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
- ~14 embroidered-grid products have `templateSuffix: null` — they render on the **default**
  product template, not `patch`, so they never use the matrix at all (no size stepper, no
  tier table, every variant directly selectable from a dropdown). Predates this work.

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

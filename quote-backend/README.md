# Patch Kraze — Quote Form Backend

Receives quote submissions from patchkraze.com and, via the Shopify Admin API:

1. Uploads the customer's design file to **Content → Files**
2. Creates/updates the **customer**, tagged `quote-request`
3. Saves the quote as a **Quote Request metaobject** (**Content → Metaobjects → Quote Request**)

## Deploy on Railway

1. Railway → **New Project → Deploy from GitHub repo** → `uzyrixolo/patch-kraze`
2. Service **Settings → Root Directory** → `quote-backend`
3. **Variables** tab, add:
   | Variable | Value |
   |---|---|
   | `SHOPIFY_SHOP` | `patchkraze.myshopify.com` |
   | `SHOPIFY_ADMIN_TOKEN` | `shpat_...` (custom app Admin API token) |
   | `ALLOWED_ORIGINS` | `https://patchkraze.com,https://www.patchkraze.com` |
4. **Settings → Networking → Generate Domain** — this public URL is what the theme's quote form posts to.

## Shopify custom app scopes

Settings → Apps and sales channels → Develop apps → Create app, enable Admin API scopes:
`write_files, read_files, write_customers, read_customers, write_metaobjects, read_metaobjects`

## Endpoints

- `GET /` — health check
- `POST /quote` — multipart form: `first_name, last_name, email, phone, need_by_date, quantity, patch_type, backing_type, border_style, width_inches, height_inches, referral_source, additional_info, design_file_link, design_file (file, max 20MB)`

The metaobject definition (`quote_request`) is created automatically on first boot.

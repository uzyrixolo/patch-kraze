# Product snapshot, 2 October 2026

A full copy of eight product listings, taken so that each one can be rebuilt exactly if it
is ever lost: title, description, tags, product template, the option name, every variant
with its title, price and SKU, and the price grid stored in the `custom.prices` metafield.

| File | Variants |
|---|---|
| `embroidered-patches.json` | 200 |
| `full-color-printed-patches.json` | 160 |
| `chenille-patches.json` | 63 |
| `leather-patches.json` | 48 |
| `faux-leather-patches.json` | 48 |
| `metallic-flex-patches.json` | 6 |
| `print-stitch-patches.json` | 200 |
| `letterman-jacket-patches.json` | 63 |

Each file holds:

- `product`: the product as served by `/products/<handle>.json` (not present for the two
  listings that were already unpublished; use `storefront_product` for those).
- `storefront_product`: the product as served by `/products/<handle>.js`.
- `price_grid_custom_prices_metafield`: the grid the product page reads its displayed prices
  from. Variant prices and this grid must stay in step (see CLAUDE.md, pricing architecture).

Photos and videos are not in the repository. They remain in the store's Files, and copies
are kept outside the repository.

To rebuild a listing: create the product with the same option name, create the variants with
the same titles and prices, set the product template to `patch`, and set the `custom.prices`
metafield (type `json`) to the saved grid. Then check on the product page that the displayed
price equals the variant price for a few sizes and quantities.

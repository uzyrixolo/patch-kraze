# Product snapshot, 7 October 2026

Taken from the Shopify Admin API after a second takedown notice hid 41 more listings. Each
file holds one product as the admin stores it: title, description, tags, product type,
template, status, every variant (title, SKU, price, option values), every media item (file
URL), the collections it is in, and the `custom.prices` price grid (raw and parsed).

- The 41 listings named in the second notice (status DRAFT, hidden by Shopify).
- The six replacement listings made on 2 October (`custom-*`), which are live.

The eight listings from the first notice are in `products-snapshot-2026-10-02/`. A full
export of every product in the store, plus copies of the photo files, is kept outside the
repository.

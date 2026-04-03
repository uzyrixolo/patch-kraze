import csv

# Current DTF sizes and their 100-199 qty prices (as base for extrapolation)
current_sizes = [
    (2, 2, 0.11), (3, 3, 0.27), (4, 2, 0.22), (4, 4, 0.32),
    (5, 3, 0.29), (5, 5, 0.56), (6, 6, 0.67), (7, 7, 0.97),
    (8, 8, 1.25), (9, 9, 1.59), (9, 11, 1.85), (10, 10, 1.93),
    (11, 5, 1.10), (11, 11, 2.38), (11, 14, 3.00), (12, 17, 3.59)
]

# Quantity tiers with their price multipliers
qty_tiers = [
    ("25-49", 2.55),
    ("50-99", 1.45),
    ("100-199", 1.0),
    ("200-499", 0.73),
    ("500-999", 0.58),
    ("1000+", 0.45)
]

# Calculate price per square inch from largest current size
max_current = max(current_sizes, key=lambda x: x[0] * x[1])
price_per_sqin = max_current[2] / (max_current[0] * max_current[1])

# Generate sizes from 2x2 up to 22x22
sizes = []
for w in range(2, 23):
    for h in range(2, w + 1):
        if not any(c[0] == w and c[1] == h for c in current_sizes):
            sq_in = w * h
            base_price = sq_in * price_per_sqin
            sizes.append((w, h, base_price))

all_sizes = current_sizes + sizes

# Write CSV using csv module for proper quoting
with open('dtf-transfers-matrix.csv', 'w', newline='') as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    
    # Header
    writer.writerow([
        'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type',
        'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU',
        'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
        'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price',
        'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
        'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text',
        'Gift Card', 'SEO Title', 'SEO Description', 'Variant Weight Unit', 'Status'
    ])
    
    first = True
    for w, h, base_price in sorted(all_sizes, key=lambda x: (x[0], x[1])):
        for qty_tier, multiplier in qty_tiers:
            price = round(base_price * multiplier, 2)
            option_value = f'{w}" x {h}" - {qty_tier}'
            sku = f"DTF-{w}x{h}-{qty_tier.replace('-', '').replace('+', 'plus')}"
            
            if first:
                writer.writerow([
                    'dtf-transfers',
                    'DTF Transfers',
                    'Custom DTF Transfers printed in USA. Fast shipping.',
                    'Patch Kraze',
                    'Uncategorized',
                    'custom transfers',
                    'DTF Transfers, custom transfers, upload',
                    'TRUE',
                    'Transfer Size x Quantity',
                    option_value,
                    sku,
                    '0',
                    'shopify',
                    '100',
                    'deny',
                    'manual',
                    str(price),
                    '',
                    'TRUE',
                    'TRUE',
                    '',
                    'https://cdn.shopify.com/s/files/1/0558/0265/8899/files/DTF-by-size.png?v=1772055886',
                    '1',
                    '',
                    'FALSE',
                    '',
                    '',
                    'lb',
                    'active'
                ])
                first = False
            else:
                writer.writerow([
                    'dtf-transfers',
                    '', '', '', '', '', '', '',
                    option_value,
                    sku,
                    '0',
                    'shopify',
                    '100',
                    'deny',
                    'manual',
                    str(price),
                    '',
                    'TRUE',
                    'TRUE',
                    '',
                    '', '', '', '', '', '', '',
                    'lb',
                    ''
                ])

print(f"Generated CSV with {len(all_sizes)} sizes × {len(qty_tiers)} tiers = {len(all_sizes) * len(qty_tiers)} variants")
print(f"Max size: 22x22, Price at 100-199 qty: ${round(22*22*price_per_sqin, 2)}")

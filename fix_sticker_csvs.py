import csv
import os

csv_files = [
    'custom-vinyl-stickers-matrix.csv',
    'custom-bumper-stickers-matrix.csv',
    'custom-stickers-matrix.csv'
]

for csv_file in csv_files:
    if not os.path.exists(csv_file):
        print(f"Skipping {csv_file} - file not found")
        continue
    
    print(f"\nProcessing {csv_file}...")
    
    rows = []
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            clean_row = {k: v for k, v in row.items() if k is not None}
            rows.append(clean_row)
    
    with open(csv_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL, extrasaction='ignore')
        writer.writeheader()
        
        first_row = rows[0]
        for row in rows:
            if not row.get('Handle'):
                row['Handle'] = first_row.get('Handle', '')
            
            if row != first_row:
                for field in ['Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published']:
                    if not row.get(field):
                        row[field] = first_row.get(field, '')
            
            for bool_field in ['Published', 'Variant Requires Shipping', 'Variant Taxable', 'Gift Card']:
                if row.get(bool_field):
                    row[bool_field] = row[bool_field].upper()
            
            for field in fieldnames:
                if field not in row or row[field] is None:
                    row[field] = ''
            
            writer.writerow(row)
    
    print(f"  Fixed {len(rows)} variants")

print("\nAll sticker CSVs are ready for Shopify import!")

#!/usr/bin/env python3
"""Apply 'New Patch Kraze Pricing.xlsx' to Shopify variants + custom.prices metafields.

Reads SHOPIFY_ADMIN_TOKEN and SHOPIFY_SHOP from the environment (never logged).
Usage:
  python3 apply_workbook_pricing.py --family Embroidery --dry-run
  python3 apply_workbook_pricing.py --family Embroidery --handles embroidered-patches
"""
import os, json, sys, time, argparse, subprocess

WORKBOOK = os.environ.get('PRICING_WORKBOOK', '/Users/zolo/patch-kraze/New Patch Kraze Pricing.xlsx')
SHOP = os.environ.get('SHOPIFY_SHOP', 'patchkraze.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN')
API = '2026-01'

# workbook tier label -> (min, max) used in the metafield
def tier_bounds(label):
    l = label.strip().replace('+', '')
    if '-' in l:
        a, b = l.split('-', 1)
        return int(a), int(b)
    return int(l), int(l)

def tier_variant_label(mn, mx):
    """Must match the theme's qtyRangeStr in main-product-patch-kraze.liquid."""
    if mx >= 999999: return f"{mn}+"
    if mn == mx: return str(mn)
    return f"{mn}-{mx}"

def load_family(sheet):
    import openpyxl
    wb = openpyxl.load_workbook(WORKBOOK, data_only=True)
    ws = wb[sheet]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    # find header row: the one containing 'QUANTITY'
    hi = next(i for i, r in enumerate(rows)
              if any(isinstance(c, str) and c.strip().upper() == 'QUANTITY' for c in r))
    hrow = rows[hi]
    qcol = next(i for i, c in enumerate(hrow)
                if isinstance(c, str) and c.strip().upper() == 'QUANTITY')
    size_cols = [i for i in range(qcol + 1, len(hrow)) if hrow[i] not in (None, '')]
    sizes = []
    for i in size_cols:
        txt = str(hrow[i]).strip().replace('"', '').replace("'", '')
        txt = txt.replace('=', '-').replace('Up to ', '')
        txt = txt.split('-')[-1].strip()
        sizes.append(round(float(txt), 2))
    tiers = []
    for r in rows[hi + 1:]:
        if r[qcol] in (None, ''): continue
        label = str(r[qcol]).strip()
        # sheets can hold a second, unrelated table below the main grid
        if not label[0].isdigit(): break
        prices = [r[i] for i in size_cols]
        if all(p is None for p in prices): continue
        mn, mx = tier_bounds(label)
        if label.endswith('+') or '1000+' in label: mx = 999999
        tiers.append({'min': mn, 'max': mx,
                      'prices': [None if p is None else round(float(p), 2) for p in prices]})
    return sizes, tiers

def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}})
    cmd = ['curl', '-s', '-m', '120', '-X', 'POST',
           f'https://{SHOP}/admin/api/{API}/graphql.json',
           '-H', 'Content-Type: application/json',
           '-H', f'X-Shopify-Access-Token: {TOKEN}',
           '--data-binary', '@-']
    for attempt in range(5):
        out = subprocess.run(cmd, input=body, capture_output=True, text=True).stdout
        try:
            j = json.loads(out)
        except Exception:
            if attempt == 4: raise RuntimeError('non-JSON response: ' + out[:200])
            time.sleep(2 * (attempt + 1)); continue
        if 'errors' in j:
            msg = json.dumps(j['errors'])[:300]
            if 'THROTTLED' in msg.upper() and attempt < 4:
                time.sleep(3 * (attempt + 1)); continue
            raise RuntimeError(msg)
        return j['data']


Q_PRODUCT = '''query($h:String!){ productByHandle(handle:$h){ id handle title
  options{ id name optionValues{ id name } }
  metafield(namespace:"custom", key:"prices"){ value }
  variants(first:250){ nodes{ id title price } } } }'''

M_UPDATE = '''mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkUpdate(productId:$p, variants:$v){
    productVariants{ id } userErrors{ field message } } }'''

M_CREATE = '''mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){
  productVariantsBulkCreate(productId:$p, variants:$v, strategy:REMOVE_STANDALONE_VARIANT){
    productVariants{ id title } userErrors{ field message } } }'''

M_METAFIELD = '''mutation($m:[MetafieldsSetInput!]!){
  metafieldsSet(metafields:$m){ metafields{ id } userErrors{ field message code } } }'''

def size_label(s, style):
    if style == 'int':      # e.g. "1 inch"
        return f"{int(s)} inch" if float(s).is_integer() else f"{s} inch"
    return f"{s:.1f} inch"  # e.g. "1.0 inch"

def plan_product(p, sizes, tiers):
    """Return (updates, creates, metafield_value, report)."""
    opt = p['options'][0]
    opt_id = opt['id']
    existing = {v['title']: v for v in p['variants']['nodes']}
    style = 'int' if any(t.split(' inch')[0].isdigit() and '.' not in t.split(' inch')[0]
                         for t in existing) else 'dec'
    # current variants in workbook order, matched by (size, tier) position
    old_titles = list(existing.keys())
    # tier labels currently on the product, in their existing order of appearance
    # Tier labels are NOT stored in ascending order on the product (a real
    # product lists '200-499' before '10'), so sort by the tier's lower bound.
    # Relying on order of appearance silently maps bulk prices onto the small
    # tiers and scrambles every price on the product.
    seen = set()
    for t in old_titles:
        if ' - ' in t:
            seen.add(t.split(' - ', 1)[1])
    def _lab_min(lab):
        return int(lab.replace('+', '').split('-')[0])
    old_tiers = sorted(seen, key=_lab_min)
    new_tiers = [tier_variant_label(t['min'], t['max']) for t in tiers]

    updates, creates, report = [], [], []
    # positional remap: old tier i -> new tier i (workbook order matches site order)
    for ti, tier in enumerate(tiers):
        newlab = new_tiers[ti]
        oldlab = old_tiers[ti] if ti < len(old_tiers) else None
        for si, s in enumerate(sizes):
            price = tier['prices'][si]
            if price is None: continue
            newtitle = f"{size_label(s, style)} - {newlab}"
            oldtitle = f"{size_label(s, style)} - {oldlab}" if oldlab else None
            if oldtitle and oldtitle in existing:
                v = existing[oldtitle]
                entry = {'id': v['id'], 'price': f"{price:.2f}"}
                if newtitle != oldtitle:
                    entry['optionValues'] = [{'optionId': opt_id, 'name': newtitle}]
                updates.append(entry)
                report.append((oldtitle, newtitle, v['price'], f"{price:.2f}"))
            elif newtitle in existing:
                v = existing[newtitle]
                updates.append({'id': v['id'], 'price': f"{price:.2f}"})
                report.append((newtitle, newtitle, v['price'], f"{price:.2f}"))
            else:
                creates.append({'price': f"{price:.2f}",
                                'optionValues': [{'optionId': opt_id, 'name': newtitle}]})
                report.append((None, newtitle, None, f"{price:.2f}"))
    grid = {'sizeBrackets': sizes,
            'quantityTiers': [{'min': t['min'], 'max': t['max'],
                               'prices': [p for p in t['prices'] if p is not None]} for t in tiers]}
    return updates, creates, json.dumps(grid), report

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--family', required=True)
    ap.add_argument('--handles', nargs='+', required=True)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if not TOKEN:
        sys.exit('SHOPIFY_ADMIN_TOKEN not in environment')
    sizes, tiers = load_family(a.family)
    print(f"[{a.family}] sizes={sizes}")
    print(f"[{a.family}] tiers=" + ', '.join(tier_variant_label(t['min'], t['max']) for t in tiers))
    for h in a.handles:
        p = gql(Q_PRODUCT, {'h': h})['productByHandle']
        if not p:
            print(f"  !! {h}: not found"); continue
        up, cr, mf, rep = plan_product(p, sizes, tiers)
        renames = sum(1 for o, n, _, _ in rep if o and o != n)
        print(f"\n== {h}: {len(p['variants']['nodes'])} existing -> "
              f"{len(up)} updated ({renames} renamed), {len(cr)} created, "
              f"{len(up)+len(cr)} total")
        for o, n, op, np_ in rep[:4]:
            print(f"     {str(o):26} -> {n:26}  ${op} -> ${np_}")
        print(f"     ... ({len(rep)} cells)")
        if a.dry_run:
            continue
        r = gql(M_UPDATE, {'p': p['id'], 'v': up})['productVariantsBulkUpdate']
        if r['userErrors']: print("   UPDATE ERRORS:", r['userErrors'][:3]); continue
        if cr:
            r2 = gql(M_CREATE, {'p': p['id'], 'v': cr})['productVariantsBulkCreate']
            if r2['userErrors']: print("   CREATE ERRORS:", r2['userErrors'][:3]); continue
        r3 = gql(M_METAFIELD, {'m': [{'ownerId': p['id'], 'namespace': 'custom',
                                      'key': 'prices', 'type': 'json', 'value': mf}]})['metafieldsSet']
        if r3['userErrors']: print("   METAFIELD ERRORS:", r3['userErrors'][:3]); continue
        print(f"   OK: variants + metafield applied")

main()

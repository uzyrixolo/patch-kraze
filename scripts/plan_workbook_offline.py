#!/usr/bin/env python3
"""Compute the full workbook migration plan OFFLINE from the pre-change backup.
No API access needed. Produces a per-product change report for review."""
import json, collections, sys, importlib.util

BACKUP = 'backups/shopify-full-backup-2026-08-21-pre-workbook.jsonl'
src = open('scripts/apply_workbook_pricing.py').read().replace('\nmain()\n', '\n')
ns = {'__name__': 'notmain'}
exec(compile(src, 'apply', 'exec'), ns)
load_family, tier_label = ns['load_family'], ns['tier_variant_label']

def classify(handle):
    h = handle.lower()
    if 'chenille' in h: return 'Chenille'
    if '3d-embroidered' in h or 'embroidered-3d' in h: return 'Embroidered 3D Patch'
    if 'pvc' in h or 'keychain' in h: return 'Pvc Patches'
    if 'woven' in h: return 'Woven Patches'
    if 'sublimation' in h or 'full-color-printed' in h: return 'Sublimation Patches'
    if 'faux-leather' in h: return 'Faux Leather Dye Debossed'
    if 'leather' in h: return 'Original Leather engraving'
    return 'Embroidery'

prods, variants = {}, collections.defaultdict(list)
for line in open(BACKUP):
    r = json.loads(line)
    if r['id'].startswith('gid://shopify/Product/'): prods[r['id']] = r
    else: variants[r['__parentId']].append(r)

fams = {}
for name in ['Embroidery','Pvc Patches','Sublimation Patches','Faux Leather Dye Debossed',
             'Original Leather engraving','Woven Patches','Embroidered 3D Patch','Chenille']:
    try: fams[name] = load_family(name)
    except Exception as e: print(f"  !! sheet {name}: {e}")

groups = collections.defaultdict(list)
skipped = []
for gid, p in prods.items():
    mf = p.get('metafield')
    if not mf or not mf.get('value'):
        continue
    try: grid = json.loads(mf['value'])
    except Exception: continue
    if not isinstance(grid, dict) or 'sizeBrackets' not in grid:
        skipped.append((p['handle'], 'formula-shaped (sticker)')); continue
    groups[classify(p['handle'])].append((gid, p, grid))

report = {}
print(f"{'FAMILY':<30} {'PRODUCTS':>8} {'SIZES':>6} {'TIERS':>6}  NOTES")
total_products = total_cells = total_new = 0
for fam, items in sorted(groups.items()):
    if fam not in fams:
        print(f"{fam:<30} {len(items):>8}   -- no sheet --"); continue
    sizes, tiers = fams[fam]
    note = ''
    for gid, p, grid in items:
        cur_sizes = grid['sizeBrackets']
        if len(cur_sizes) != len(sizes):
            note = f"size-axis differs on some products (live {len(cur_sizes)} vs book {len(sizes)})"
    print(f"{fam:<30} {len(items):>8} {len(sizes):>6} {len(tiers):>6}  {note}")
    for gid, p, grid in items:
        cur_tiers = len(grid['quantityTiers']); cur_sizes = len(grid['sizeBrackets'])
        cells_now = cur_tiers * cur_sizes
        cells_new = len(tiers) * len(sizes)
        report[p['handle']] = {'family': fam, 'live_variants': len(variants[gid]),
                               'live_grid': f"{cur_sizes}x{cur_tiers}",
                               'new_grid': f"{len(sizes)}x{len(tiers)}",
                               'new_variants_needed': cells_new - len(variants[gid])}
        total_products += 1; total_cells += cells_new
        total_new += max(0, cells_new - len(variants[gid]))
print()
print(f"TOTAL: {total_products} products, {total_cells} price cells to write, ~{total_new} new variants to create")
if skipped:
    print("skipped:", skipped)
json.dump(report, open('/tmp/workbook_plan.json','w'), indent=1)

print("\nPER-PRODUCT (first 20):")
print(f"{'HANDLE':<34}{'FAMILY':<26}{'LIVE':>6}{'GRID':>9}{'->':^4}{'NEW':>9}{'ADD':>6}")
for h, r in sorted(report.items(), key=lambda kv:(kv[1]['family'], kv[0]))[:20]:
    print(f"{h:<34}{r['family']:<26}{r['live_variants']:>6}{r['live_grid']:>9}{'->':^4}{r['new_grid']:>9}{r['new_variants_needed']:>6}")

#!/usr/bin/env python3
"""Generate JSONL variable-sets for Shopify bulkOperationRunMutation.
One line per product. Mode 'update' reprices+renames existing variants;
mode 'create' adds variants for tiers the product doesn't have yet."""
import json, sys, collections, argparse

src = open('scripts/apply_workbook_pricing.py').read().replace('\nmain()\n', '\n')
ns = {'__name__': 'x'}; exec(compile(src, 'a', 'exec'), ns)
load_family, tier_label, size_label = ns['load_family'], ns['tier_variant_label'], ns['size_label']

ap = argparse.ArgumentParser()
ap.add_argument('--mode', choices=['update','create'], required=True)
ap.add_argument('--handles', nargs='+')
ap.add_argument('--family')
ap.add_argument('--out', required=True)
a = ap.parse_args()

mapping = json.load(open('/tmp/mapping.json'))
prods, variants = {}, collections.defaultdict(list)
for line in open('backups/shopify-full-backup-2026-08-21-pre-workbook.jsonl'):
    r = json.loads(line)
    if r['id'].startswith('gid://shopify/Product/'): prods[r['id']] = r
    else: variants[r['__parentId']].append(r)
by_handle = {p['handle']: (gid, p) for gid, p in prods.items()}

targets = [(h,f) for h,f,_,_,_ in mapping['ok']
           if (not a.handles or h in a.handles) and (not a.family or f == a.family)]
fams, lines, stats = {}, [], []
for handle, fam in targets:
    if fam not in fams: fams[fam] = load_family(fam)
    sizes, tiers = fams[fam]
    gid, p = by_handle[handle]
    opt_id = p['options'][0]['id']
    existing = {v['title']: v for v in variants[gid]}
    labels = {t.split(' - ',1)[1] for t in existing if ' - ' in t}
    old_tiers = sorted(labels, key=lambda l: int(l.replace('+','').split('-')[0]))
    new_tiers = [tier_label(t['min'], t['max']) for t in tiers]
    style = 'int' if any(t.split(' inch')[0].isdigit() and '.' not in t.split(' inch')[0]
                         for t in existing) else 'dec'
    ups, crs = [], []
    for ti, tier in enumerate(tiers):
        newlab = new_tiers[ti]
        oldlab = old_tiers[ti] if ti < len(old_tiers) else None
        for si, s in enumerate(sizes):
            price = tier['prices'][si]
            if price is None: continue
            newt = f"{size_label(s, style)} - {newlab}"
            oldt = f"{size_label(s, style)} - {oldlab}" if oldlab else None
            if oldt and oldt in existing:
                e = {'id': existing[oldt]['id'], 'price': f"{price:.2f}"}
                if newt != oldt:
                    e['optionValues'] = [{'optionId': opt_id, 'name': newt}]
                ups.append(e)
            elif newt not in existing:
                crs.append({'price': f"{price:.2f}",
                            'optionValues': [{'optionId': opt_id, 'name': newt}]})
    payload = ups if a.mode == 'update' else crs
    if payload:
        lines.append(json.dumps({'productId': gid, 'variants': payload}))
        stats.append((handle, len(payload)))

open(a.out, 'w').write('\n'.join(lines) + '\n')
print(f"{a.mode}: {len(lines)} products, {sum(n for _,n in stats)} variants -> {a.out}")
for h, n in stats[:6]: print(f"   {h:<34} {n}")
if len(stats) > 6: print(f"   ... +{len(stats)-6} more")

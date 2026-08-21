#!/usr/bin/env python3
"""Offline dry-run: every price change the workbook migration would make.
Reads the backup + workbook only. Writes a reviewable CSV. No API, no writes."""
import json, csv, collections

src = open('scripts/apply_workbook_pricing.py').read().replace('\nmain()\n', '\n')
ns = {'__name__': 'x'}; exec(compile(src, 'a', 'exec'), ns)
load_family, tier_label, size_label = ns['load_family'], ns['tier_variant_label'], ns['size_label']

mapping = json.load(open('/tmp/mapping.json'))
prods, variants = {}, collections.defaultdict(list)
for line in open('backups/shopify-full-backup-2026-08-21-pre-workbook.jsonl'):
    r = json.loads(line)
    if r['id'].startswith('gid://shopify/Product/'): prods[r['id']] = r
    else: variants[r['__parentId']].append(r)
by_handle = {p['handle']: (gid, p) for gid, p in prods.items()}

fams, rows = {}, []
for handle, fam, live, book, livevars in mapping['ok']:
    if fam not in fams: fams[fam] = load_family(fam)
    sizes, tiers = fams[fam]
    gid, p = by_handle[handle]
    existing = {v['title']: v for v in variants[gid]}
    labels = {t.split(' - ', 1)[1] for t in existing if ' - ' in t}
    old_tiers = sorted(labels, key=lambda l: int(l.replace('+', '').split('-')[0]))
    new_tiers = [tier_label(t['min'], t['max']) for t in tiers]
    style = 'int' if any(t.split(' inch')[0].isdigit() and '.' not in t.split(' inch')[0]
                         for t in existing) else 'dec'
    for ti, tier in enumerate(tiers):
        newlab = new_tiers[ti]
        oldlab = old_tiers[ti] if ti < len(old_tiers) else None
        for si, s in enumerate(sizes):
            price = tier['prices'][si]
            if price is None: continue
            newt = f"{size_label(s, style)} - {newlab}"
            oldt = f"{size_label(s, style)} - {oldlab}" if oldlab else None
            if oldt and oldt in existing:
                op = float(existing[oldt]['price'])
                rows.append([handle, fam, 'UPDATE', oldt, newt, f"{op:.2f}", f"{price:.2f}",
                             f"{(price/op-1)*100:+.0f}%" if op else ''])
            else:
                rows.append([handle, fam, 'CREATE', '', newt, '', f"{price:.2f}", 'new'])

with open('backups/workbook-migration-dryrun-2026-08-21.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['handle','family','action','old_variant','new_variant','old_price','new_price','change'])
    w.writerows(rows)

upd = [r for r in rows if r[2] == 'UPDATE']
cre = [r for r in rows if r[2] == 'CREATE']
ups = [r for r in upd if float(r[6]) > float(r[5])]
dns = [r for r in upd if float(r[6]) < float(r[5])]
same = len(upd) - len(ups) - len(dns)
print(f"TOTAL {len(rows)} cells across {len({r[0] for r in rows})} products")
print(f"  {len(upd)} repriced   ({len(ups)} increase, {len(dns)} decrease, {same} unchanged)")
print(f"  {len(cre)} new variants")
print("\nBY FAMILY:")
for fam, c in collections.Counter(r[1] for r in rows).most_common():
    fr = [r for r in upd if r[1] == fam]
    fu = sum(1 for r in fr if float(r[6]) > float(r[5]))
    print(f"  {fam:<28} {c:>5} cells   {fu:>4} up / {len(fr)-fu:>4} down-or-same")
print("\nLARGEST INCREASES:")
for r in sorted(ups, key=lambda r: float(r[6])/float(r[5]), reverse=True)[:5]:
    print(f"  {r[0]:<26} {r[4]:<24} ${r[5]} -> ${r[6]}  {r[7]}")
print("\nLARGEST DECREASES:")
for r in sorted(dns, key=lambda r: float(r[6])/float(r[5]))[:5]:
    print(f"  {r[0]:<26} {r[4]:<24} ${r[5]} -> ${r[6]}  {r[7]}")
print("\n-> backups/workbook-migration-dryrun-2026-08-21.csv")

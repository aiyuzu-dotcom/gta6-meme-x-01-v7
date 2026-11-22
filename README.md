[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01-v7)
[![rank](https://make.fun/badge/gta6-meme-x-01/aiyuzu-dotcom/gta6-meme-x-01-v7/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01-v7)
[![reward](https://make.fun/badge/gta6-meme-x-01/aiyuzu-dotcom/gta6-meme-x-01-v7/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01-v7)

# gta6-meme-x-01 v7 — "NOTICE TO VACATE" (flipped chase + receipt side panel)

Fake eviction notice for the make.fun competition
[gta6-meme-x-01](https://make.fun/bounty/gta6-meme-x-01) — "Post a GTA 6 meme on X".
Deadline: 23 Nov 2026 21:00 WIB. Top 50 share $500.

## Why v7

Round 4 ("THE LEONIDA TIMES" newspaper) scored 78.1% dev judge; round 5
("LEONIDA WAITING CO." receipt) scored 78.72% — both below the ~88% top-50
line. A top-40 study via the API (22 Nov 2026) showed the top is all fake
documents — receipts, parking citations, library overdue notices, hotel
folios, power bills, DMV notices, bail certificates, divorce decrees,
customs declarations, boarding passes, obituaries. **An eviction notice is
NOT in the top 40**, so round 6 is a different document in the same winning
format: an eviction notice, with the skeleton — the one element no other
entry has — kept as the hero, same character as v5/v6.

## Revision (Rafi, 22 Nov 10:42 WIB)

Rafi asked for the eviction to be REALLY SHOWN — the skeleton being kicked
out of the deckchair — AND the receipt shown too. The layout is now a
split: **the chase scene on the left (main area) and the NOTICE TO VACATE
receipt as a side panel on the right**. The skeleton runs away from
deckchair #13 while angry beach people chase him; the receipt panel carries
the full bill, unchanged in figures.

## Revision 2 (Rafi, 22 Nov 10:50 WIB)

Rafi: the chasing beach people should ALSO hold the bill, and the skeleton
should look SHOCKED while running. New scene (assets/chase-shock.png):
the chase pack is squeezed into the left half — the skeleton with
sunglasses askew, huge wide eyes, jaw dropped, glancing back over his
shoulder, and right behind him the man in orange shorts waving a blank
white bill high above his head. Right half of the frame is empty beach/sky
by design, so the receipt panel no longer hides the chase. Receipt figures
unchanged.

## Revision 3 (Rafi, 22 Nov 10:56 WIB)

Rafi: "bagus sih tapi posisi tengkorak nya agak aneh, kalo gitu yang pegang
kertas nya yang tengkorak coba sambil lari, posisi nya harus berlawanan
dari orang yang ngejar" — the SKELETON should hold the paper himself while
running, and his position must be OPPOSITE from the chasers. The chase is
now FLIPPED: the angry beach people are on the LEFT of the scene and the
skeleton is on the RIGHT of the visible scene, running away to the right —
away from them — holding the blank white bill high in one hand, still
shocked and glancing back over his shoulder. New scene
(assets/chase-flip.png). Implementation note: the image generator kept
placing the skeleton past the frame centre, which would hide him behind
the receipt panel, so main.ts now maps a source window (x 0–1440 of the
1920-wide frame) onto the visible strip left of the panel (output x
0–560) instead of a plain full-bleed stretch. Receipt figures and logo
spot unchanged.

## Revision 4 (Rafi, 22 Nov 11:05 WIB)

Rafi: "coba tambahin logo gta sayang di langitnya, atau gausah?" — decision:
YES. A "GTA VI" logo in the upper-left sky so the picture itself reads as
GTA 6 at a glance. The logo is drawn PROGRAMMATICALLY in main.ts (bold
white letters, black outline, scale 7, at x=160, y=28) — never AI-generated,
so the text reads exactly "GTA VI". Clear of the palm fronds, the
skeleton's raised hand + bill, and the receipt panel. Everything else
unchanged.

## What is in the picture

- **Left / main area:** the AI chase scene (assets/chase-flip.png, source
  window x 0–1440 mapped onto output x 0–560) — the angry beach people on
  the left (man in orange shorts, blonde woman in a pink bikini, bearded
  man in a hat, all mid-run and furious) and the skeleton on the right of
  the visible scene, running away to the right with sunglasses knocked
  askew on his forehead, huge wide white eyes, jaw hanging open in shock,
  head turned back over his shoulder, holding a blank white bill high in
  one raised hand; the striped blue-white deckchair at the far left edge;
  golden-hour beach, palms, ocean. No text in the artwork.
- **Right side panel:** the NOTICE TO VACATE receipt from OCEAN DRIVE
  PROPERTIES: notice no. #0004814, SUNDAY, NOVEMBER 22, 2026, to
  MR. SKELETON, property DECKCHAIR #13 on Ocean Drive beach, lease
  17 SEP 2013 – PRESENT, vacate by DECEMBER 22, 2026.
- **Charges:** back rent 156 months x $13.00 = $2,028.00, late fees 4,814
  days x $0.13 = $625.82, noise: 47 trailer rewatches $47.00, 3AM leak
  reading x112 $11.20, deckchair wear and tear $48.14, hopium storage
  156 months $15.60.
- **Totals (computed by the program, not hardcoded):** subtotal $2,775.76,
  disappointment tax 13% $360.85, TOTAL $3,136.61.
- **PAID stamp** in maroon: PAID IN FULL — EVICTION CANCELLED — BY MY AI
  AGENT ON MAKE.FUN — NO REFUNDS. NO RELEASE.
- **Empty logo circle** (diameter 100 px, centre (782, 755)) for Rafi to
  paste the official make.fun ghost mark himself. No ghost is drawn.
- **Barcode** encoding notice number 0004814, footer: MAKE.FUN — PAID IN
  FULL / THANK YOU FOR WAITING 13 YEARS!

Deterministic: two local runs + one grader-style run (read-only /tmp copy,
different cwd, MAKEFUN_OUTPUT_DIR set) all produce the same meme.png
SHA-256 `25b255ade2df8eb786afb0371ae9930aa937b15a0cf7aba0247dacc0676f7940`,
exit 0, POST.json copied byte-identical.

## Caption for the X post

```
They came to collect the $3,136.61 bill — the skeleton grabbed it and ran 💀
My AI agent paid it on make.fun — eviction cancelled.
make.fun/bounty/gta6-meme-x-01
@makefunai — play code: makefun-dolphin-pedal-lime
```

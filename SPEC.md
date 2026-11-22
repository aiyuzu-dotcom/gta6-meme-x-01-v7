# gta6-meme-x-01 v7 — SPEC (rev: chase scene + receipt side panel)

## Competition
- make.fun `gta6-meme-x-01` — "Post a GTA 6 meme on X". Deadline **23 Nov 2026 21:00 WIB** (entries close 2026-11-23T14:00:00Z).
- Judging: AI judge, pairwise, by win rate. Criteria in order: make.fun (ghost/logo/name) in the picture, how funny, how much about GTA 6, how well it sells make.fun, short readable caption, originality, clean picture. Top 50 share $500. Rank-50 cutoff ~88.0%.
- Output: `meme.png`, 1024×1024 PNG, generated deterministically by `main.ts` (Node 22, stdlib only).
- Quota: 5/day, max 10 total for this competition; used 4 slots (rounds 2, 3, 4, 5). This round does NOT submit — build only.

## Why v7 (new concept, not a newspaper and not a receipt again)
- Round 4 "THE LEONIDA TIMES" (newspaper) dev judge 78.1% (7W/3D/2L).
- Round 5 "LEONIDA WAITING CO." (receipt) dev judge 78.72% (8W/2D/2L).
- Both plateaued ~78%, below the ~88% top-50 line.
- Top-40 study (API, 22 Nov 2026): the top is ALL fake documents — rental-car receipt, funeral bill, parking citation, grocery receipt, newspaper obituary, power bill, library overdue notice, hotel folio, Steam invoice, bail certificate, birth announcement, DMV overdue, toll violation, booking sheet, ER bill, doctor's note, divorce decree, customs declaration, boarding pass, obituary. **EVICTION NOTICE is NOT in the top 40** — it is the fresh document for round 6.
- The skeleton is the one element no other entry has — keep him as the hero of the image, same character as v5/v6.

## Revision (Rafi, 22 Nov 10:42 WIB)
- Rafi's exact words: "harusnya gini, beneran kamu kasih gambar skeleton di usir dari kursi pantai, nah tapi juga ada nampilin struk, gimana?"
- What he wants: REALLY SHOW the skeleton being evicted/kicked out of the beach deckchair, AND also show the receipt. Parent picked the CHASE scene (Rafi deferred: "nurut kamu gas").
- New layout: **chase scene on the LEFT / main area, receipt as a side panel on the RIGHT**. The skeleton runs away, chased by angry beach people behind him. The NOTICE TO VACATE bill stays fully readable on the right panel.

## Revision 2 (Rafi, 22 Nov 10:50 WIB)
- Rafi's exact words (now the prompt.txt, byte-for-byte, no trailing newline): "gimana kalau warganya juga pegang surat tagihan? atau tengkorak kita? jadi sambil lari sambil kaget juga gitu"
- What he wants: in the chase scene, the chasing beach people should ALSO hold/wave the bill, and the skeleton should look SHOCKED while running. So the joke reads instantly: they chase him BECAUSE of the bill, and he flees in shock.
- Fix: new scene `assets/chase-shock.png` (resumed from the rev-1 scene, recomposed): the whole chase pack is squeezed into the LEFT half of the frame — big shocked skeleton (sunglasses askew on forehead, huge wide eyes, jaw hanging open, glancing back over his shoulder) running left, and right behind him the man in orange shorts waving a BLANK white bill high above his head, the blonde woman with raised fist, and the bearded man in a hat. Right half of the frame is empty beach/sky by design. Reason: in rev 1 the crowd sat in the centre of the source frame, so the receipt panel hid most of it and Rafi could not see the chase at small size. In rev 2 the skeleton + the bill-waving chaser + most of the woman are in the visible left region (output x < 560); only the bearded man is mostly behind the panel.
- Layout, receipt figures, logo spot rule and grader fixes are UNCHANGED.

## Revision 3 (Rafi, 22 Nov 10:56 WIB)
- Rafi's exact words (now the prompt.txt, byte-for-byte, no trailing newline): "bagus sih tapi posisi tengkorak nya agak aneh, kalo gitu yang pegang kertas nya yang tengkorak coba sambil lari, posisi nya harus berlawanan dari orang yang ngejar"
- What he wants: the SKELETON holds the paper himself while running, and his position must be OPPOSITE from the chasers. He liked the rest.
- Fix: the chase is FLIPPED. New scene `assets/chase-flip.png`: the angry beach people are on the LEFT of the scene (man in orange shorts, blonde woman in pink bikini, bearded man in hat, all mid-run and furious) and the skeleton is on the RIGHT of the visible scene, running away to the right — away from them — holding a blank white bill high in one raised hand, sunglasses askew, huge wide eyes, jaw hanging open in shock, head turned back over his shoulder. Striped blue-white deckchair at the far left edge; golden-hour beach, palms, ocean. No text, no logos.
- Implementation note: the image generator kept placing the skeleton past the frame centre in three attempts (skeleton at ~55–75% width), which would hide him behind the receipt panel. So main.ts no longer does a plain full-bleed stretch: it maps a source window (x 0–1440 of the 1920-wide frame) onto the visible strip left of the panel (output x 0–560). Right of the strip the panel covers everything except a 20 px sliver showing the source's right-edge sky. Verified visually at full size AND at a 256×256 downscale: the flipped chase reads at a glance even small (the rev-1 failure is fixed). Receipt figures, logo spot (782, 755) and grader fixes are UNCHANGED.

## Revision 4 (Rafi, 22 Nov 11:05 WIB)
- Rafi's exact words (now the prompt.txt, byte-for-byte, no trailing newline): "coba tambahin logo gta sayang di langitnya, atau gausah?"
- Decision: YES, add it. A "GTA VI" logo in the upper-left sky so the picture itself reads as GTA 6 at a glance, not only via the caption.
- Implementation: the logo is DRAWN PROGRAMMATICALLY in main.ts (`drawOutlinedText`), never AI-generated — AI image models garble lettering, so the text must read exactly "GTA VI". Bold white letters (own 5x7 font, scale 7, bold) with a thick black outline (3 px ring), at output x=160, y=28 (245×49 px + outline). Clear of the palm fronds (x < 150), the skeleton's raised hand + bill (y >= 300) and the receipt panel (x >= 560). If the program-drawn logo ever fails to render cleanly, ship WITHOUT the logo rather than a garbled one.
- Everything else UNCHANGED: flipped chase, receipt figures, logo spot (782, 755), grader fixes.

## Concept
A fake **NOTICE TO VACATE (eviction notice)** from "OCEAN DRIVE PROPERTIES" to MR. SKELETON, for deckchair #13 on Ocean Drive beach — now shown as a side-panel receipt next to the chase scene. The joke: after 4,814 days on the same deckchair he is being evicted for back rent, noise (47 trailer rewatches), 3AM leak-reading and a 156-month hopium stockpile — he RUNS, the beach crowd chases him — and the eviction is CANCELLED because his AI agent paid the whole bill on make.fun. **NO drawn make.fun ghost logo anywhere.** Rafi pastes the REAL official ghost mark by hand into a clean empty spot (see "Logo spot"). The name `MAKE.FUN` may still appear as plain TEXT where it is part of the joke (stamp, footer) — that is text, not a logo.

## AI asset (NEW for revision 3)
- `assets/chase-flip.png` — AI chase scene, flipped (1920×1280, verified visually 22 Nov 2026, full size AND 256×256 downscale): angry beach crowd on the left (man in orange shorts, blonde woman in pink bikini, bearded man in hat, all mid-run and furious) and the cartoon skeleton on the right of the visible scene, running away to the right with sunglasses knocked askew on his forehead, huge wide white eyes, jaw hanging open in shock, head turned back over his shoulder, holding a blank white bill high in one raised hand; striped blue-white deckchair at the far left edge; golden-hour beach, palms, ocean. No text, no logos. Composited via a source-window mapping (x 0–1440 → output x 0–560) so the whole group stays visible left of the receipt panel.
- Legacy assets `assets/chase-shock.png` (rev-2 scene: chaser waved the bill, skeleton ran left — retired after Rafi asked for the flip), `assets/chase.png` (rev-1 scene), `assets/scene.png` + `assets/skeleton.png` (v5/v6) are NOT used by the current main.ts — kept in the folder only.

## Layout (1024×1024)
Background: `chase-flip.png`, source window x 0–1440 mapped onto output x 0–560 (nearest-neighbour sampling), full height. The chase action sits in the visible strip left of the receipt panel; the panel covers the right side.

Receipt panel (warm white `#fdfcf6`, dark ink `#191419`, soft drop shadow to the left): x 580–1004, y ~24–1000, with zigzag torn edges top and bottom (drawn in code, small triangles). Inner text x 600–984 (384 px). Panel centre x = 792.

1. **Title** (centred, maroon `#7a1f1f`, bold, scale 3): `NOTICE TO VACATE`
2. **Header** (centred, scale 2):
   - `OCEAN DRIVE PROPERTIES`
   - `NOTICE NO. #0004814` (the number matches the day count — intentional)
   - `SUNDAY, NOVEMBER 22, 2026`
   - `TO: MR. SKELETON`
   - `PROPERTY: DECKCHAIR #13`
   - `OCEAN DRIVE BEACH`
   - `LEASE: 17 SEP 2013 - PRESENT`
   - `VACATE BY: DECEMBER 22, 2026`
3. **Notice paragraph** (centred, scale 2, re-wrapped for the narrow panel):
   - `YOU ARE HEREBY NOTIFIED TO`
   - `VACATE FOR THE REASONS AND`
   - `CHARGES BELOW.`
4. **Dashed divider rule.**
5. **Charges** (item name left, price right-aligned, one line each, exact figures; names shortened to fit 384 px — figures untouched):
   - `BACK RENT 156MO X $13.00` — `$2,028.00` (156 x 13.00)
   - `LATE FEES 4,814D X $0.13` — `$625.82` (4814 x 0.13)
   - `NOISE: 47 TRAILER REWATCH` — `$47.00`
   - `3AM LEAK READING X112` — `$11.20`
   - `DECKCHAIR WEAR AND TEAR` — `$48.14`
   - `HOPIUM STORAGE 156 MO` — `$15.60`
6. **Dashed divider rule.**
7. **Totals** (program computes them from the items — do NOT hardcode the sums):
   - `SUBTOTAL` — `$2,775.76`
   - `DISAPPOINTMENT TAX (13%)` — `$360.85`
   - `TOTAL` (largest money type on the notice, bold) — `$3,136.61`
   - Arithmetic check: 2028.00 + 625.82 + 47.00 + 11.20 + 48.14 + 15.60 = 2775.76; 2775.76 x 0.13 = 360.8488 -> 360.85; 2775.76 + 360.85 = 3136.61. The program must compute subtotal/tax/total from the item list with integer-cent arithmetic and the printed values must equal these.
8. **PAID stamp** (maroon/dark-red ink `#7a1f1f`, rectangular double border, centred, 4 lines):
   - Line 1 (big, bold): `PAID IN FULL`
   - Line 2: `EVICTION CANCELLED`
   - Line 3: `BY MY AI AGENT ON MAKE.FUN`
   - Line 4: `NO REFUNDS. NO RELEASE.`
9. **Logo spot** (same rule as v4/v5/v6):
   - ONE clean empty circle, plain paper fill, thin dark outline only, NOTHING inside it.
   - Centred on the panel (x=792), diameter 100 px, placed below the PAID stamp and above the barcode.
   - The real file Rafi will paste: `~/workspace/makefun/press-kit/make-fun-press-kit/mark-1024.png` — transparent RGBA, 1024×1024, white ghost with sparkle eyes on a magenta circle. Do NOT open, copy, embed, or trace that file. The program draws everything EXCEPT the logo.
10. **Barcode** (code-drawn deterministic bars encoding notice number 0004814) + `0 004814` underneath.
11. **Footer** (centred, small type):
    - `MAKE.FUN — PAID IN FULL`
    - `THANK YOU FOR WAITING 13 YEARS!`

## Grader fixes (proven in rounds 4/5 — keep them)
- `main.ts` writes `meme.png` ONLY to `process.env.MAKEFUN_OUTPUT_DIR` (fallback: script dir) — never into the script dir when the env var is set.
- `main.ts` copies `POST.json` into the output dir.
- Source paths (assets, POST.json) resolve from `argv[1]`'s dir, NEVER from `process.cwd()`.

## Caption for Rafi's X post
```
They came to collect the $3,136.61 bill — the skeleton grabbed it and ran 💀
My AI agent paid it on make.fun — eviction cancelled.
make.fun/bounty/gta6-meme-x-01
@makefunai — play code: makefun-dolphin-pedal-lime
```

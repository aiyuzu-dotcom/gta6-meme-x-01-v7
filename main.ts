// gta6-meme-x-01 v7 (rev 4) — "NOTICE TO VACATE" flipped chase + receipt side panel
// + program-drawn "GTA VI" logo in the upper-left sky (bold white, black outline).
// The chase is FLIPPED vs rev 2: the angry beach people are on the LEFT and
// the SKELETON is on the RIGHT of the visible scene, running away to the
// right — AWAY from the chasers — while HOLDING THE BILL high in one hand,
// still SHOCKED (huge wide eyes, jaw dropped, sunglasses askew, glancing
// back over his shoulder). Skeleton and chasers on opposite sides of the
// scene, moving in opposite directions. The eviction-notice receipt sits
// as a side panel on the right with the full bill: his AI agent paid it
// all on make.fun, eviction cancelled.
// Node 22+, stdlib only. Own PNG decoder + encoder, own 5x7 bitmap font.
// Deterministic: no Date, no Math.random, no network, no external URLs.
// Run: node main.ts  ->  writes meme.png (1024x1024)

import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as path from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const INK: RGB = [25, 20, 25]; // #191419 notice ink
const PAPER: RGB = [253, 252, 246]; // #fdfcf6 warm white notice paper
const STAMP: RGB = [122, 31, 31]; // #7a1f1f maroon stamp ink

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas
const canvas = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = c[0];
  canvas[i + 1] = c[1];
  canvas[i + 2] = c[2];
}

function blendPx(x: number, y: number, c: RGB, alpha: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = Math.round(canvas[i] * (1 - alpha) + c[0] * alpha);
  canvas[i + 1] = Math.round(canvas[i + 1] * (1 - alpha) + c[1] * alpha);
  canvas[i + 2] = Math.round(canvas[i + 2] * (1 - alpha) + c[2] * alpha);
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPx(x, y, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) setPx(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) setPx(x, y, c);
}

// Filled triangle (scanline). Points (ax,ay) apex, base from (bx0,by) to (bx1,by).
function fillTriangle(ax: number, ay: number, bx0: number, bx1: number, by: number, c: RGB): void {
  const top = Math.min(ay, by);
  const bot = Math.max(ay, by);
  for (let y = top; y <= bot; y++) {
    const t = by === ay ? 0 : (y - ay) / (by - ay);
    const half = ((bx1 - bx0) / 2) * t;
    const lx = Math.round(ax - half);
    const rx = Math.round(ax + half);
    for (let x = lx; x <= rx; x++) setPx(x, y, c);
  }
}

function strokeRect(x0: number, y0: number, x1: number, y1: number, c: RGB, w: number): void {
  for (let t = 0; t < w; t++) {
    hline(x0 + t, x1 - t, y0 + t, c);
    hline(x0 + t, x1 - t, y1 - t, c);
    vline(x0 + t, y0 + t, y1 - t, c);
    vline(x1 - t, y0 + t, y1 - t, c);
  }
}

function circleOutline(cx: number, cy: number, r: number, c: RGB, w: number): void {
  for (let a = 0; a < 3600; a++) {
    const rad = (a / 10) * (Math.PI / 180);
    for (let t = 0; t < w; t++) {
      const x = Math.round(cx + (r - t) * Math.cos(rad));
      const y = Math.round(cy + (r - t) * Math.sin(rad));
      setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- PNG codec
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t: Int32Array }).t = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

interface DecodedPng {
  width: number;
  height: number;
  channels: number;
  data: Buffer; // unfiltered, row-major, no filter bytes
}

function decodePng(file: string): DecodedPng {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG: " + file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error("only 8-bit PNG supported: " + file);
      if (data[12] !== 0) throw new Error("only non-interlaced PNG supported: " + file);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0;
  if (channels === 0) throw new Error("unsupported color type " + colorType + ": " + file);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride);
    p += stride;
    const dst = out.subarray(y * stride, (y + 1) * stride);
    const prev = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? dst[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = i >= channels && prev ? prev[i - channels] : 0;
      let v = row[i];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 0xff;
      }
      dst[i] = v;
    }
  }
  return { width, height, channels, data: out };
}

function encodePng(rgb: Uint8Array, w: number, h: number): Buffer {
  const stride = w * 3;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter 0
    Buffer.from(rgb.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, "1" = on, "0" = off.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "#": ["01010", "01010", "11111", "01010", "01010", "11111", "01010"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
};

function textWidth(text: string, scale: number): number {
  // advance per char: 6 units * scale, minus trailing gap
  return text.length * 6 * scale - scale;
}

function drawGlyph(ch: string, x: number, y: number, scale: number, c: RGB, bold: boolean): void {
  const g = FONT[ch];
  if (!g) throw new Error("missing glyph for " + JSON.stringify(ch));
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] !== "1") continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          setPx(x + col * scale + dx, y + r * scale + dy, c);
          if (bold) setPx(x + col * scale + dx + 1, y + r * scale + dy, c);
        }
      }
    }
  }
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB, bold: boolean): void {
  let cx = x;
  for (const ch of text) {
    drawGlyph(ch, cx, y, scale, c, bold);
    cx += 6 * scale;
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: RGB, bold: boolean): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c, bold);
}

function drawTextRight(text: string, rightX: number, y: number, scale: number, c: RGB, bold: boolean): void {
  drawText(text, rightX - textWidth(text, scale), y, scale, c, bold);
}

// Outlined text: outline colour drawn at every offset in a square ring,
// fill colour on top. Used for the GTA VI sky logo so the letters read
// exactly (never AI-generated text) on any background.
function drawOutlinedText(
  text: string,
  x: number,
  y: number,
  scale: number,
  fill: RGB,
  outline: RGB,
  ow: number,
  bold: boolean,
): void {
  for (let dy = -ow; dy <= ow; dy++) {
    for (let dx = -ow; dx <= ow; dx++) {
      if (dx === 0 && dy === 0) continue;
      drawText(text, x + dx, y + dy, scale, outline, bold);
    }
  }
  drawText(text, x, y, scale, fill, bold);
}

// ---------------------------------------------------------------- money
function money(cents: number): string {
  const d = Math.floor(cents / 100);
  const c = cents % 100;
  const ds = d >= 1000 ? Math.floor(d / 1000) + "," + String(d % 1000).padStart(3, "0") : String(d);
  return "$" + ds + "." + String(c).padStart(2, "0");
}

// ---------------------------------------------------------------- load asset
const here = path.dirname(process.argv[1]);
const chase = decodePng(path.join(here, "assets", "chase-flip.png"));

// ---------------------------------------------------------------- background: chase scene, nearest neighbour
// The flipped chase group (chasers left, skeleton holding the bill right)
// spans source x ~85-1400 of the 1920-wide frame. Map that source window
// onto the visible strip left of the receipt panel (output x 0-560) so the
// WHOLE group stays visible — the generator keeps placing the skeleton past
// the frame centre, so a plain full-bleed stretch would hide him behind the
// panel (the rev-1 failure). Right of the strip the panel covers everything
// except a 20 px sliver, which shows the source's right-edge sky.
const SCENE_X0 = 0;
const SCENE_X1 = 1440;
const SCENE_W = 560; // visible strip width; receipt panel starts at x 560
for (let y = 0; y < H; y++) {
  const sy = Math.floor((y * chase.height) / H);
  for (let x = 0; x < W; x++) {
    const sx =
      x < SCENE_W
        ? SCENE_X0 + Math.floor((x * (SCENE_X1 - SCENE_X0)) / SCENE_W)
        : chase.width - 1;
    const si = (sy * chase.width + sx) * chase.channels;
    setPx(x, y, [chase.data[si], chase.data[si + 1], chase.data[si + 2]]);
  }
}

// ---------------------------------------------------------------- GTA VI logo in the sky (rev 4, upper-left)
// Program-drawn (never AI-generated text, so the letters read exactly
// "GTA VI"): bold white letters with a thick black outline, in the clear
// sky band above the chase — clear of the palm fronds (x < 150), the
// skeleton's raised hand + bill (y >= 300) and the receipt panel (x >= 560).
// Purpose: the picture itself reads as GTA 6 at a glance, not only via the caption.
const LOGO_WHITE: RGB = [255, 255, 255];
const LOGO_BLACK: RGB = [10, 10, 10];
drawOutlinedText("GTA VI", 160, 28, 7, LOGO_WHITE, LOGO_BLACK, 3, true);

// ---------------------------------------------------------------- receipt side panel (right)
// Paper: warm white #fdfcf6, dark ink #191419, soft drop shadow to the left.
const PANEL_X0 = 560;
const PANEL_X1 = 1004;
const PANEL_TOP = 24; // zigzag apex
const PANEL_TOP_BASE = 34;
const PANEL_BOT_BASE = 990;
const PANEL_BOT = 1000; // zigzag apex
const INNER_X0 = PANEL_X0 + 20;
const INNER_X1 = PANEL_X1 - 20;
const PCX = 782; // panel centre x

// soft drop shadow to the left (drawn first, paper covers the rest)
for (let y = PANEL_TOP_BASE + 8; y <= PANEL_BOT + 6; y++) {
  for (let x = PANEL_X0 - 8; x <= PANEL_X1; x++) {
    blendPx(x, y, [0, 0, 0], 0.35);
  }
}
fillRect(PANEL_X0, PANEL_TOP_BASE, PANEL_X1, PANEL_BOT_BASE, PAPER);
// zigzag torn edges: teeth 16 px wide
for (let x = PANEL_X0; x < PANEL_X1; x += 16) {
  fillTriangle(x + 8, PANEL_TOP, x, x + 16, PANEL_TOP_BASE, PAPER);
  fillTriangle(x + 8, PANEL_BOT, x, x + 16, PANEL_BOT_BASE, PAPER);
}

// ---------------------------------------------------------------- receipt text
let y = 140; // content starts here; panel top/bottom margins stay balanced

// Title — maroon, bold.
drawTextCentered("NOTICE TO VACATE", PCX, y, 3, STAMP, true);
y += 21 + 14;

const headerLines: string[] = [
  "OCEAN DRIVE PROPERTIES",
  "NOTICE NO. #0004814",
  "SUNDAY, NOVEMBER 22, 2026",
  "TO: MR. SKELETON",
  "PROPERTY: DECKCHAIR #13",
  "OCEAN DRIVE BEACH",
  "LEASE: 17 SEP 2013 - PRESENT",
  "VACATE BY: DECEMBER 22, 2026",
];
for (const line of headerLines) {
  drawTextCentered(line, PCX, y, 2, INK, false);
  y += 17;
}
y += 6;

// Notice paragraph (re-wrapped for the narrow panel).
drawTextCentered("YOU ARE HEREBY NOTIFIED TO", PCX, y, 2, INK, false);
y += 17;
drawTextCentered("VACATE FOR THE REASONS AND", PCX, y, 2, INK, false);
y += 17;
drawTextCentered("CHARGES BELOW.", PCX, y, 2, INK, false);
y += 17;
y += 6;

// Dashed divider rule.
function dashedRule(ry: number): void {
  for (let x = INNER_X0; x <= INNER_X1; x++) {
    if (Math.floor((x - INNER_X0) / 10) % 2 === 0) setPx(x, ry, INK);
  }
}
dashedRule(y);
y += 11;

// Charges (name left, price right). Prices in integer cents.
// Names shortened to fit the 384 px inner width; every figure is exact.
const ITEMS: Array<[string, number]> = [
  ["BACK RENT 156MO X $13.00", 202800],
  ["LATE FEES 4,814D X $0.13", 62582],
  ["NOISE: 47 TRAILER REWATCH", 4700],
  ["3AM LEAK READING X112", 1120],
  ["DECKCHAIR WEAR AND TEAR", 4814],
  ["HOPIUM STORAGE 156 MO", 1560],
];
for (const [name, cents] of ITEMS) {
  drawText(name, INNER_X0, y, 2, INK, false);
  drawTextRight(money(cents), INNER_X1, y, 2, INK, false);
  y += 20;
}
y += 4;
dashedRule(y);
y += 11;

// Totals — computed from the items with integer-cent arithmetic.
let subtotal = 0;
for (const [, cents] of ITEMS) subtotal += cents;
const tax = Math.floor((subtotal * 13 + 50) / 100); // 13%, rounded half-up
const total = subtotal + tax;

drawText("SUBTOTAL", INNER_X0, y, 2, INK, false);
drawTextRight(money(subtotal), INNER_X1, y, 2, INK, false);
y += 20;
drawText("DISAPPOINTMENT TAX (13%)", INNER_X0, y, 2, INK, false);
drawTextRight(money(tax), INNER_X1, y, 2, INK, false);
y += 20;
drawText("TOTAL", INNER_X0, y, 3, INK, true);
drawTextRight(money(total), INNER_X1, y, 3, INK, true);
y += 21 + 14;

// PAID stamp — maroon, double border, centred, 4 lines.
const STAMP_W = 360;
const STAMP_X0 = PCX - Math.floor(STAMP_W / 2);
const STAMP_X1 = PCX + Math.floor(STAMP_W / 2);
const STAMP_Y0 = y;
const STAMP_Y1 = y + 96;
strokeRect(STAMP_X0, STAMP_Y0, STAMP_X1, STAMP_Y1, STAMP, 2);
strokeRect(STAMP_X0 + 6, STAMP_Y0 + 6, STAMP_X1 - 6, STAMP_Y1 - 6, STAMP, 1);
drawTextCentered("PAID IN FULL", PCX, STAMP_Y0 + 7, 4, STAMP, true);
drawTextCentered("EVICTION CANCELLED", PCX, STAMP_Y0 + 40, 2, STAMP, false);
drawTextCentered("BY MY AI AGENT ON MAKE.FUN", PCX, STAMP_Y0 + 58, 2, STAMP, false);
drawTextCentered("NO REFUNDS. NO RELEASE.", PCX, STAMP_Y0 + 76, 2, STAMP, false);
y = STAMP_Y1 + 14;

// Logo spot — ONE clean empty circle, plain paper fill, thin dark outline,
// NOTHING inside. The official ghost mark is pasted here by hand afterwards.
const LOGO_CX = PCX;
const LOGO_CY = y + 50;
const LOGO_D = 100;
const LOGO_R = LOGO_D / 2;
for (let dy = -LOGO_R; dy <= LOGO_R; dy++) {
  for (let dx = -LOGO_R; dx <= LOGO_R; dx++) {
    if (dx * dx + dy * dy <= LOGO_R * LOGO_R) setPx(LOGO_CX + dx, LOGO_CY + dy, PAPER);
  }
}
circleOutline(LOGO_CX, LOGO_CY, LOGO_R, INK, 2);
y = LOGO_CY + LOGO_R + 14;

// Barcode — code-drawn deterministic bars encoding notice number 0004814.
const BARCODE_NUM = "0 004814";
const digits = "0004814";
let barW = 0;
const barWidths: number[] = [];
for (const ch of digits) {
  const d = ch.charCodeAt(0) - 48;
  for (let j = 0; j < 3; j++) {
    const w = 2 + ((d * 3 + j * 7) % 3); // 2..4 px
    barWidths.push(w);
    barW += w + 2; // bar + 2 px gap
  }
}
let bx = PCX - Math.floor(barW / 2);
const BAR_Y0 = y;
const BAR_Y1 = y + 26;
for (const w of barWidths) {
  fillRect(bx, BAR_Y0, bx + w - 1, BAR_Y1, INK);
  bx += w + 2;
}
y = BAR_Y1 + 5;
drawTextCentered(BARCODE_NUM, PCX, y, 2, INK, false);
y += 14 + 12;

// Footer — centred, small type.
drawTextCentered("MAKE.FUN — PAID IN FULL", PCX, y, 2, INK, false);
y += 17;
drawTextCentered("THANK YOU FOR WAITING 13 YEARS!", PCX, y, 2, INK, false);
y += 14;

// ---------------------------------------------------------------- write out
const outDir = process.env.MAKEFUN_OUTPUT_DIR || here;
fs.writeFileSync(path.join(outDir, "meme.png"), encodePng(canvas, W, H));
fs.copyFileSync(path.join(here, "POST.json"), path.join(outDir, "POST.json"));
console.log("POST.json copied to output dir");

// Sanity: totals must equal the spec arithmetic.
if (subtotal !== 277576 || tax !== 36085 || total !== 313661) {
  throw new Error("totals mismatch: " + subtotal + " / " + tax + " / " + total);
}
if (y > PANEL_BOT_BASE - 4) {
  throw new Error("footer overflow: last y=" + y + " panel bottom=" + PANEL_BOT_BASE);
}
console.log("meme.png written 1024x1024");
console.log("subtotal " + money(subtotal) + " tax " + money(tax) + " total " + money(total));
console.log("logo spot center (" + LOGO_CX + ", " + LOGO_CY + ") diameter " + LOGO_D + " px");
console.log("footer last y=" + y);

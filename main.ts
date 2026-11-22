// NOTICE TO VACATE — GTA VI meme generator (make.fun gta6-meme-x-01, round 7)
// Written fresh from the design spec. Node 22, stdlib only (fs / path / zlib /
// crypto), no network access and no outside resources. Reads
// assets/chase-flip.png, draws the receipt panel + programmatic "GTA VI" logo,
// writes a deterministic 1024x1024 meme.png into
// process.env.MAKEFUN_OUTPUT_DIR (fallback: this script's dir) and copies
// POST.json there too. All source paths resolve from argv[1]'s dir.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// ---------------------------------------------------------------- constants
const W = 1024;
const H = 1024;
const PAPER = [0xfd, 0xfc, 0xf6]; // warm white receipt paper
const INK = [0x19, 0x14, 0x19];   // dark ink
const MAROON = [0x7a, 0x1f, 0x1f]; // stamp / title red
const BLACK = [0x00, 0x00, 0x00];
const WHITE = [0xff, 0xff, 0xff];

const PANEL_X0 = 560;
const PANEL_X1 = 1004;
const PANEL_Y0 = 24;
const PANEL_Y1 = 1000;
const TEXT_X0 = 580;   // inner text left edge
const TEXT_X1 = 984;   // inner text right edge
const CX = 782;        // panel centre x

// ------------------------------------------------------------------- canvas
const canvas = Buffer.alloc(W * H * 4); // RGBA, opaque

function setPx(x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  canvas[i] = c[0]; canvas[i + 1] = c[1]; canvas[i + 2] = c[2]; canvas[i + 3] = 255;
}

// Blend a colour over the existing pixel (used for the soft drop shadow).
function blendPx(x, y, c, alpha) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  canvas[i] = Math.round(canvas[i] * (1 - alpha) + c[0] * alpha);
  canvas[i + 1] = Math.round(canvas[i + 1] * (1 - alpha) + c[1] * alpha);
  canvas[i + 2] = Math.round(canvas[i + 2] * (1 - alpha) + c[2] * alpha);
  canvas[i + 3] = 255;
}

function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      canvas[i] = c[0]; canvas[i + 1] = c[1]; canvas[i + 2] = c[2]; canvas[i + 3] = 255;
      i += 4;
    }
  }
}

function fillTriangle(ax, ay, bx0, bx1, by, c) {
  // Filled triangle (scanline). Points (ax,ay) apex, base from (bx0,by) to (bx1,by).
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

function dashedRule(ry) {
  for (let x = TEXT_X0; x <= TEXT_X1; x++) {
    if (Math.floor((x - TEXT_X0) / 10) % 2 === 0) setPx(x, ry, INK);
  }
}

function circleOutline(cx, cy, r, c, w) {
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
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Minimal decoder: non-interlaced PNG, bit depth 8 or 16, colour types
// 0 (grey), 2 (RGB), 3 (palette), 4 (grey+alpha), 6 (RGBA).
function decodePng(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('not a PNG file');
  }
  let off = 8;
  let ihdr = null, plte = null, trns = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') ihdr = data;
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('PNG without IHDR');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (interlace !== 0) throw new Error('interlaced PNG not supported');
  if (bitDepth !== 8 && bitDepth !== 16) throw new Error('unsupported bit depth ' + bitDepth);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (channels === undefined) throw new Error('unsupported colour type ' + colorType);
  const bytesPerSample = bitDepth === 16 ? 2 : 1;
  const bpp = channels * bytesPerSample; // bytes per pixel, for filtering
  const rowBytes = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < height * (1 + rowBytes)) throw new Error('truncated IDAT data');
  const rgba = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(rowBytes);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (1 + rowBytes)];
    const row = Buffer.from(raw.subarray(y * (1 + rowBytes) + 1, (y + 1) * (1 + rowBytes)));
    for (let i = 0; i < rowBytes; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) row[i] = (row[i] + a) & 0xff;
      else if (filter === 2) row[i] = (row[i] + b) & 0xff;
      else if (filter === 3) row[i] = (row[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) row[i] = (row[i] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error('unknown PNG filter ' + filter);
    }
    for (let x = 0; x < width; x++) {
      const s = x * bpp;
      const o = (y * width + x) * 4;
      const sample = (k) => (bytesPerSample === 2 ? row[s + k * 2] : row[s + k]);
      if (colorType === 6) {
        rgba[o] = sample(0); rgba[o + 1] = sample(1); rgba[o + 2] = sample(2);
        rgba[o + 3] = sample(3);
      } else if (colorType === 2) {
        rgba[o] = sample(0); rgba[o + 1] = sample(1); rgba[o + 2] = sample(2); rgba[o + 3] = 255;
      } else if (colorType === 0) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = sample(0); rgba[o + 3] = 255;
      } else if (colorType === 4) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = sample(0); rgba[o + 3] = sample(1);
      } else if (colorType === 3) {
        const idx = sample(0);
        rgba[o] = plte[idx * 3]; rgba[o + 1] = plte[idx * 3 + 1]; rgba[o + 2] = plte[idx * 3 + 2];
        rgba[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
    prev = row;
  }
  return { width, height, rgba };
}

function encodePng(rgba, width, height) {
  // RGB output (colour type 2): strip the always-opaque alpha channel.
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * (stride + 1) + 1 + x * 3;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- 5x7 font
// Own design: each glyph is 7 rows of 5 bits, MSB = leftmost column.
// Covers A-Z, 0-9, space and . , : $ % ( ) # - / !
const FONT = {
  'A': [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  'B': [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  'C': [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  'D': [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  'E': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  'F': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  'G': [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  'H': [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  'I': [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  'M': [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'P': [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  'Q': [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  'R': [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  'S': [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  'T': [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  'X': [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ',': [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  ':': [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x0a, 0x1f, 0x0a],
  '-': [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  '—': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '/': [0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x10],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
};

function glyphOf(ch) {
  return FONT[ch] || FONT[' '];
}

// Width of a string at a given scale. Default advance is 6*scale (5 px glyph
// + 1 px gap); callers may pass a tighter advance for dense lines.
function textWidth(str, scale, advance) {
  const adv = advance === undefined ? 6 * scale : advance;
  if (str.length === 0) return 0;
  return (str.length - 1) * adv + 5 * scale;
}

function drawText(str, x, y, scale, color, opts) {
  const o = opts || {};
  const adv = o.advance === undefined ? 6 * scale : o.advance;
  let cx = x;
  for (const ch of str) {
    const g = glyphOf(ch);
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let c = 0; c < 5; c++) {
        if (row & (1 << (4 - c))) {
          fillRect(cx + c * scale, y + r * scale, scale, scale, color);
          if (o.bold) fillRect(cx + c * scale + 1, y + r * scale, scale, scale, color);
        }
      }
    }
    cx += adv;
  }
}

function drawCentered(str, cx, y, scale, color, opts) {
  const o = opts || {};
  const w = textWidth(str, scale, o.advance);
  drawText(str, Math.round(cx - w / 2), y, scale, color, o);
}

// Outlined text: outline colour drawn at every offset in a square ring,
// fill colour on top.
function drawOutlinedText(str, x, y, scale, fill, outline, ow, bold) {
  for (let dy = -ow; dy <= ow; dy++) {
    for (let dx = -ow; dx <= ow; dx++) {
      if (dx === 0 && dy === 0) continue;
      drawText(str, x + dx, y + dy, scale, outline, { bold });
    }
  }
  drawText(str, x, y, scale, fill, { bold });
}

// ------------------------------------------------------------------- money
// Integer-cent arithmetic only — totals are computed, never hardcoded.
const ITEMS = [
  ['BACK RENT 156MO X $13.00', 202800], // 156 x $13.00
  ['LATE FEES 4,814D X $0.13', 62582],  // 4814 x $0.13
  ['NOISE: 47 TRAILER REWATCH', 4700],
  ['3AM LEAK READING X112', 1120],
  ['DECKCHAIR WEAR AND TEAR', 4814],
  ['HOPIUM STORAGE 156 MO', 1560],
];
const SUBTOTAL_CENTS = ITEMS.reduce((a, it) => a + it[1], 0); // 277576
const TAX_CENTS = Math.floor((SUBTOTAL_CENTS * 13 + 50) / 100); // 13% -> 36085
const TOTAL_CENTS = SUBTOTAL_CENTS + TAX_CENTS; // 313661

function formatMoney(cents) {
  const dollars = Math.floor(cents / 100);
  const rem = cents % 100;
  const grouped = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '$' + grouped + '.' + String(rem).padStart(2, '0');
}

// ----------------------------------------------------------------- barcode
// Deterministic bars encoding the notice number 0004814.
function drawBarcode(cx, y0) {
  const digits = '0004814';
  let barW = 0;
  const barWidths = [];
  for (const ch of digits) {
    const d = ch.charCodeAt(0) - 48;
    for (let j = 0; j < 3; j++) {
      const w = 2 + ((d * 3 + j * 7) % 3); // 2..4 px
      barWidths.push(w);
      barW += w + 2; // bar + 2 px gap
    }
  }
  let bx = cx - Math.floor(barW / 2);
  for (const w of barWidths) {
    fillRect(bx, y0, w, 27, INK);
    bx += w + 2;
  }
}

// -------------------------------------------------------------------- main
function main() {
  const scriptDir = path.dirname(path.resolve(process.argv[1]));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || scriptDir;
  fs.mkdirSync(outDir, { recursive: true });

  // --- scene: source window x 0-1440 -> output x 0-560, full height ---
  const img = decodePng(fs.readFileSync(path.join(scriptDir, 'assets', 'chase-flip.png')));
  if (img.width < 1440 || img.height < 1280) throw new Error('unexpected scene size');
  const srcX = new Int32Array(W);
  for (let x = 0; x < W; x++) srcX[x] = x < 560 ? Math.floor(x * 1440 / 560) : img.width - 1;
  const srcY = new Int32Array(H);
  for (let y = 0; y < H; y++) srcY[y] = Math.min(img.height - 1, Math.floor(y * 1280 / 1024));
  for (let y = 0; y < H; y++) {
    const sy = srcY[y];
    let di = y * W * 4;
    for (let x = 0; x < W; x++) {
      const si = (sy * img.width + srcX[x]) * 4;
      canvas[di] = img.rgba[si];
      canvas[di + 1] = img.rgba[si + 1];
      canvas[di + 2] = img.rgba[si + 2];
      canvas[di + 3] = 255;
      di += 4;
    }
  }

  // --- "GTA VI" logo, upper-left sky: white, bold, 3 px black outline ---
  // scale 7 -> 245x49 px at x=160, y=28. Clear of fronds (x<150), the raised
  // hand/bill (y>=300) and the receipt panel (x>=560).
  drawOutlinedText('GTA VI', 160, 28, 7, WHITE, [10, 10, 10], 3, true);

  // --- receipt panel: soft shadow to the left, torn zigzag top/bottom ---
  // Soft drop shadow to the left (drawn first, paper covers the rest).
  for (let y = PANEL_Y0 + 18; y <= PANEL_Y1 + 6; y++) {
    for (let x = PANEL_X0 - 8; x <= PANEL_X1; x++) blendPx(x, y, BLACK, 0.35);
  }
  fillRect(PANEL_X0, PANEL_Y0 + 10, PANEL_X1 - PANEL_X0 + 1, PANEL_Y1 - PANEL_Y0 - 19, PAPER);
  // Zigzag torn edges: teeth 16 px wide.
  for (let x = PANEL_X0; x < PANEL_X1; x += 16) {
    fillTriangle(x + 8, PANEL_Y0, x, x + 16, PANEL_Y0 + 10, PAPER);
    fillTriangle(x + 8, PANEL_Y1, x, x + 16, PANEL_Y1 - 10, PAPER);
  }

  // --- receipt text: sequential y cursor, content starts at y=140 ---
  let y = 140;

  // --- 1. title (maroon, bold) ---
  drawCentered('NOTICE TO VACATE', CX, y, 3, MAROON, { bold: true });
  y += 21 + 14;

  // --- 2. header ---
  const header = [
    'OCEAN DRIVE PROPERTIES',
    'NOTICE NO. #0004814',
    'SUNDAY, NOVEMBER 22, 2026',
    'TO: MR. SKELETON',
    'PROPERTY: DECKCHAIR #13',
    'OCEAN DRIVE BEACH',
    'LEASE: 17 SEP 2013 - PRESENT',
    'VACATE BY: DECEMBER 22, 2026',
  ];
  for (const line of header) {
    drawCentered(line, CX, y, 2, INK);
    y += 17;
  }
  y += 6;

  // --- 3. notice paragraph ---
  const para = [
    'YOU ARE HEREBY NOTIFIED TO',
    'VACATE FOR THE REASONS AND',
    'CHARGES BELOW.',
  ];
  drawCentered('YOU ARE HEREBY NOTIFIED TO', CX, y, 2, INK);
  y += 17;
  drawCentered('VACATE FOR THE REASONS AND', CX, y, 2, INK);
  y += 17;
  drawCentered('CHARGES BELOW.', CX, y, 2, INK);
  y += 17;
  y += 6;

  // --- 4. divider ---
  dashedRule(y);
  y += 11;

  // --- 5. charges: name left, price right (default 12 px advance) ---
  for (const it of ITEMS) {
    drawText(it[0], TEXT_X0, y, 2, INK);
    const price = formatMoney(it[1]);
    drawText(price, TEXT_X1 - textWidth(price, 2), y, 2, INK);
    y += 20;
  }
  y += 4;

  // --- 6. divider ---
  dashedRule(y);
  y += 11;

  // --- 7. totals (computed above, never hardcoded) ---
  drawText('SUBTOTAL', TEXT_X0, y, 2, INK);
  drawText(formatMoney(SUBTOTAL_CENTS), TEXT_X1 - textWidth(formatMoney(SUBTOTAL_CENTS), 2), y, 2, INK);
  y += 20;
  drawText('DISAPPOINTMENT TAX (13%)', TEXT_X0, y, 2, INK);
  drawText(formatMoney(TAX_CENTS), TEXT_X1 - textWidth(formatMoney(TAX_CENTS), 2), y, 2, INK);
  y += 20;
  drawText('TOTAL', TEXT_X0, y, 3, INK, { bold: true });
  drawText(formatMoney(TOTAL_CENTS), TEXT_X1 - textWidth(formatMoney(TOTAL_CENTS), 3), y, 3, INK, { bold: true });
  y += 21 + 14;

  // --- 8. PAID stamp: double border, maroon ink ---
  const STAMP_W = 360;
  const stampX0 = CX - Math.floor(STAMP_W / 2);
  const stampX1 = CX + Math.floor(STAMP_W / 2);
  const stampY0 = y;
  const stampY1 = y + 96;
  fillRect(stampX0, stampY0, stampX1 - stampX0 + 1, 2, MAROON);
  fillRect(stampX0, stampY1 - 1, stampX1 - stampX0 + 1, 2, MAROON);
  fillRect(stampX0, stampY0, 2, stampY1 - stampY0 + 1, MAROON);
  fillRect(stampX1 - 1, stampY0, 2, stampY1 - stampY0 + 1, MAROON);
  fillRect(stampX0 + 6, stampY0 + 6, stampX1 - stampX0 - 11, 1, MAROON);
  fillRect(stampX0 + 6, stampY1 - 6, stampX1 - stampX0 - 11, 1, MAROON);
  fillRect(stampX0 + 6, stampY0 + 6, 1, stampY1 - stampY0 - 11, MAROON);
  fillRect(stampX1 - 6, stampY0 + 6, 1, stampY1 - stampY0 - 11, MAROON);
  drawCentered('PAID IN FULL', CX, stampY0 + 7, 4, MAROON, { bold: true });
  drawCentered('EVICTION CANCELLED', CX, stampY0 + 40, 2, MAROON);
  drawCentered('BY MY AI AGENT ON MAKE.FUN', CX, stampY0 + 58, 2, MAROON);
  drawCentered('NO REFUNDS. NO RELEASE.', CX, stampY0 + 76, 2, MAROON);
  y = stampY1 + 14;

  // --- 9. logo spot: ONE clean empty circle, paper fill, thin dark outline,
  // nothing inside. The real ghost logo is pasted by hand later. ---
  const logoCy = y + 50;
  const logoR = 50;
  for (let dy = -logoR; dy <= logoR; dy++) {
    for (let dx = -logoR; dx <= logoR; dx++) {
      if (dx * dx + dy * dy <= logoR * logoR) setPx(CX + dx, logoCy + dy, PAPER);
    }
  }
  circleOutline(CX, logoCy, logoR, INK, 2);
  y = logoCy + logoR + 14;

  // --- 10. barcode + number ---
  drawBarcode(CX, y);
  y += 26 + 5;
  drawCentered('0 004814', CX, y, 2, INK);
  y += 14 + 12;

  // --- 11. footer ---
  drawCentered('MAKE.FUN — PAID IN FULL', CX, y, 2, INK);
  y += 17;
  drawCentered('THANK YOU FOR WAITING 13 YEARS!', CX, y, 2, INK);
  y += 14;

  // --- write output ---
  const png = encodePng(canvas, W, H);
  const outPng = path.join(outDir, 'meme.png');
  fs.writeFileSync(outPng, png);
  const postSrc = path.join(scriptDir, 'POST.json');
  const postDst = path.join(outDir, 'POST.json');
  if (path.resolve(postSrc) !== path.resolve(postDst)) fs.copyFileSync(postSrc, postDst);
  console.log('wrote ' + outPng + ' sha256=' +
    crypto.createHash('sha256').update(png).digest('hex'));
  console.log('subtotal=' + formatMoney(SUBTOTAL_CENTS) +
    ' tax=' + formatMoney(TAX_CENTS) + ' total=' + formatMoney(TOTAL_CENTS));
}

main();

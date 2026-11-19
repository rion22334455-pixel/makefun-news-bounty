import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const WIDTH = 1024;
const HEIGHT = 1024;
const PIXELS = Buffer.alloc(WIDTH * HEIGHT * 4);

const C = {
  ink: '#071522',
  panel: '#102538',
  panel2: '#142D41',
  line: '#29445A',
  white: '#F3F4EC',
  muted: '#A8B9C4',
  faint: '#60798A',
  cyan: '#56D4D0',
  orange: '#FFB35C',
  lime: '#B9E477',
  pink: '#FF8290',
  blue: '#83B9FF',
  globe: '#123E58',
  land: '#61B9A5',
};

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

function pixel(x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const offset = (y * WIDTH + x) * 4;
  PIXELS[offset] = color[0];
  PIXELS[offset + 1] = color[1];
  PIXELS[offset + 2] = color[2];
  PIXELS[offset + 3] = color[3];
}

function rect(x, y, width, height, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.ceil(x + width));
  const y1 = Math.min(HEIGHT, Math.ceil(y + height));
  const rgba = rgb(color);
  for (let py = y0; py < y1; py++) {
    let offset = (py * WIDTH + x0) * 4;
    for (let px = x0; px < x1; px++, offset += 4) {
      PIXELS[offset] = rgba[0];
      PIXELS[offset + 1] = rgba[1];
      PIXELS[offset + 2] = rgba[2];
      PIXELS[offset + 3] = 255;
    }
  }
}

function roundRect(x, y, width, height, radius, color) {
  const rgba = rgb(color);
  for (let py = Math.max(0, y); py < Math.min(HEIGHT, y + height); py++) {
    const dy = py < y + radius ? y + radius - py
      : py >= y + height - radius ? py - (y + height - radius - 1) : 0;
    const inset = dy > 0 ? Math.max(0, radius - Math.sqrt(radius * radius - dy * dy)) : 0;
    const x0 = Math.max(0, Math.ceil(x + inset));
    const x1 = Math.min(WIDTH, Math.floor(x + width - inset));
    let offset = (py * WIDTH + x0) * 4;
    for (let px = x0; px < x1; px++, offset += 4) {
      PIXELS[offset] = rgba[0];
      PIXELS[offset + 1] = rgba[1];
      PIXELS[offset + 2] = rgba[2];
      PIXELS[offset + 3] = 255;
    }
  }
}

function line(x0, y0, x1, y1, color, thickness = 2) {
  let dx = Math.abs(Math.round(x1) - Math.round(x0));
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(Math.round(y1) - Math.round(y0));
  let sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  while (true) {
    rect(x0 - Math.floor(thickness / 2), y0 - Math.floor(thickness / 2), thickness, thickness, color);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function ellipse(cx, cy, rx, ry, color) {
  const rgba = rgb(color);
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(HEIGHT - 1, Math.ceil(cy + ry)); y++) {
    const norm = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - norm * norm));
    const x0 = Math.max(0, Math.floor(cx - half));
    const x1 = Math.min(WIDTH - 1, Math.ceil(cx + half));
    let offset = (y * WIDTH + x0) * 4;
    for (let x = x0; x <= x1; x++, offset += 4) {
      PIXELS[offset] = rgba[0];
      PIXELS[offset + 1] = rgba[1];
      PIXELS[offset + 2] = rgba[2];
      PIXELS[offset + 3] = 255;
    }
  }
}

function circleOutline(cx, cy, radius, color, thickness = 2) {
  let previous = null;
  for (let degree = 0; degree <= 360; degree += 3) {
    const angle = degree * Math.PI / 180;
    const point = [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    if (previous) line(previous[0], previous[1], point[0], point[1], color, thickness);
    previous = point;
  }
}

const FONT = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
  0: ['01110','10001','10011','10101','11001','10001','01110'],
  1: ['00100','01100','00100','00100','00100','00100','01110'],
  2: ['01110','10001','00001','00010','00100','01000','11111'],
  3: ['11110','00001','00001','01110','00001','00001','11110'],
  4: ['00010','00110','01010','10010','11111','00010','00010'],
  5: ['11111','10000','10000','11110','00001','00001','11110'],
  6: ['01110','10000','10000','11110','10001','10001','01110'],
  7: ['11111','00001','00010','00100','01000','01000','01000'],
  8: ['01110','10001','10001','01110','10001','10001','01110'],
  9: ['01110','10001','10001','01111','00001','00001','01110'],
  '.': ['00000','00000','00000','00000','00000','00110','00110'],
  ',': ['00000','00000','00000','00000','00110','00110','00100'],
  ':': ['00000','00110','00110','00000','00110','00110','00000'],
  '/': ['00001','00010','00010','00100','01000','01000','10000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '&': ['01100','10010','10100','01000','10101','10010','01101'],
  '%': ['11001','11010','00100','01000','10110','00110','00000'],
  "'": ['00100','00100','00010','00000','00000','00000','00000'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
};

function text(value, x, y, scale, color) {
  let cursor = x;
  const rgba = rgb(color);
  for (const rawChar of value.toUpperCase()) {
    const char = FONT[rawChar] ? rawChar : ' ';
    const glyph = FONT[char];
    if (char !== ' ') {
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] === '1') {
            const x0 = Math.round(cursor + col * scale);
            const y0 = Math.round(y + row * scale);
            for (let yy = 0; yy < scale; yy++) {
              for (let xx = 0; xx < scale; xx++) {
                pixel(x0 + xx, y0 + yy, rgba);
              }
            }
          }
        }
      }
    }
    cursor += (char === ' ' ? 4 : 6) * scale;
  }
}

function globe(cx, cy) {
  ellipse(cx, cy, 97, 97, C.globe);
  ellipse(cx - 29, cy - 25, 30, 20, C.land);
  ellipse(cx - 9, cy + 14, 17, 34, C.land);
  ellipse(cx + 37, cy - 43, 26, 17, C.land);
  ellipse(cx + 48, cy - 6, 18, 30, C.land);
  ellipse(cx + 20, cy + 50, 31, 16, C.land);
  circleOutline(cx, cy, 98, C.cyan, 3);
  ellipse(cx, cy, 42, 97, '#27738A');
  line(cx - 84, cy - 31, cx + 84, cy - 31, '#27738A', 2);
  line(cx - 96, cy, cx + 96, cy, '#27738A', 2);
  line(cx - 84, cy + 31, cx + 84, cy + 31, '#27738A', 2);
  circleOutline(cx, cy, 98, C.cyan, 3);
  ellipse(cx - 29, cy - 25, 30, 20, C.land);
  ellipse(cx - 9, cy + 14, 17, 34, C.land);
  ellipse(cx + 37, cy - 43, 26, 17, C.land);
  ellipse(cx + 48, cy - 6, 18, 30, C.land);
  ellipse(cx + 20, cy + 50, 31, 16, C.land);
}

function climateIcon(cx, cy, color) {
  circleOutline(cx, cy - 4, 17, color, 3);
  line(cx, cy - 31, cx, cy - 24, color, 3);
  line(cx - 29, cy - 4, cx - 22, cy - 4, color, 3);
  line(cx + 22, cy - 4, cx + 29, cy - 4, color, 3);
  for (let i = 0; i < 2; i++) {
    const yy = cy + 22 + i * 10;
    for (let x = cx - 29; x < cx + 29; x += 2) {
      const y = yy + Math.sin((x - cx) / 8) * 3;
      pixel(x, y, color);
      pixel(x + 1, y, color);
    }
  }
}

function chipIcon(cx, cy, color) {
  roundRect(cx - 19, cy - 19, 38, 38, 5, color);
  roundRect(cx - 11, cy - 11, 22, 22, 3, C.panel);
  for (let i = -1; i <= 1; i++) {
    line(cx - 27, cy + i * 10, cx - 20, cy + i * 10, color, 3);
    line(cx + 20, cy + i * 10, cx + 27, cy + i * 10, color, 3);
    line(cx + i * 10, cy - 27, cx + i * 10, cy - 20, color, 3);
    line(cx + i * 10, cy + 20, cx + i * 10, cy + 27, color, 3);
  }
}

function economyIcon(cx, cy, color) {
  line(cx - 26, cy + 23, cx - 26, cy - 20, color, 3);
  line(cx - 26, cy + 23, cx + 27, cy + 23, color, 3);
  rect(cx - 17, cy + 5, 9, 15, color);
  rect(cx - 3, cy - 4, 9, 24, color);
  rect(cx + 11, cy - 15, 9, 35, color);
  line(cx - 17, cy - 9, cx - 2, cy - 17, C.white, 2);
  line(cx - 2, cy - 17, cx + 10, cy - 12, C.white, 2);
  line(cx + 10, cy - 12, cx + 24, cy - 29, C.white, 2);
  line(cx + 18, cy - 29, cx + 24, cy - 29, C.white, 2);
  line(cx + 24, cy - 29, cx + 24, cy - 23, C.white, 2);
}

function justiceIcon(cx, cy, color) {
  line(cx, cy - 27, cx, cy + 25, color, 3);
  line(cx - 22, cy - 15, cx + 22, cy - 15, color, 3);
  line(cx - 20, cy - 15, cx - 28, cy + 2, color, 2);
  line(cx - 20, cy - 15, cx - 12, cy + 2, color, 2);
  line(cx + 20, cy - 15, cx + 12, cy + 2, color, 2);
  line(cx + 20, cy - 15, cx + 28, cy + 2, color, 2);
  line(cx - 30, cy + 3, cx - 10, cy + 3, color, 3);
  line(cx + 10, cy + 3, cx + 30, cy + 3, color, 3);
  line(cx - 17, cy + 12, cx + 17, cy + 12, color, 3);
  line(cx, cy + 12, cx, cy + 24, color, 3);
  line(cx - 22, cy + 25, cx + 22, cy + 25, color, 3);
}

function card(x, y, category, lines, source, accent, icon) {
  const width = 438;
  const height = 184;
  roundRect(x, y, width, height, 16, C.panel);
  rect(x + 2, y + 22, 4, height - 44, accent);
  text(category, x + 24, y + 21, 2, accent);
  const iconX = x + width - 49;
  const iconY = y + 38;
  if (icon === 'climate') climateIcon(iconX, iconY, accent);
  if (icon === 'tech') chipIcon(iconX, iconY, accent);
  if (icon === 'economy') economyIcon(iconX, iconY, accent);
  if (icon === 'justice') justiceIcon(iconX, iconY, accent);
  lines.forEach((value, index) => text(value, x + 24, y + 57 + index * 25, 3, C.white));
  line(x + 24, y + 147, x + width - 24, y + 147, C.line, 1);
  text(source, x + 24, y + 158, 2, C.muted);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function encodePng() {
  const scanlines = Buffer.alloc(HEIGHT * (WIDTH * 4 + 1));
  const stride = WIDTH * 4;
  for (let y = 0; y < HEIGHT; y++) {
    const row = y * (stride + 1);
    scanlines[row] = 0;
    PIXELS.copy(scanlines, row + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawInfographic() {
  rect(0, 0, WIDTH, HEIGHT, C.ink);
  for (let x = 56; x <= 968; x += 32) rect(x, 35, 1, 885, '#0B1C2B');
  for (let y = 35; y <= 920; y += 32) rect(56, y, 912, 1, '#0B1C2B');

  text('WORLD DESK  /  DAILY BRIEF', 62, 42, 2, C.cyan);
  text('18 NOVEMBER 2026', 60, 78, 5, C.white);
  text('FIVE STORIES SHAPING THE DAY', 63, 128, 2, C.muted);
  rect(60, 158, 904, 3, C.line);
  rect(60, 158, 156, 3, C.cyan);

  roundRect(60, 184, 904, 244, 18, C.panel2);
  text('LEAD STORY  /  GEOPOLITICS', 90, 211, 2, C.orange);
  text('TRUMP LANDS IN CHINA', 90, 252, 4, C.white);
  text('XI, PUTIN BLAST WEST', 90, 293, 4, C.white);
  text('PROTECTIONISM & SANCTIONS', 90, 334, 4, C.white);
  text('REPORTED BY REUTERS', 92, 389, 2, C.muted);
  globe(827, 305);

  card(60, 454, 'CLIMATE  /  GLOBAL', [
    'ISLAND NATIONS SEEK',
    'STRONGER ACTION AT',
    'UN CLIMATE TALKS',
  ], 'AP  /  CLIMATE NEGOTIATIONS', C.cyan, 'climate');
  card(526, 454, 'TECHNOLOGY  /  INTERNET', [
    'AI REVEALS A CRITICAL',
    'FLAW IN JAVA',
  ], 'BBC  /  SECURITY FINDING', C.lime, 'tech');
  card(60, 656, 'ECONOMY  /  INDIA', [
    'INDIA GROWTH SEEN',
    'AT 7.6% IN A POLL',
  ], 'REUTERS  /  JUL-SEP FORECAST', C.orange, 'economy');
  card(526, 656, 'JUSTICE  /  MYANMAR', [
    'UN COURT SET TO RULE',
    'ON MYANMAR ROHINGYA',
    'GENOCIDE CASE',
  ], 'AP  /  COURT PROCEEDINGS', C.pink, 'justice');

  line(60, 872, 964, 872, C.line, 2);
  text('WORLD NEWS, ONE DAY', 62, 892, 3, C.white);
  text('HEADLINES REPORTED 18 NOV  /  SOURCES: AP, BBC, REUTERS', 62, 930, 2, C.muted);
  text('EDITORIAL SUMMARY  -  NOT A LIVE NEWS FEED', 62, 960, 2, C.faint);
}

drawInfographic();
const output = encodePng();
if (output.length > 1024 * 1024) {
  throw new Error(`Generated PNG is too large: ${output.length} bytes`);
}

const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'entry.png'), output);

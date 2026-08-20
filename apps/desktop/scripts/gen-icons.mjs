// 生成 Tauri 桌面端所需的 PNG / ICO 图标（纯 JS，无依赖）。
// 注意：ICO 必须使用经典 DIB(BMP) 格式 —— 旧版 RC.EXE（Windows SDK 10.0.19041）
// 不支持 PNG 压缩的 ICO 条目（会报 RC2176 "old DIB"）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'src-tauri', 'icons');
mkdirSync(outDir, { recursive: true });

function inRoundedRect(u, v, r) {
  const dx = Math.max(r - u, 0, u - (1 - r));
  const dy = Math.max(r - v, 0, v - (1 - r));
  return dx * dx + dy * dy <= r * r;
}

function pixel(x, y, size) {
  const u = x / (size - 1);
  const v = y / (size - 1);
  if (!inRoundedRect(u, v, 0.18)) return [0, 0, 0, 0];
  const d1 = Math.hypot(u - 0.42, v - 0.56);
  const d2 = Math.hypot(u - 0.62, v - 0.46);
  const inCloud =
    d1 <= 0.15 || d2 <= 0.13 || (u >= 0.42 && u <= 0.62 && v >= 0.46 && v <= 0.56);
  return inCloud ? [255, 255, 255, 255] : [0x3b, 0x82, 0xf6, 255];
}

function makePngRows(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = new Uint8Array(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      row[1 + x * 4] = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rows.push(row);
  }
  return rows;
}

// 极简 PNG 编码器：RGBA8，filter 0
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rows) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rows[y].buffer, rows[y].byteOffset, rows[y].length).copy(
      raw,
      y * (size * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 经典 DIB(BMP) 格式的 ICO —— RC.EXE 100% 兼容
function makeDib(size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);      // biSize
  header.writeInt32LE(size, 4);     // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight（含 AND 掩码，故为 2 倍）
  header.writeUInt16LE(1, 12);      // biPlanes
  header.writeUInt16LE(32, 14);     // biBitCount
  header.writeUInt32LE(0, 16);      // biCompression = BI_RGB
  // 其余字段保持 0
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size);
      const rowFromBottom = size - 1 - y; // BMP 自下而上
      const off = (rowFromBottom * size + x) * 4;
      pixels[off] = b;
      pixels[off + 1] = g;
      pixels[off + 2] = r;
      pixels[off + 3] = a;
    }
  }
  const rowBytes = Math.ceil(size / 8);
  const paddedRow = Math.ceil(rowBytes / 4) * 4;
  const mask = Buffer.alloc(paddedRow * size); // 全 0：透明由 alpha 通道处理
  return Buffer.concat([header, pixels, mask]);
}

function encodeIcoDib(sizes) {
  const count = sizes.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4);
  const entries = [];
  const data = [];
  let offset = 6 + count * 16;
  for (const size of sizes) {
    const imgData = makeDib(size);
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; // width
    e[1] = size >= 256 ? 0 : size; // height
    e[2] = 0; // colorCount
    e[3] = 0; // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bitCount
    e.writeUInt32LE(imgData.length, 8); // bytesInRes
    e.writeUInt32LE(offset, 12); // imageOffset
    offset += imgData.length;
    entries.push(e);
    data.push(imgData);
  }
  return Buffer.concat([header, ...entries, ...data]);
}

const png256 = encodePng(256, makePngRows(256));
writeFileSync(join(outDir, 'app.png'), png256);
writeFileSync(join(outDir, 'tray.png'), png256);

const ico = encodeIcoDib([16, 32, 48]);
writeFileSync(join(outDir, 'app.ico'), ico);

console.log('icons written to', outDir);

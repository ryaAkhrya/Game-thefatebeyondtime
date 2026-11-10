import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export interface RawPng {
  width: number;
  height: number;
  /** RGBA, 4 byte per piksel */
  data: Uint8Array;
}

/** Dekoder PNG minimal (8-bit RGBA, tanpa interlace) yang mendukung semua filter baris. Cukup untuk aset proyek ini. */
export function readPng(path: string): RawPng {
  const buf = readFileSync(path);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colorType = body[9]!;
    } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  if (colorType !== 6) throw new Error(`PNG ${path}: hanya RGBA (colorType 6) didukung, dapat ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp]! : 0;
      const b = y > 0 ? out[(y - 1) * stride + i]! : 0;
      const c = i >= bpp && y > 0 ? out[(y - 1) * stride + i - bpp]! : 0;
      let v = row[i]!;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + i] = v & 255;
    }
  }
  return { width, height, data: out };
}

// Renders the generated SVG artwork to PNG with the brand font embedded, so the look doesn't depend on the fonts
// installed where the image is viewed. Metropolis comes from @fontsource/metropolis (WOFF files, unpacked here to
// the plain font format the renderer reads). System fonts are never used, so every machine renders the same PNG.
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

import { Resvg } from '@resvg/resvg-js';

import { writeAtomic } from './openlibrary.ts';

// WOFF 1.0 → SFNT (OTF/TTF): the same tables, zlib-compressed one by one behind a 44-byte header.
export function woffToSfnt(woff: Buffer): Buffer {
  if (woff.toString('ascii', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 font');
  const flavor = woff.readUInt32BE(4);
  const numTables = woff.readUInt16BE(12);
  const totalSfntSize = woff.readUInt32BE(16);
  if (numTables === 0 || 44 + numTables * 20 > woff.length) throw new Error('WOFF: bad table directory');
  const tables = Array.from({ length: numTables }, (_, i) => {
    const at = 44 + i * 20;
    const offset = woff.readUInt32BE(at + 4);
    const compLength = woff.readUInt32BE(at + 8);
    const origLength = woff.readUInt32BE(at + 12);
    if (offset + compLength > woff.length || compLength > origLength) throw new Error('WOFF: table out of range');
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? inflateSync(raw) : raw;
    if (data.length !== origLength) throw new Error('WOFF: table length mismatch');
    return { tag: woff.subarray(at, at + 4), checksum: woff.readUInt32BE(at + 16), data };
  });
  const pad = (n: number) => (n + 3) & ~3;
  const headerSize = 12 + numTables * 16;
  const out = Buffer.alloc(headerSize + tables.reduce((total, t) => total + pad(t.data.length), 0));
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  out.writeUInt32BE(flavor, 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(numTables * 16 - searchRange, 10);
  let offset = headerSize;
  tables.forEach((table, i) => {
    const at = 12 + i * 16;
    table.tag.copy(out, at);
    out.writeUInt32BE(table.checksum, at + 4);
    out.writeUInt32BE(offset, at + 8);
    out.writeUInt32BE(table.data.length, at + 12);
    table.data.copy(out, offset);
    offset += pad(table.data.length);
  });
  if (out.length !== totalSfntSize) throw new Error('WOFF: unpacked size differs from the header');
  return out;
}

const require = createRequire(import.meta.url);
const WEIGHTS = [400, 500, 600, 700] as const;

// resvg-js 2.6 ignores in-memory `fontBuffers` (it silently falls back to system fonts), so the unpacked fonts
// are written to seed/data/fonts (gitignored) and loaded as files.
const fontDir = resolve(import.meta.dirname, '../data/fonts');

let fonts: Promise<string[]> | undefined;
export function brandFonts(): Promise<string[]> {
  fonts ??= (async () => {
    await mkdir(fontDir, { recursive: true });
    return Promise.all(
      WEIGHTS.map(async (weight) => {
        const file = join(fontDir, `metropolis-${weight}.otf`);
        const woff = await readFile(require.resolve(`@fontsource/metropolis/files/metropolis-latin-${weight}-normal.woff`));
        // Atomic, so another script starting at the same time never loads a half-written font.
        await writeAtomic(file, woffToSfnt(woff));
        return file;
      }),
    );
  })();
  return fonts;
}

export async function renderPng(svg: string): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    font: { fontFiles: await brandFonts(), loadSystemFonts: false, defaultFontFamily: 'Metropolis' },
  });
  return resvg.render().asPng();
}

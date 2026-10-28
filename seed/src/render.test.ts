import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { Resvg } from '@resvg/resvg-js';

import { brandFonts, renderPng, woffToSfnt } from './render.ts';

// node:test's describe/it return promises the runner tracks itself.

const ink = async (weight: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="10" y="70" font-family="Metropolis" font-size="60" font-weight="${weight}">Thrive</text></svg>`;
  const { pixels } = new Resvg(svg, { font: { fontFiles: await brandFonts(), loadSystemFonts: false } }).render();
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 128) count++;
  return count;
};

void describe('render', () => {
  void it('rejects anything but WOFF 1.0', () => {
    assert.throws(() => woffToSfnt(Buffer.from('wOF2....')), /not a WOFF 1.0 font/);
  });

  void it('unpacks every weight to the size its WOFF header declares', async () => {
    for (const weight of [400, 500, 600, 700]) {
      const woff = await readFile(
        createRequire(import.meta.url).resolve(`@fontsource/metropolis/files/metropolis-latin-${weight}-normal.woff`),
      );
      assert.equal(woffToSfnt(woff).length, woff.readUInt32BE(16));
    }
  });

  void it('rejects a WOFF whose tables point outside the file', () => {
    const woff = Buffer.alloc(64);
    woff.write('wOFF', 0, 'ascii');
    woff.writeUInt16BE(1, 12);
    woff.writeUInt32BE(1000, 48);
    woff.writeUInt32BE(10, 52);
    woff.writeUInt32BE(10, 56);
    assert.throws(() => woffToSfnt(woff), /out of range/);
  });

  void it('renders text in Metropolis at its real weights', async () => {
    const [regular, bold] = [await ink(400), await ink(700)];
    assert.ok(regular > 0, 'text was not drawn: font missing');
    assert.ok(bold > regular * 1.4, `bold (${bold}) should carry clearly more ink than regular (${regular})`);
  });

  void it('produces identical PNGs on every run', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text x="4" y="30" font-family="Metropolis" font-size="24">Ab</text></svg>';
    const [a, b] = [await renderPng(svg), await renderPng(svg)];
    assert.equal(a.toString('hex', 1, 4), '504e47');
    assert.deepEqual(a, b);
  });
});

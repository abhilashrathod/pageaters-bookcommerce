import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { safeName, sweep, writeAtomic } from './openlibrary.ts';

// node:test's describe/it return promises the runner tracks itself.

void describe('image files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'seed-openlibrary-'));
  after(() => rm(dir, { recursive: true, force: true }));
  const files = async (names: string[]) => {
    for (const name of await readdir(dir)) await rm(join(dir, name));
    for (const name of names) await writeFile(join(dir, name), 'x');
  };

  void it('builds file names only from catalog-shaped IDs', () => {
    assert.equal(safeName('AU-12', '.svg'), 'AU-12.svg');
    assert.throws(() => safeName('../etc', '.svg'), /unexpected id/);
  });

  void it('writes through a .part file', async () => {
    await files([]);
    await writeAtomic(join(dir, 'AU-1.svg'), '<svg/>');
    assert.deepEqual(await readdir(dir), ['AU-1.svg']);
    assert.equal(await readFile(join(dir, 'AU-1.svg'), 'utf8'), '<svg/>');
  });

  void it('removes unreferenced files but keeps protected ones', async () => {
    await files(['AU-1-5.jpg', 'AU-1.svg', 'AU-2-7.jpg', 'AU-3-9.jpg', 'AU-4-1.jpg.part']);
    const removed = await sweep(dir, new Set(['AU-1.svg', 'AU-2-7.jpg']), ['AU-3-'], { previous: 2, current: 2 });
    assert.deepEqual(removed?.sort(), ['AU-1-5.jpg', 'AU-4-1.jpg.part']);
    assert.deepEqual((await readdir(dir)).sort(), ['AU-1.svg', 'AU-2-7.jpg', 'AU-3-9.jpg']);
  });

  void it('holds back when the image count drops sharply', async () => {
    await files(['AU-1-5.jpg', 'AU-2-7.jpg']);
    assert.equal(await sweep(dir, new Set(), [], { previous: 10, current: 7 }), undefined);
    assert.equal((await readdir(dir)).length, 2);
  });
});

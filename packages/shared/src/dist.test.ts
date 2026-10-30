import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// The `test` script builds first, so this checks what consumers get: the package's own `exports` map,
// resolved by plain Node ESM (no type stripping), as the seed and the API will import it.
void describe('built package', () => {
  void it('imports by name from plain Node ESM', () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    const script = "const m = await import('@pageaters/shared'); console.log(typeof m.objectIdSchema.parse);";
    const output = execFileSync(process.execPath, ['--no-experimental-strip-types', '--input-type=module', '-e', script], {
      cwd: packageDir,
      encoding: 'utf8',
    });
    assert.equal(output.trim(), 'function');
  });

  // The storefront loads the gift packages alone, without zod (its TypeScript can't read zod's declarations).
  void it('serves the gift packages as their own entry point, the same list as the barrel', () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    const script = [
      "const { GIFT_PACKAGES } = await import('@pageaters/shared/gift-packages');",
      "const barrel = await import('@pageaters/shared');",
      'console.log(JSON.stringify([GIFT_PACKAGES === barrel.GIFT_PACKAGES, GIFT_PACKAGES.map((p) => [p.title, p.cost])]));',
    ].join('\n');
    const output = execFileSync(process.execPath, ['--no-experimental-strip-types', '--input-type=module', '-e', script], {
      cwd: packageDir,
      encoding: 'utf8',
    });
    assert.deepEqual(JSON.parse(output), [
      true,
      [
        ['Basic', 49],
        ['Standard', 79],
        ['Premium', 99],
      ],
    ]);
  });
});

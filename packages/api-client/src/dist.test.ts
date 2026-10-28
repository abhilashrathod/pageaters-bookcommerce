import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// The `test` script builds first, so this checks what consumers get: the package's own `exports` map,
// resolved by plain Node ESM (no type stripping), including its import of the built `@pageaters/shared`.
void describe('built package', () => {
  void it('imports by name from plain Node ESM', () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    const script =
      "const m = await import('@pageaters/api-client'); const c = m.createApiClient({ baseUrl: '/api/v1' }); console.log(typeof c.categories.detail, typeof m.isApiError);";
    const output = execFileSync(process.execPath, ['--no-experimental-strip-types', '--input-type=module', '-e', script], {
      cwd: packageDir,
      encoding: 'utf8',
    });
    assert.equal(output.trim(), 'function function');
  });
});

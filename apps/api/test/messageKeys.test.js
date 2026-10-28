const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const messages = require('../src/locales/en.json');

// Every AppError a service throws must name a message key that already exists in en.json: the envelope's message
// is its translation, and i18n no longer adds unknown keys to the file (updateFiles: false).

const SERVICES = path.join(__dirname, '..', 'src', 'services');

const serviceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return serviceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });

test('every AppError code in src/services exists in src/locales/en.json', () => {
  const files = serviceFiles(SERVICES);
  assert.ok(files.length > 0, 'no service files found');

  const missing = [];
  let found = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    // Codes are literal strings; a computed code would escape this check, so refuse that too.
    for (const [, argument] of source.matchAll(/new AppError\(\s*([^,)]*)/g)) {
      const literal = argument.trim().match(/^(['"`])([A-Z0-9_]+)\1$/);
      if (!literal) {
        missing.push(`${path.relative(SERVICES, file)}: non-literal code ${argument.trim()}`);
        continue;
      }
      found += 1;
      if (!Object.hasOwn(messages, literal[2])) missing.push(`${path.relative(SERVICES, file)}: ${literal[2]}`);
    }
  }

  assert.ok(found > 0, 'no AppError codes found');
  assert.deepEqual(missing, []);
});

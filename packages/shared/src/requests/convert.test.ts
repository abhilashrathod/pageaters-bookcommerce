import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { joiBoolean, joiNumber } from './convert.ts';

// Expected results probed from Joi 14.3.1 (`Joi.number()` / `Joi.boolean()` with the default `convert: true`).
void describe('joiNumber', () => {
  void it('converts the decimal strings Joi 14 converts', () => {
    const converted: [string, number][] = [
      ['2', 2],
      ['  2  ', 2],
      ['\n3\n', 3],
      ['+2', 2],
      ['-1', -1],
      ['1.0', 1],
      ['1.50', 1.5],
      ['1e1', 10],
      ['1e+1', 10],
      ['25e-1', 2.5],
    ];
    for (const [input, output] of converted) assert.equal(joiNumber(input), output, input);
  });

  void it('leaves strings Joi 14 rejects unchanged', () => {
    for (const input of ['', ' ', '2abc', '0x10', '0b1', '.5e1', '1_0', 'Infinity', '00', '-0', '1E1', '1e400']) {
      assert.equal(joiNumber(input), input, input);
    }
  });

  void it('passes non-strings through', () => {
    for (const input of [5, true, null, undefined]) assert.equal(joiNumber(input), input);
  });

  // Joi's own normalisers (/\.?0+e/, /0+$/) backtrack quadratically on long zero runs; ours must stay linear.
  void it('handles 100k-character zero runs in linear time', () => {
    const zeros = '0'.repeat(100_000);
    // Joi rejects all but the leading-zeros one as unsafe (left unchanged); '-000…1' converts to -1.
    const cases: [string, unknown][] = [
      [`1.${zeros}10`, undefined],
      [`1${zeros}1e1`, undefined],
      [`1.${zeros}1e1`, undefined],
      [`1${zeros}`, undefined],
      [`-${zeros}1`, -1],
    ];
    for (const [input, converted] of cases) {
      const started = performance.now();
      const result = joiNumber(input);
      const elapsed = performance.now() - started;
      assert.ok(elapsed < 100, `${input.slice(0, 12)}… took ${elapsed.toFixed(1)} ms`);
      assert.equal(result, converted ?? input, input.slice(0, 12));
    }
  });
});

// Differential check against Joi 14's own number conversion while apps/api still installs Joi (until Phase 4).
type JoiNumber = {
  number: () => unknown;
  validate: (value: unknown, schema: unknown) => { error: Error | null; value: unknown };
};
const apiDir = fileURLToPath(new URL('../../../../apps/api/', import.meta.url));
const loadJoi = (): JoiNumber | undefined => {
  if (!existsSync(`${apiDir}package.json`)) return undefined;
  try {
    return createRequire(`${apiDir}package.json`)('joi') as JoiNumber;
  } catch {
    return undefined;
  }
};
const joi = loadJoi();

void describe('joiNumber parity with Joi 14', { skip: !joi && 'joi is not resolvable from apps/api' }, () => {
  void it('converts or rejects exactly what Joi.number() does', () => {
    if (!joi) return;
    const schema = joi.number();
    const signs = ['', '+', '-'];
    const integers = ['0', '00', '1', '01', '10', '100', '007', '9007199254740993'];
    const fractions = ['', '.0', '.00', '.5', '.50', '.05', '.10', '.000001'];
    const exponents = ['', 'e0', 'e1', 'e+1', 'e-1', 'e01', 'e-02', 'E1', 'e400', 'e-400'];
    for (const sign of signs) {
      for (const integer of integers) {
        for (const fraction of fractions) {
          for (const exponent of exponents) {
            const input = ` ${sign}${integer}${fraction}${exponent} `;
            const { error, value } = joi.validate(input, schema);
            const ours = joiNumber(input);
            if (!error) assert.equal(ours, value, input);
            // Joi also rejects numbers beyond ±2^53; the zod `.int()` check rejects those after conversion.
            else if (typeof ours === 'number') assert.ok(Math.abs(ours) > Number.MAX_SAFE_INTEGER, input);
            else assert.equal(ours, input, input);
          }
        }
      }
    }
  });
});

void describe('joiBoolean', () => {
  void it("converts 'true' and 'false' in any case and nothing else", () => {
    assert.equal(joiBoolean('true'), true);
    assert.equal(joiBoolean('TRUE'), true);
    assert.equal(joiBoolean('False'), false);
    for (const input of [' true', '1', 'yes', 'on', 1, 0, null]) assert.equal(joiBoolean(input), input);
  });
});

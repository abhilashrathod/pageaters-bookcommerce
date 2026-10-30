import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
      // Linear takes well under 1 ms; the quadratic regex took 15 s or more. The bound leaves room for a loaded CI box.
      assert.ok(elapsed < 1000, `${input.slice(0, 12)}… took ${elapsed.toFixed(1)} ms`);
      assert.equal(result, converted ?? input, input.slice(0, 12));
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

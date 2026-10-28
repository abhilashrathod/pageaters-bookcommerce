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
});

void describe('joiBoolean', () => {
  void it("converts 'true' and 'false' in any case and nothing else", () => {
    assert.equal(joiBoolean('true'), true);
    assert.equal(joiBoolean('TRUE'), true);
    assert.equal(joiBoolean('False'), false);
    for (const input of [' true', '1', 'yes', 'on', 1, 0, null]) assert.equal(joiBoolean(input), input);
  });
});

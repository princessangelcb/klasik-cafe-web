import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidPassword } from '../js/password-validation.mjs';

test('accepts passwords with at least eight non-space characters, letters, and numbers', () => {
  assert.equal(isValidPassword('KlasikCafe123'), true);
  assert.equal(isValidPassword('Coffee!2026'), true);
});

test('rejects passwords missing the length, letter, number, or no-space requirements', () => {
  assert.equal(isValidPassword('Cafe123'), false);
  assert.equal(isValidPassword('12345678'), false);
  assert.equal(isValidPassword('CafeCoffee'), false);
  assert.equal(isValidPassword('Cafe Cafe123'), false);
});

test('rejects URL-like passwords', () => {
  assert.equal(isValidPassword('https://example1.com'), false);
  assert.equal(isValidPassword('www.cafe1.com'), false);
  assert.equal(isValidPassword('cafe1.com'), false);
  assert.equal(isValidPassword('mailto:hello123@example.com'), false);
});

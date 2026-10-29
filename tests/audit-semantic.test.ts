import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { isCosmeticChange } from '../src/engine/semantic.js';

for (const initializer of [
  '(() => 1)', '(function () { return 1; })', '(class {})',
  '((() => 1) as () => number)', '(<() => number>(() => 1))',
  '((() => 1) satisfies () => number)', '((() => 1)!)',
]) {
  test(`semantic drift preserves inferred names through ${initializer}`, () => {
    const before = `export function login() { const first = ${initializer}; return first.name; }`;
    const after = before.replaceAll('first', 'second');
    for (const [source, expected] of [[before, 'first'], [after, 'second']]) {
      const javascript = ts.transpileModule(source!, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS } }).outputText;
      const exports: { login?: () => string } = {};
      Function('exports', javascript)(exports);
      assert.equal(exports.login!(), expected);
    }
    assert.equal(isCosmeticChange('a.ts', before, after), false);
    assert.equal(isCosmeticChange('a.ts', before, '// comment\n' + before), true);
  });
}

for (const declaration of [
  'export function login<T extends Allowed>(x: T): T { return x; }',
  'export function login<T = Allowed>(x: T): T { return x; }',
  'export const login = memo(<T extends Allowed>(x: T): T => x);',
  'export class Config<T extends Allowed = Allowed> {}',
  'export class Config { login<T = Allowed>(x: T): T { return x; } }',
  'export interface Config<T extends Allowed = Allowed> {}',
  'export type Config<T extends Allowed = Allowed> = T;',
]) {
  test(`semantic drift follows public generic dependencies: ${declaration}`, () => {
    const before = `type Allowed = string; ${declaration}`;
    assert.equal(isCosmeticChange('a.ts', before, before.replace('Allowed = string', 'Allowed = number')), false);
    assert.equal(isCosmeticChange('a.ts', before, '// comment\n' + before), true);
  });
}

test('semantic drift preserves public class field optionality', () => {
  const before = 'export class Config { value?: string; }';
  assert.equal(isCosmeticChange('a.ts', before, before.replace('value?', 'value!')), false);
  assert.equal(isCosmeticChange('a.ts', before, before.replace('value?', 'value')), false);
});

test('internal types and wrapped scalar local renames remain cosmetic', () => {
  const before = 'export function login() { type Internal = string; const first = (1 as number); return first; }';
  assert.equal(isCosmeticChange('a.ts', before, before.replace('Internal = string', 'Internal = number')), true);
  assert.equal(isCosmeticChange('a.ts', before, before.replaceAll('first', 'second')), true);
});

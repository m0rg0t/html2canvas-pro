import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const guide = await readFile(new URL('docs/CONTRIBUTING.md', root), 'utf8');
const workflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');

test('the documented no-emit typecheck command is executable and enforced by CI', () => {
    assert.match(manifest.scripts.typecheck ?? '', /tsc.*--noEmit/);
    assert.match(workflow, /run: pnpm typecheck/);
});

test('lint sends a recursive glob to ESLint instead of relying on shell globstar', () => {
    assert.equal(manifest.scripts.lint, 'eslint "src/**/*.ts" --max-warnings 0');
});

test('contributor docs distinguish unit, watch and full browser checks', () => {
    assert.match(guide, /pnpm unittest\s+#.*unit/i);
    assert.match(guide, /pnpm watch:unittest/);
    assert.match(guide, /pnpm test\s+#.*Karma/i);
    assert.doesNotMatch(guide, /pnpm test -- --watch/);
});

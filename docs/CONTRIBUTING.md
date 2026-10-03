# Contributing to html2canvas-pro

## Quick Start

Contributors use Node 24 LTS and the exact pnpm version in `packageManager` (currently 10.34.6). `.nvmrc` selects Node 24. These build-tool requirements are separate from the published library's existing Node/browser-consumer contract. Do not use an audit command as part of install or CI.

```bash
pnpm install --frozen-lockfile
pnpm build       # TypeScript compile + Rolldown bundle
pnpm unittest    # Run unit tests (Vitest)
pnpm typecheck   # No-emit check of published production source
pnpm test:tooling # Validate contributor commands and CI wiring
```

## Adding a New CSS Property

### Step 1: Create the property descriptor

Create `src/css/property-descriptors/<property-name>.ts`. Choose the parsing type:

```typescript
// For keyword-only properties (e.g., display: block | inline | none)
import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum MY_PROPERTY {
    VALUE_A = 0,
    VALUE_B = 1
}

export const myProperty: IPropertyIdentValueDescriptor<MY_PROPERTY> = {
    name: 'my-property',
    initialValue: 'value-a',
    prefix: false,   // true for -webkit- prefixed properties
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, value: string) => {
        switch (value) {
            case 'value-b': return MY_PROPERTY.VALUE_B;
            case 'value-a':
            default: return MY_PROPERTY.VALUE_A;
        }
    }
};
```

Refer to existing descriptors in `src/css/property-descriptors/` for examples of each type:
- `VALUE` — `font-size.ts`, `opacity.ts`
- `LIST` — `background-image.ts`, `margin.ts`
- `IDENT_VALUE` — `display.ts`, `visibility.ts`
- `TYPE_VALUE` — `background-color.ts` (color type)
- `TOKEN_VALUE` — `content.ts`

### Step 2: Register in CSSParsedDeclaration

In `src/css/index.ts`:

1. **Import the descriptor:**
   ```typescript
   import { myProperty } from './property-descriptors/my-property';
   ```

2. **Add a typed field** to `CSSParsedDeclaration` (alphabetically):
   ```typescript
   myProperty!: ReturnType<typeof myProperty.parse>;
   ```

3. **Add a standardProps entry** (the third field is the camelCase CSS property name
   that CSSStyleDeclaration exposes):
   ```typescript
   ['myProperty', myProperty, 'myProperty'],
   ```

### Step 3: Add rendering logic (if needed)

If the property affects visual rendering, add a handler in the appropriate renderer:
- **Background-related** → `src/render/canvas/background-renderer.ts`
- **Border-related** → `src/render/canvas/border-renderer.ts`
- **Content/layout-related** → `src/render/canvas/content-renderer.ts`
- **Transform/effect-related** → `src/render/stacking-context.ts` (add to `ElementPaint.effects`)

### Step 4: Add a unit test

Create or extend a test file in `src/css/property-descriptors/__tests__/`:

```typescript
import { deepStrictEqual } from 'assert';
import { myProperty } from '../my-property';
import { Context } from '../../../core/context';

vi.mock('../../../core/context');

it('parses "value-a"', () => {
    const context = {} as Context;
    deepStrictEqual(myProperty.parse(context, 'value-a'), 0);
});
```

### Step 5: Update docs

Update `docs/features.md` to list the newly supported property.

## Testing

### Running Tests

```bash
pnpm unittest                    # Run unit tests
pnpm watch:unittest               # Watch unit tests
pnpm unittest path/to/file        # Run a specific unit test file
pnpm unittest:coverage           # Unit tests with the existing coverage thresholds
pnpm test                        # Lint, unit tests and Karma browser tests
pnpm docs:build                  # Build the documentation
```

### Test Structure

Tests are colocated with source in `__tests__/` directories:
- `src/css/property-descriptors/__tests__/` — CSS property parsing tests
- `src/css/types/__tests__/` — CSS type tests (color, image, etc.)
- `src/render/canvas/__tests__/` — Renderer tests
- `src/dom/__tests__/` — DOM cloning tests
- `src/core/__tests__/` — Core utility tests

## Code Style

- TypeScript strict mode (noUncheckedIndexedAccess excluded)
- No `any` in production code (use proper types or `unknown` with narrowing)
- Prefer `const enum` for enum values that appear at runtime
- Use `import type` for type-only imports to avoid circular dependencies
- Match surrounding code style — the codebase uses semicolons, single quotes, 4-space indentation

## Build System

```
Rolldown → CJS bundle (dist/html2canvas-pro.cjs)
        → ESM bundle (dist/html2canvas-pro.esm.js)
        → UMD bundle (dist/html2canvas-pro.js)
        → UMD minified bundle (dist/html2canvas-pro.min.js)
        → Test runner bundle (build/testrunner.js)
```

- `pnpm build` — full build (tsc + rolldown)
- `pnpm typecheck` — no-emit check using `tsconfig.build.json`, covering the published production source. Unit-test fixtures are exercised by Vitest; their pre-existing type errors are not covered by this production-source command.
- `pnpm lint` — recursive, read-only lint including nested tests; the quoted glob works without shell `globstar`.
- `pnpm test:tooling` — dependency-free regression checks for these commands.
- Git hooks (Husky) run prettier + eslint on staged files

## Release Process

```bash
pnpm release <version>  # e.g., pnpm release 2.1.1
```

This bumps the version, runs the build, and publishes to npm.

## Architecture Reference

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed walkthrough of the rendering pipeline,
key design patterns, and file size reference.

## Compatibility holds

Vitest and its V8 coverage provider remain paired on current 3.2.x. The tested Vitest 5 migration changed branch instrumentation from 76.66% to 48.81% with all 1,171 tests still passing; the existing 70% gate is preserved pending a dedicated coverage migration. pnpm stays on current 10.x to retain the existing lockfile/install family. TypeScript remains on 5.9 while the existing declaration/CommonJS compilation pipeline is retained; TypeScript 6/7 requires a separate module-resolution migration, and TypeScript 7 is outside the current typescript-eslint/TypeDoc peer ranges. VitePress remains on stable 1.x. Native iOS simulator and release-tool major versions remain in their established compatible families; this PR does not certify a new simulator platform or run release tooling. Node types follow the contributor Node 24 runtime. Runtime dependencies, renderer behavior, browser targets, bundle entry points and package version are unchanged.

CI retains Chrome, Firefox and native Safari tests. The fork-specific Native WKWebView workflow remains separate and unchanged; a Safari pass is not a WKWebView result. No upstream commits or already-merged upstream renderer PRs are replayed.

See [maintenance compatibility notes](./MAINTENANCE.md) for verified holds and remaining development advisories.

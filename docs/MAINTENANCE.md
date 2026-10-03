# Maintenance compatibility notes (2026-10-03)

The contributor toolchain uses Node 24 and pnpm 10.34.6. The published package still declares Node >=16, keeps its CJS/ESM/UMD entry points and declarations, and targets ES2020. Runtime dependencies and renderer behavior are unchanged. Three source formatting changes produce identical JavaScript under TypeScript.

The dependency refresh includes supported patch/minor updates throughout the lockfile, ESLint 10, current TypeScript ESLint, Rolldown, JSDOM, and Mocha 12. The unused, unconfigured Commitizen adapter was removed. Commitlint's current parser peer is declared explicitly. Install scripts and Puppeteer downloads are disabled in CI; PR jobs have read-only repository permissions.

## Compatibility holds

- Vitest and its V8 coverage provider stay paired at 3.2.7. All 1,171 tests pass on both tested families, but Vitest 5 changes branch instrumentation from approximately 76.6% to 48.81%. The existing 70% branch threshold and other thresholds remain intact. A coverage migration requires dedicated work; it is not hidden by reducing thresholds.
- TypeScript stays at 5.9 for the existing declaration/CommonJS compilation pipeline. The new no-emit command checks published production source. Existing test-fixture type errors remain outside that command.
- VitePress stays on its current stable 1.6.4 release. Native simulator, release-tool, and Puppeteer majors stay in their existing families pending dedicated validation. This PR does not certify a new native simulator or exercise release tools.
- The owned fork's separate native WKWebView workflow is byte-for-byte unchanged. Chrome/Firefox/Safari checks do not certify WKWebView, and merged upstream renderer contributions are not replayed.

## Remaining development advisories

The 2026-10-03 production-only audit reports no advisories in the five resolved production dependency entries. The full development graph still reports 10 advisory findings (five high, five moderate), after compatible transitive updates and the Mocha refresh. This is not a clean full audit.

- VitePress uses Vite 5/esbuild 0.21, whose development-server advisories remain. Static documentation builds are checked; do not expose a development server to untrusted clients.
- Retained Vitest 3 and its mocker are reported under [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). The advisory concerns redirect mocks in development servers. This repository runs JSDOM tests and Karma browser tests, not a public mocker/interceptor plugin server; the dependency is nevertheless affected and remains reported.
- Puppeteer's browser-download tooling retains `extract-zip` and `basic-ftp` advisories. CI skips Puppeteer downloads and does not process user-supplied archives. The unpatched `extract-zip` reports remain unresolved.
- `braces` 3.0.3 is still affected by [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), with no published patch. Repository tooling uses checked-in patterns; arbitrary untrusted patterns are outside these checks. No override claims to fix this advisory.

Audit counts are a dated registry snapshot, not a guarantee about future findings. Remaining developer-tool upgrades need compatible replacements and their own tests.

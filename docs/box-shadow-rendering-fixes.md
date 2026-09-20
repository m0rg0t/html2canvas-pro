# Box-shadow rendering fixes

This branch builds on v2.4.4 and the independent `test/box-shadow-regressions` suite. It changes production rendering rather than relaxing the test thresholds. The public `html2canvas(element, options)` API is unchanged.

## Changes

`CanvasRenderer` delegates ordinary outer shadows and inset shadows to `src/render/canvas/box-shadow-painter.ts`. The existing `renderSurfaceBoxShadow` path for outer shadows within a composited filter/opacity surface is retained.

### Output-pixel scaling

Canvas shadow offsets and blur are output-pixel quantities. The previous ordinary-renderer path used a scale of one even when the capture was scaled. The new painter scales both shadow metrics and the displacement used to hide the solid source mask. This fixes the missing ordinary outer shadows at capture scale two in the reference suite.

### Rounded clipping masks

Reversing the array of corner Bezier segments does not reverse the curves themselves. The new painter builds separate closed subpaths and uses the even-odd fill/clip rule for the area outside the element or inside an inset shadow. It does not modify the shared CanvasRenderer.mask method or unrelated renderers.

### Inset shadows

Hard inset shadows paint the colored complement of a translated hole once, clipped to the padding box. Blurred insets rasterize that colored complement on a bounded surface and blur it once, then composite it into the padding box. This avoids painting both a semi-transparent source and its shadow over the visible edge.

Blur uses the existing runtime-probed native filter backend and SVG fallback, with Gaussian standard deviation equal to half the CSS box-shadow blur radius. Temporary surfaces share the existing raster reservation. Cleanup, allocation rejection, recoverable fallback, and propagation of cancellation/unexpected errors have focused unit coverage.

### Spread geometry

`src/render/canvas/box-shadow-geometry.ts` adjusts corner radii as the shadow silhouette grows or shrinks, including the CSS small-radius cubic adjustment and overlap normalization. Translation alone kept old corner radii and could turn a spread circle into a rounded square. The new helper is used for ordinary outer shadows and inset holes. It is not wired into the retained outer filter-surface renderer in this change.

## Measured validation

The pre-fix run [35513417062](https://github.com/m0rg0t/html2canvas-pro/actions/runs/35513417062) tested v2.4.4 production code: Chromium 28/58, Firefox 27/58, WebKit 28/58, totaling 83/174 passing configurations.

The expanded fix run [35514992334](https://github.com/m0rg0t/html2canvas-pro/actions/runs/35514992334), revision `b8ca8f5bc3602443dcfa8972c89ccce2a59e401c`, passed the original suite in all three engines and the additional 72 comparisons: 246/246 pixel configurations. All 1,256 unit tests and the existing filter descriptor/native/surface regressions passed. That revision's full lint reported a missing renderer trailing newline; the subsequent source change restores only that newline relative to the tested production code. Final checks are rerun on the documentation commit; consult that run rather than treating the earlier lint failure as a green workflow.

The original `scripts/box-shadow-regressions.mjs` remains unchanged. Its fixed thresholds and independent native-DOM reference method are documented in [box-shadow-regressions.md](./box-shadow-regressions.md). A failed case is not blessed as a golden image or silently marked expected.

The extended runner reuses the same oracle and thresholds with 12 fixtures at two scales in three engines. It adds hard rounded/circular spread, small-radius spread, hard rounded insets, bordered insets, a collapsed inset hole, large inset offsets, transparent insets, multiple insets, and forced SVG inset filtering. Both runners require their shadow-removal negative controls to fail the same acceptance criteria.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install --with-deps chromium firefox webkit
node scripts/box-shadow-regressions.mjs
node scripts/box-shadow-extended-regressions.mjs
pnpm unittest
pnpm exec eslint 'src/**/*.ts' --max-warnings 0
node scripts/filter-descriptor-regressions.mjs
node scripts/filter-native-regressions.mjs
node scripts/filter-surface-regressions.mjs
```

`BOX_SHADOW_BROWSERS=chromium` selects a single browser. Results, browser versions, commit and bundle hashes, computed CSS, native/capture/difference PNGs, and HTML reports are saved under `tmp/box-shadow-regressions/` and `tmp/box-shadow-extended/`. The dedicated `Box-shadow fixes validation` workflow saves these artifacts even when a check fails.

## Limits and review considerations

- These are Linux Playwright Chromium, Firefox and WebKit checks. They do not validate macOS Safari, genuine WKWebView, physical iOS or Android devices.
- Ordinary outer shadows and hard insets avoid additional raster surfaces. Blurred insets now have a bounded raster/filter cost; no whole-page performance budget or latency guarantee has been established for this change.
- Allocation/CSP/filter-failure native fallback has control-flow and cleanup tests, not a complete browser-pixel equivalence guarantee. Its WebKit behavior under memory pressure deserves additional review.
- The retained outer filter-surface path still has its own geometry and eligibility limits. Passing the selected combinations does not certify arbitrary spread geometry inside every filtered layer, transformed/blended subtrees, arbitrary filter chains, or SVG overflow.
- Pixel comparisons permit documented blur/antialiasing tolerances; 246 passes are not a claim of universal pixel-perfect CSS conformance.

## References

- [CSS Backgrounds and Borders, box shadows](https://www.w3.org/TR/css-backgrounds-3/#box-shadow): shape, spread, padding-box clipping, corner adjustment and blur.
- [HTML Canvas shadows](https://html.spec.whatwg.org/multipage/canvas.html#shadows): Canvas shadow offset and blur behavior.

Implementation and tests were AI-assisted. This is a review branch, not a published release or an upstream merge.

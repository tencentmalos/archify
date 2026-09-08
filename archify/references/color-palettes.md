# Color palettes independent of diagram structure

The fork adds `meta.color_palette` to all six types. Choose `studio`, `ocean`, `sunset`, `feishu`, or
`default` (the existing visual preset colors). The viewer's Style menu contains a separate Palette
selector. Switching it changes only semantic color variables; it does not change geometry, IDs,
labels, time scale, light/dark mode, visual preset, or another document's defaults.

| Palette | Use |
|---|---|
| Studio | Blue/violet, varied technical documents; Figma-inspired semantic tokens |
| Ocean | Teal/blue, systems and data-flow documents |
| Sunset | Orange/plum, presentations and contrasting document families |
| Feishu | Paper/brick red, restrained whiteboard and publication graphics |

Each named palette has its own light and dark mode. Text, secondary text and category-colored text
are tested at >=4.5:1 against page, panel and node/lane surfaces. Thin grid/border colors are separate
from text; do not use a faint border token for labels. The old decorative dim/faint text now uses
the theme's readable secondary token. The timeline renderer uses `.t-primary`, never implicit SVG
black, and explicit theme tokens for its swimlanes, headers, major/minor grid and markers.

Colors are defined once in `renderers/shared/color-palettes.mjs`: primitives → semantic roles →
light/dark modes. This follows Figma's semantic-variable/mode approach, not a claim that these are
Figma's official complete palettes. Primary references reviewed on 2026-09-08:

- https://developers.figma.com/docs/plugins/css-variables/
- https://www.figma.com/blog/illuminating-dark-mode/
- https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes

## Portable target registry

```sh
node <archify>/bin/archify.mjs palettes --json > archify-palettes.json
```

This exports `archify.color-palettes.v1`, including resolved hex tokens for both modes. Target
adapters consume this registry and record its hash. Do not maintain a second manual palette in a
Feishu skill. `default` intentionally is not exported: it inherits legacy visual-preset styling;
choose a named palette for a portable fixed-color SVG projection.

A Feishu scene sets `palette` and `theme` and references tokens such as `$bg`, `$text`, `$text-muted`,
`$backend-fill`, `$security-stroke`, `$lane-stroke`. Its renderer resolves tokens to explicit colors,
then its validator checks the selected palette and the editable SVG subset. Archify remains the
primary graph/type/layout authoring system; the Feishu child owns target projection, compatibility
and authorized insertion/verification. The paper palette does not require Feishu as the destination.

SVG export retains the selected palette in both light and dark definitions. Raster export uses the
current mode. Print resolves the selected named palette to light colors. Browser tests exercise the
native picker, theme toggles, unchanged interval geometry and the exported SVG; source-level contrast
tests cannot replace actual screenshots or document-platform validation.

## Rectangle and region hierarchy

Named palettes use category-tinted card fills, a separate subdued region surface, solid region borders,
and a filled, outlined region title tab. Security scopes keep dashed borders as a semantic distinction.
Cards use 8 px radii, section frames retain 8–12 px, timeline intervals use 4 px (SVG clamps very short bars).
Timeline lanes have a separate header surface, leading accent rail, rounded enclosure and major/minor guides.
No shadows obscure links; no decorative padding alters measured bar endpoints. Preserve all existing layout
clearance and text-fit checks. These are our adaptations, not pixel-for-pixel Figma components.

Reference: [Figma sections](https://help.figma.com/hc/en-us/articles/9771500257687-Organize-your-canvas-with-sections),
[corner radius and smoothing](https://help.figma.com/hc/en-us/articles/360050986854-Adjust-corner-radius-and-smoothing),
[stroke properties](https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties).
Editable SVG uses ordinary rounded rectangles; do not claim Figma's continuous corner smoothing.

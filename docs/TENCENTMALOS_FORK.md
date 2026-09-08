# tencentmalos customization branch

Upstream: https://github.com/tt-a1i/archify
Fork: https://github.com/tencentmalos/archify
Baseline: `2ead014aa8ec91f104cd052f1a6ca82de5e26c31`
Customization branch: `feature/concurrency-timeline`

This branch adds selectable semantic color palettes (including paper/brick-red), shared palette export for target adapters, contrast and browser/export tests, and the native `timeline` schema, evidence/interval analyzer, proportional renderer,
CLI registration, packaged zero-dependency validator, bilingual description, skill reference and
regression tests. It reuses native atomic delivery, preview and viewer/export contracts. It does
not replace the existing five structural modes. Existing gallery/golden artifacts are regenerated
when shared viewer code changes, so their reproducibility checks remain valid. The schema
namespace names the fork; common definitions explicitly retain upstream's schema ID.

The checked-in upstream `archify.zip` is not the distribution for this branch. Install the `archify/`
directory at an exact fork commit using Codex's GitHub skill installer. The ZIP and release version
remain upstream-owned to avoid falsely presenting a custom commit as an official release.

## Keep upstream sync reviewable

```sh
git remote add upstream https://github.com/tt-a1i/archify.git # once
 git fetch upstream
 git switch feature/concurrency-timeline
 git merge upstream/main
cd archify
npm ci --ignore-scripts
npm run generate:validators
npm test
```

Inspect shared CLI/type lists, schema generation, viewer output and delivery changes during merges.
Keep feature commits focused; do not rewrite public branch history merely to sync upstream. Run the
new timeline tests plus original regression suite, doctor and a delivered timeline's visual-check.
Review actual screenshots before updating the globally installed skill. Upstream update notices are
informational and must not silently replace this fork or drop its customization.

The global installation may also contain local skill routing overlays. Preserve/reapply these after
installing a new pinned commit; they are not modifications to the native renderer. Foundation stores
cross-project SVG/skill routing and Feishu-backend guidance separately.

Palette code and target-export contract: `archify/references/color-palettes.md`. The native timeline includes explicit swimlane backgrounds, headers and major/minor elapsed-time guides.

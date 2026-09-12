# Native concurrency timeline (tencentmalos fork)

Use `timeline` for proportional, measured interval views. Use `sequence` for an illustrative request
order. This fork adds timeline to the native CLI; upstream's five structural types remain unchanged.
Read `schemas/timeline.schema.json` and `examples/concurrency.timeline.json`, then save a candidate.
The example is deliberately marked synthetic and must never be presented as a capture.

## Evidence before geometry

1. Export complete intervals using the authorized domain analysis tools. For Azahar performance,
   Tracy/ptracy remains the only timing authority; Archify neither captures nor parses Tracy.
2. Normalize timestamps to relative milliseconds in one declared clock. Keep absolute origin as a
   string and raw queries/hash in the source record. Never feed epoch nanoseconds through JS Number.
   Values are bounded to 1e9 relative ms. Distinct unaligned clocks require separate diagrams.
3. Preserve lane identity, source reference, exact start/end and known frame/token strings. Missing
   identity stays absent. The schema requires `sources[].complete=true`; verify that declaration
   against the actual query/capture completeness before setting it. JSON validation cannot verify
   source truth or an optional source hash by itself.
4. CPU and GPU hardware intervals may share the axis only with `gpu_alignment=calibrated` and an
   explicit `calibration_source`. CPU submission time is a CPU lane, not GPU execution time. A GPU-only
   uncalibrated clock is allowed and must stay separate from host time.
5. Role `work` counts toward distinct active lanes, `detail` requires a containing work parent on the
   same lane and never adds concurrency, `wait` is visible but does not count as work. This is active
   **lane** concurrency, not CPU utilization or inferred hardware occupancy. Overlapping root intervals
   on one lane count once. Preserve nested/overlapping intervals as separate rows rather than hiding them.
6. The selected outer window clips visibility and statistics only; original interval endpoints remain
   in JSON/tooltips. Intervals wholly outside the selected window are rejected; narrow the input through
   an explicit recorded selection. No longest-frame ranking or implicit sampling. Markers describe
   instants and never imply frame begin/end ownership by their label alone.
7. Completion dependencies require named source evidence, known endpoints and `from.end <= to.start`.
   They are listed in interval details and layout JSON, not routed as chart arrows in v1. Temporal
   proximity never creates an edge. No critical-path or speedup inference is produced.

## CLI and acceptance

```sh
node <archify>/bin/archify.mjs validate timeline candidate.json --quality showcase --json
node <archify>/bin/archify.mjs validate timeline candidate.json --layout-json > timeline.report.json
node <archify>/bin/archify.mjs deliver timeline candidate.json timeline.html --quality showcase --json
node <archify>/bin/archify.mjs visual-check timeline.html --json
```

`--layout-json` emits `contract=timeline-v1`: source clock, window, original/clipped bar endpoints,
linear geometry, source IDs, dependency records and active-lane histogram/union metrics. Histogram
includes idle time and uses half-open intervals. Sum of histogram durations equals window duration.
Save this report with the input and delivery receipt. The general nine artifact checks are retained;
they are not nine independent timing proofs. Timeline schema/evidence checks and regression-tested
interval math run before rendering. Browser and perceptual acceptance remain separate.

Native HTML uses the existing viewer, focus details, themes and SVG export. Very short intervals keep
their real width; labels that do not fit remain available through focus/title and JSON. Never enlarge
bars to fit text. Dense input fails with an explicit window/lane split request instead of silently
omitting data. Inspect lane labels, ticks, clipped work, marker labels, role cues and metric text in
both themes. Nearby marker labels are clustered with a `+` tooltip while their individual time lines remain exact. Static SVG exports retain native titles; document previews may not expose interactivity.

Domain adapters remain separate. Azahar's six-frame stage bundle contains more workload/replay/closure
semantics than this generic model; keep that source and its report. Export only an explicitly selected
view to timeline, with stable interval IDs and a mapping/source sidecar. Do not claim a universal
lossless converter. Editable Feishu output still follows its JSON-scene child and target validator;
raw Archify SVG is not a compatible editable-whiteboard format.

## Shared phase timelines with Zone Rects

Use optional `zones: [{id, label, lanes}]` to put logical Guest/SDK, physical Host
and Async tracks on one shared, calibrated time axis. Zone Rects are visual
groups, not elapsed intervals or evidence of execution. Zones must partition
every lane exactly once, in displayed order. The model exposes independent
`metrics.byZone` and per-lane work/wait unions; it deliberately omits a global
peak/histogram across zones. Do not combine logical and physical lane counts.

Use `meta.interval_color: "label"` for consistent phase colors; wait outlines
stay dashed. `intervals[].display_label` is an optional concise display name,
while `label` remains the full searchable/focus identity. Names fit inside bars
first; readable prefixes can end in an ellipsis. A tiny bar can label free space
to its right, stopping before the next interval on that row. No bar is widened,
merged or sampled to fit names. A displayed duration with `≥` is clipped by the
selected window. Source frame labels/durations should be supplied explicitly.

Keep the primary concurrency comparison in one chart; individual partitions are
optional drilldowns. Prefer an explicit smaller common frame window if dense
workloads exceed capacity. This is a time-proportional flame-chart reading aid;
row packing on a Host lane does not reconstruct a call stack or causal relation.

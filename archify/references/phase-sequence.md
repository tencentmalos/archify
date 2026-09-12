# Phase-oriented UML sequence views

Native `sequence` supports a named Phase gutter and local activity boxes alongside
participants, messages and thin activations. Use this for execution order and
handoffs; native `timeline` remains the proportional elapsed-time view.

Set `meta.phase_bands: true` and usually `meta.column_fit: "spread"`. Phase mode
reserves a 180px left gutter, draws colored `segments` across all participants,
and keeps participant context, message labels and phase names visible in READ.
Use `meta.phase_note` (up to 180 characters) for the visible source/clock caveat.
It replaces the standard message legend in this mode.

```json
{
  "id": "wait-result",
  "participant": "main",
  "from": 310,
  "to": 460,
  "label": "Wait result",
  "detail": "request 42; completion pending",
  "type": "security",
  "note": "Observed begin/end; join by request identity."
}
```

Place these objects in `activities`. Required fields are `id`, `participant`,
`from`, `to`, `label`; `detail`, `type`, `note` are optional. IDs are unique and
must not collide with participant IDs. Boxes wrap words, splitting only tokens
wider than a box. `note` is available in focus details. Height must accommodate
complete title/detail; failed fit is an error, not silent truncation. Arrows
attach to active box sides. Unrelated activity crossings and label masks over
activities are rejected.

`segments` use `from`, `to`, `label`; optional `type` selects the palette color.
Explicit newlines work in phase labels. These are logical chapters unless domain
evidence proves a recorded phase with that ownership. Activities can cross chapter
boundaries. `par` is a visible annotation; the renderer does not infer partial order.

All `from`, `to` and message `y` values are **layout coordinates**. The renderer
cannot infer joins, convert timestamps or validate runtime ownership. Evidence
sidecars own those facts. Self-messages are unsupported; use a local activity for
a local step. Nested opaque activities are unsupported; put the inner name in its
enclosing box or use a thin activation for a separate lifetime.

`examples/concurrent-phases.sequence.json` is synthetic. It demonstrates enqueue,
a cross-phase wait and completion; its identities are not application evidence.

Use ordinary sequence validation/delivery. Inspect both themes in READ, preserve
full names, and pair with a measured timeline for elapsed-time or bottleneck work.

# Phase evidence and bottleneck interpretation

## Retained facts

Reuse the domain bundle; a new universal capture format is unnecessary.

| Element | Retain |
|---|---|
| Capture | Path/hash, process/session, configuration, retention/loss diagnostics |
| Participant | Stable ID, domain, physical TID or logical track identity |
| Phase/region | Exact name, cookie, track, begin/end TIDs, original timestamps and clock |
| Activity | Source observation IDs or code path/revision; proven nesting |
| Message | Sender/receiver event IDs, join key, mechanism and evidence level |
| Phase band | Recorded owner/identity or explicit logical grouping rationale |
| Unknown | Missing endpoint/join, uncalibrated clock, absent instrumentation |

For stripped Guest code, consume exact Build-ID-gated semantic symbols from the
project. An API name or another executable's symbol is not address evidence.
Distinguish observations from reconstructed names.

## Join before drawing a causal story

Pair region begin/end by the runtime's stable cookie and scope rules. Correlate
handoffs by queue serial, submission ID, request token or fence identity/value.
Never join by array position, nearest timestamp, equal labels or coincident
duration. Reused IDs may need session/generation qualification. Report unmatched
or ambiguous pairs instead of choosing one.

A source edge explains a possible path without proving it caused a selected
stall. Mark it `host_exact` or `api_semantic` with an explicit unjoined observation.
Reserve an `observed` handoff for joined endpoints. Use visible words such as
`conditional` or `unjoined` when uncertainty changes the apparent critical path.

Example: producer enqueue and worker dequeue of chunk 42 prove queue residence.
They do not connect that chunk to timeline value 90 unless a submit-to-timeline
association was recorded. A worker submit return also does not prove GPU completion.

## Phase and wait semantics

- Phase overlap does not imply shared frame ownership or a barrier.
- Async endpoints may execute on different threads. Queue admission can include
  producer capacity wait and queued residence. Name the exact measured boundaries;
  do not call the entire interval worker busy time.
- CPU scope wall duration includes preemption/blocking unless scheduler evidence
  separates them. A GPU-named Host scope is not hardware GPU time.
- CPU/GPU timestamps require calibration before sharing a measured axis. A
  schematic can show the dependency with hardware placement remaining unknown.
- Merge interval unions for timing; do not sum parent/child scopes or logical and
  physical views. Nested waits already contribute to enclosing elapsed intervals.
- File, streaming and ringbuffer imports use the same evidence checks. Saving a
  file does not prove complete region retention. Boundary clipping, overwritten
  buffers, dropped chunks and absent scheduler data remain explicit limitations.

## Target the next measurement

Find the dependency preventing the selected boundary from advancing, what its
producer was doing, and whether another frame was progressing concurrently. Use
its measured companion to quantify that interval. For a missing link, recommend
specific join events (such as enqueue serial plus submit tick) instead of calling
the longest colored box the bottleneck.

In A/B work, preserve executable/configuration and capture-mode identities.
Compare the end-to-end boundary, dependency chain and wait migration as well as
individual phase durations. Schematic geometry or a shorter isolated scope cannot
establish an optimization win.

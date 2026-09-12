---
name: uml-sequence-time
description: Create UML sequence views for concurrent phase analysis across threads, Guest/Host boundaries, queues, waits and asynchronous handoffs. Use when the reader needs to understand what happens within phases and who submits, waits, completes or wakes whom. Pair with measured timelines when comparing elapsed time or bottlenecks.
---

# UML Sequence Time

Show participants across the top and execution order downward. Keep Guest, Host
and relevant asynchronous work on one diagram. Use named horizontal Phase bands,
local activity boxes, activation/wait regions and meaningful cross-thread arrows.
Preserve an existing elapsed-time view as a companion.

## Select the evidence model

- **Source sequence:** explain control flow from current code. Label the diagram
  as a source model; conditional and unresolved handoffs remain visible.
- **Observed sequence:** reconstruct a bounded capture using stable region
  cookies and queue, frame, fence or request identities. Keep unmatched endpoints.
- **Measured comparison:** retain real timestamps and interval unions in a
  proportional timeline. Sequence coordinates alone cannot establish duration,
  concurrency, utilization or a critical path.

Read [Phase evidence](references/phase-evidence.md) when using profiler data,
classifying a wait, or proposing bottleneck attribution. Use the project's domain
analysis skill for executable identities, frame semantics and collectors.

## Organize the sequence

1. State the selected frame/window or source scenario. Identify logical Guest
   threads separately from physical Host threads, with domain labels in headers.
   A queue residence interval is not an executing thread; show enqueue/dequeue on
   the owning lifelines, adding a queue participant only when useful.
2. Give each Phase band a visible name. A recorded phase may belong to only one
   thread; do not promote it to a global barrier. Label synthetic grouping bands
   as logical chapters. Mark independent branches with `par` and explain that
   placement does not serialize them.
3. Place named activities inside the owning lifeline. Distinguish execution,
   blocked wait and asynchronous lifetime. Keep nested detail in the same view
   when it explains a handoff; avoid copying every micro-scope into a new lane.
4. Draw arrows for actual calls, enqueue/dequeue, signal/wake and completion.
   Include the joining identity when available. Submit return, queue pop,
   callback registration and hardware completion are different events.
5. Show waits and async regions continuing across Phase/frame boundaries. Retain
   original endpoints; a clipped boundary is not completion. Keep names readable
   in the default view and full labels in focus details.

## Render and deliver

Use the available `archify` skill's native `sequence` renderer. Read its sequence
schema, one example and `references/phase-sequence.md` for the Phase/activity
extension. It adds `meta.phase_bands`, `segments` and `activities`; it does not turn
sequence y coordinates into a calibrated axis. If the installed version lacks
these fields, use supported sequence fields and report the presentation limit
rather than passing unsupported JSON.

Keep generic layout changes in Archify and capture joins/analysis in the project.
Do not create another SVG renderer or replace the user's measured timeline.

Deliver the source/evidence mapping, exact sequence JSON, standalone HTML/SVG and
Archify validation/browser receipts. Inspect light/dark views, arrow directions
and visible Phase names. Link the measured companion using the same capture and
window when available. State whether this is a source explanation or an observed,
identity-joined execution.

import { validateSchema } from '../shared/validator.mjs';
import { throwDiagnosticProblems } from '../shared/diagnostics.mjs';

// All arithmetic is on bounded, relative milliseconds in exactly one declared clock.
export function analyzeTimeline(data) {
  validateSchema('timeline', data);
  const problems = [];
  const require = (ok, problem) => { if (!ok) problems.push(problem); };
  const unique = (items, collection) => {
    const result = new Map();
    for (const item of items) {
      require(!result.has(item.id), `/${collection}: duplicate ID ${item.id}`);
      result.set(item.id, item);
    }
    return result;
  };
  const sources = unique(data.sources, 'sources');
  const lanes = unique(data.lanes, 'lanes');
  const intervals = unique(data.intervals, 'intervals');
  unique(data.markers || [], 'markers');
  unique(data.dependencies || [], 'dependencies');
  const { start, end } = data.window;
  require(end > start, '/window/end must be after start');
  const usedKinds = new Set(data.intervals.map(i => lanes.get(i.lane)?.kind));
  const crossCpuGpu = usedKinds.has('cpu') && usedKinds.has('gpu');
  require(!crossCpuGpu || data.clock.gpu_alignment === 'calibrated', '/clock: CPU/GPU overlap requires calibrated shared time; split unrelated clocks into separate diagrams');
  if (data.clock.gpu_alignment === 'calibrated') {
    require(sources.has(data.clock.calibration_source), '/clock/calibration_source must name preserved calibration evidence');
  }
  for (const i of data.intervals) {
    require(lanes.has(i.lane), `/intervals/${i.id}: unknown lane`);
    require(sources.has(i.source), `/intervals/${i.id}: unknown source`);
    require(i.end > i.start, `/intervals/${i.id}: end must be after start`);
    require(i.start < end && i.end > start, `/intervals/${i.id}: outside selected window; select a relevant window explicitly`);
    if (i.role === 'detail') {
      const parent = intervals.get(i.parent);
      require(parent && parent.id !== i.id && parent.role === 'work' && parent.lane === i.lane && parent.start <= i.start && parent.end >= i.end,
        `/intervals/${i.id}: detail requires a containing work parent on the same lane`);
    } else {
      require(i.parent === undefined, `/intervals/${i.id}: only detail intervals have a parent`);
    }
  }
  for (const marker of data.markers || []) {
    require(marker.time >= start && marker.time <= end, `/markers/${marker.id}: outside window`);
    require(sources.has(marker.source), `/markers/${marker.id}: unknown source`);
  }
  for (const edge of data.dependencies || []) {
    const from = intervals.get(edge.from), to = intervals.get(edge.to);
    require(from && to && from.id !== to.id && from.end <= to.start,
      `/dependencies/${edge.id}: exact completion relation requires existing, ordered endpoints`);
    require(sources.has(edge.source), `/dependencies/${edge.id}: unknown evidence source`);
  }
  if (problems.length) throwDiagnosticProblems('Timeline evidence contract failed', problems, {
    code: 'timeline/evidence', subject: { diagramType: 'timeline' },
  });

  const clipped = data.intervals.map(i => ({ ...i, visibleStart: Math.max(start, i.start), visibleEnd: Math.min(end, i.end) }));
  // Sweep per-lane depth, not interval count: nested zones and overlapping samples on
  // the same lane never create an extra concurrent engine. Wait/detail are excluded.
  const events = new Map([[start, []], [end, []]]);
  for (const i of clipped.filter(i => i.role === 'work')) {
    for (const [time, delta] of [[i.visibleStart, 1], [i.visibleEnd, -1]]) {
      if (!events.has(time)) events.set(time, []);
      events.get(time).push([i.lane, delta]);
    }
  }
  const depth = new Map(), histogram = new Map(), laneBusy = Object.fromEntries(data.lanes.map(l => [l.id, 0]));
  let previous = start, peak = 0;
  for (const [time, changes] of [...events].sort((a, b) => a[0] - b[0])) {
    const active = [...depth].filter(([, count]) => count > 0).map(([lane]) => lane);
    const elapsed = time - previous;
    if (elapsed > 0) {
      histogram.set(active.length, (histogram.get(active.length) || 0) + elapsed);
      peak = Math.max(peak, active.length);
      for (const lane of active) laneBusy[lane] += elapsed;
    }
    for (const [lane, delta] of changes) depth.set(lane, (depth.get(lane) || 0) + delta);
    previous = time;
  }
  const laneLayout = [], bars = [];
  let y = 118;
  const x = time => 240 + (time - start) / (end - start) * 920;
  for (const lane of data.lanes) {
    const rows = [];
    for (const i of clipped.filter(i => i.lane === lane.id).sort((a, b) => a.visibleStart - b.visibleStart || b.visibleEnd - a.visibleEnd || a.id.localeCompare(b.id))) {
      let row = rows.findIndex(last => last <= i.visibleStart);
      if (row < 0) row = rows.length;
      rows[row] = i.visibleEnd;
      bars.push({ ...i, x: x(i.visibleStart), y: y + row * 30, width: x(i.visibleEnd) - x(i.visibleStart), height: 24 });
    }
    laneLayout.push({ ...lane, y, height: Math.max(78, Math.max(1, rows.length) * 30 + 24) });
    y += Math.max(78, Math.max(1, rows.length) * 30 + 24) + 6;
  }
  if (y > 1040) throwDiagnosticProblems('Timeline is too dense to read', ['Choose a narrower explicit time window or fewer lanes; never drop intervals implicitly.'], { code: 'timeline/density', subject: { diagramType: 'timeline' } });
  return {
    contract: 'timeline-v1', clock: data.clock, evidenceKind: data.evidence_kind,
    window: data.window, viewBox: [1200, Math.max(640, y + 230)], lanes: laneLayout, bars,
    markers: (data.markers || []).map(m => ({ ...m, x: x(m.time) })),
    dependencies: data.dependencies || [],
    metrics: { unit: 'ms', definition: 'distinct lanes with role=work; clipped to the selected window',
      peakActiveLanes: peak, laneBusy, histogram: [...histogram].sort((a, b) => a[0] - b[0]).map(([activeLanes, duration]) => ({ activeLanes, duration })) },
    diagnostics: [],
  };
}

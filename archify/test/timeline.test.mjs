import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeTimeline } from '../renderers/timeline/model.mjs';
import { fitTimelineLabel, intervalText } from '../renderers/timeline/labels.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = () => JSON.parse(fs.readFileSync(path.join(root, 'examples/concurrency.timeline.json'), 'utf8'));
const cli = (...args) => spawnSync(process.execPath, [path.join(root, 'bin/archify.mjs'), ...args], { encoding: 'utf8' });
const sample = () => {
  const d = example(); d.window = { start: 0, end: 20 }; d.markers = []; d.dependencies = [];
  d.lanes = d.lanes.slice(0, 2); d.clock.gpu_alignment = 'not_applicable'; delete d.clock.calibration_source;
  d.intervals = [
    { id: 'a', lane: 'guest', start: 0, end: 10, label: 'A', role: 'work', source: 'fixture' },
    { id: 'b', lane: 'record', start: 5, end: 15, label: 'B', role: 'work', source: 'fixture' },
  ]; return d;
};

test('sweep counts distinct active lanes and accounts for idle window', () => {
  const d = sample();
  d.intervals.push({ ...d.intervals[0], id: 'nested-work', start: 2, end: 8 });
  d.intervals.push({ ...d.intervals[0], id: 'detail', role: 'detail', parent: 'a', start: 1, end: 9 });
  d.intervals.push({ ...d.intervals[1], id: 'wait', role: 'wait', start: 15, end: 20 });
  const report = analyzeTimeline(d);
  assert.deepEqual(report.metrics.histogram, [{ activeLanes: 0, duration: 5 }, { activeLanes: 1, duration: 10 }, { activeLanes: 2, duration: 5 }]);
  assert.deepEqual(report.metrics.laneBusy, { guest: 10, record: 10 });
  assert.equal(report.metrics.peakActiveLanes, 2);
});

test('clipping preserves original intervals and exact proportional bar widths', () => {
  const d = sample(); d.window = { start: 4, end: 12 };
  const { bars, metrics } = analyzeTimeline(d);
  assert.equal(bars[0].start, 0);
  assert.equal(bars[0].visibleStart, 4);
  assert.equal(bars[0].width, 920 * 6 / 8);
  assert.deepEqual(metrics.laneBusy, { guest: 6, record: 7 });
});

test('same-time completion and start are half-open, not extra concurrency', () => {
  const d = sample(); d.intervals[1].start = 10;
  assert.equal(analyzeTimeline(d).metrics.peakActiveLanes, 1);
});

test('reject mixed CPU/GPU clocks without explicit calibration provenance', () => {
  const d = example(); d.clock.gpu_alignment = 'uncalibrated';
  assert.throws(() => analyzeTimeline(d), /calibrated shared time/);
  d.clock.gpu_alignment = 'calibrated'; delete d.clock.calibration_source;
  assert.throws(() => analyzeTimeline(d), /calibration_source/);
});

test('reject invalid identity, incomplete input, reversed and orphan detail intervals', () => {
  for (const mutate of [
    d => d.intervals.push({ ...d.intervals[0] }),
    d => d.intervals[0].lane = 'absent',
    d => d.intervals[0].source = 'absent',
    d => d.intervals[0].end = d.intervals[0].start,
    d => d.intervals[0].role = 'detail',
    d => d.sources[0].complete = false,
    d => d.intervals[0].start = NaN,
    d => d.intervals[0].end = Infinity,
  ]) {
    const d = example(); mutate(d); assert.throws(() => analyzeTimeline(d));
  }
});

test('completion dependencies need known endpoints, ordered times and source', () => {
  const d = example(); d.dependencies[0].to = 'guest-b';
  assert.doesNotThrow(() => analyzeTimeline(d));
  d.dependencies[0].from = 'gpu-a';
  assert.throws(() => analyzeTimeline(d), /ordered endpoints/);
  d.dependencies[0].from = 'unknown';
  assert.throws(() => analyzeTimeline(d), /ordered endpoints/);
});

test('native CLI delivers deterministically and preserves last-good on failure', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-timeline-test-'));
  try {
    const input = path.join(temp, 'input.json'), output = path.join(temp, 'timeline.html');
    fs.writeFileSync(input, JSON.stringify(example()));
    const first = cli('deliver', 'timeline', input, output, '--quality', 'showcase', '--json');
    assert.equal(first.status, 0, first.stdout + first.stderr);
    const delivered = fs.readFileSync(output);
    const again = cli('deliver', 'timeline', input, output, '--quality', 'showcase', '--json');
    assert.equal(again.status, 0, again.stdout + again.stderr);
    assert.deepEqual(fs.readFileSync(output), delivered);
    const layout = cli('validate', 'timeline', input, '--layout-json');
    assert.equal(layout.status, 0, layout.stderr);
    assert.equal(JSON.parse(layout.stdout).contract, 'timeline-v1');
    const invalid = example(); invalid.clock.gpu_alignment = 'uncalibrated';
    fs.writeFileSync(input, JSON.stringify(invalid));
    assert.notEqual(cli('deliver', 'timeline', input, output, '--json').status, 0);
    assert.deepEqual(fs.readFileSync(output), delivered);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('short interval is not widened and full escaped label remains accessible', () => {
  const d = sample(); d.intervals[0].end = 0.00001; d.intervals[0].label = '<script> & short span';
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-timeline-short-'));
  try {
    const input = path.join(temp, 'input.json'), output = path.join(temp, 'timeline.html');
    fs.writeFileSync(input, JSON.stringify(d));
    const result = cli('render', 'timeline', input, output);
    assert.equal(result.status, 0, result.stderr);
    const html = fs.readFileSync(output, 'utf8');
    assert.ok(html.includes('&lt;script&gt; &amp; short span'));
    assert.ok(analyzeTimeline(d).bars[0].width < 0.001);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('zone rectangles share exact time while concurrency stays separate', () => {
  const d = sample();
  d.lanes[0].kind = 'other';
  d.zones = [{ id: 'guest-zone', label: 'Guest', lanes: ['guest'] },
    { id: 'host-zone', label: 'Host', lanes: ['record'] }];
  const r = analyzeTimeline(d);
  assert.equal(r.metrics.aggregation, 'per_zone');
  assert.equal(r.metrics.peakActiveLanes, undefined);
  assert.equal(r.metrics.histogram, undefined);
  assert.deepEqual(r.metrics.byZone.map(z => z.peakActiveLanes), [1, 1]);
  for (const z of r.metrics.byZone) assert.equal(z.histogram.reduce((s, h) => s + h.duration, 0), 20);
  assert.equal(r.bars[1].x - r.bars[0].x, 1320 * 5 / 20);
  for (const z of r.zones) for (const id of z.lanes) {
    const l = r.lanes.find(l => l.id === id);
    assert.ok(l.y > z.y && l.y + l.height <= z.y + z.height);
  }
});

test('zones reject duplicate, missing, unknown and reordered lane membership', () => {
  for (const groups of [[['guest'], ['guest']], [['guest']], [['absent'], ['record']], [['record'], ['guest']]]) {
    const d = sample();
    d.zones = groups.map((lanes, n) => ({ id: `zone-${n}`, label: 'Zone', lanes }));
    assert.throws(() => analyzeTimeline(d), /partition all lanes exactly once/);
  }
});

test('labels retain readable prefixes without enlarging bars or shrinking text', () => {
  assert.equal(fitTimelineLabel('Maxwell', 60), 'Maxwell');
  assert.equal(fitTimelineLabel('WaitSubmittedCommands', 90), 'WaitSubmit…');
  assert.equal(fitTimelineLabel('Maxwell', 15), '');
  const bar = { label: 'Host::VulkanTimeline.Wait', display_label: 'TimelineWait', width: 130,
    start: 0, end: 20, visibleStart: 5, visibleEnd: 20 };
  assert.equal(intervalText(bar), 'TimelineWait');
  assert.match(intervalText({ ...bar, width: 350 }), /≥15 ms/);
});

test('short isolated phases get outside labels, full identity and exact geometry', () => {
  const d = sample();
  d.intervals[0].end = 0.00001;
  d.intervals[0].label = 'Full original phase';
  d.intervals[0].display_label = 'Phase';
  d.zones = [{ id: 'combined', label: 'Combined', lanes: ['guest', 'record'] }];
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-phase-label-'));
  try {
    const input = path.join(temp, 'input.json'), output = path.join(temp, 'timeline.html');
    fs.writeFileSync(input, JSON.stringify(d));
    const result = cli('deliver', 'timeline', input, output, '--quality', 'showcase', '--json');
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const html = fs.readFileSync(output, 'utf8');
    assert.match(html, /data-timeline-zone="combined"/);
    assert.match(html, /data-timeline-label="outside">Phase<\/text>/);
    assert.match(html, /Full original phase/);
    assert.ok(analyzeTimeline(d).bars[0].width < 0.001);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = () => JSON.parse(fs.readFileSync(path.join(root, 'examples/concurrent-phases.sequence.json')));
function render(doc) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sequence-phases-'));
  try {
    const input = path.join(tmp, 'input.json'), output = path.join(tmp, 'output.html');
    fs.writeFileSync(input, JSON.stringify(doc));
    fs.writeFileSync(output, 'last-good');
    const r = spawnSync(process.execPath, [path.join(root, 'renderers/sequence/render-sequence.mjs'), input, output], {encoding: 'utf8'});
    return {status: r.status, error: r.stderr, html: fs.readFileSync(output, 'utf8')};
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
}
function rejects(doc, expected) {
  const r = render(doc);
  assert.notEqual(r.status, 0);
  assert.match(r.error, expected);
  assert.equal(r.html, 'last-good', 'invalid activities must preserve the trusted output');
}

test('named phases and a cross-phase wait remain visible with source identity', () => {
  const r = render(example());
  assert.equal(r.status, 0, r.error);
  assert.match(r.html, /data-phase-label="0"/);
  assert.match(r.html, /data-sequence-activity="wait"/);
  assert.match(r.html, /Crosses phase boundary/);
  assert.match(r.html, /vertical distance is not elapsed time/);
  assert.match(r.html, />render_ready →<\/text>/);
  assert.match(r.html, />present<\/text>/, 'wrap complete words instead of splitting present into presen + t');
});

test('unknown activity owners fail with a useful error', () => {
  const d=example(); d.activities[0].participant='missing'; rejects(d, /unknown participant/);
});
test('activity identities are unique and separate from participants', () => {
  const d=example(); d.activities[0].id='main'; rejects(d, /conflicts with a participant/);
  d.activities[0].id='wait'; rejects(d, /Activity ids must be unique/);
});
test('activity text cannot silently overflow a short box', () => {
  const d=example(); d.activities[0].to=190; rejects(d, /text needs a taller box/);
});
test('local activities cannot mask one another', () => {
  const d=example(); d.activities[0].to=325; rejects(d, /Activities record and wait overlap/);
});
test('messages cannot cross unrelated opaque work', () => {
  const d=example(); d.messages.push({from:'main',to:'present',y:470,label:'unrelated'});
  rejects(d, /crosses unrelated activity execute/);
});
test('message label masks cannot cover an activity', () => {
  const d=example(); d.messages[1].label='A very long completion message that reaches the waiting producer';
  rejects(d, /overlaps activity wait/);
});
test('activity ranges are bounded by the lifeline canvas', () => {
  const d=example(); d.activities[3].to=900; rejects(d, /invalid range/);
});
test('phase labels must fit their visible band', () => {
  const d=example(); d.segments[0].to=170; rejects(d, /phase label needs more height/);
});
test('phase participant labels use the actual larger font fit', () => {
  const d=example(); d.participants[0].label='Participant name exceeds header';
  rejects(d, /wider than the .* participant box/);
});

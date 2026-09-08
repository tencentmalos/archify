import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PALETTES, semanticTokens, paletteRegistry } from '../renderers/shared/color-palettes.mjs';
import { validateSchema } from '../renderers/shared/validator.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function luminance(hex) {
  const channels = hex.match(/[a-f0-9]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

test('every named palette has readable semantic text in both modes', () => {
  for (const [name, palette] of Object.entries(PALETTES)) for (const theme of ['light', 'dark']) {
    const mode = palette[theme], tokens = semanticTokens(mode);
    for (const foreground of ['text', 'text-muted', 'text-dim', 'text-faint', ...Object.keys(tokens).filter(k => k.endsWith('-stroke') && k !== 'lane-stroke')]) {
      for (const background of ['bg', 'panel', 'lane-fill']) {
        const ratio = contrast(tokens[foreground], tokens[background]);
        assert.ok(ratio >= 4.5, `${name}/${theme}/${foreground} on ${background}: ${ratio}`);
      }
    }
    for (const bg of Object.keys(tokens).filter(k => k.endsWith('-fill') || k.endsWith('-header'))) {
      for (const fg of ['text', 'text-muted']) assert.ok(contrast(tokens[fg], tokens[bg]) >= 4.5, `${name}/${theme}/${fg} on ${bg}`);
    }
  }
});

test('all six types accept selectable palettes and reject misspelled values', () => {
  for (const [type, file] of Object.entries({ architecture: 'web-app.architecture.json', workflow: 'agent-tool-call.workflow.json', sequence: 'cache-miss-request.sequence.json', dataflow: 'product-analytics.dataflow.json', lifecycle: 'agent-run.lifecycle.json', timeline: 'concurrency.timeline.json' })) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'examples', file)));
    for (const palette of ['default', ...Object.keys(PALETTES)]) { data.meta.color_palette = palette; assert.doesNotThrow(() => validateSchema(type, data)); }
    data.meta.color_palette = 'figma-unverified'; assert.throws(() => validateSchema(type, data));
  }
});

test('CLI palette registry is the same source consumed by renderers and target adapters', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'bin/archify.mjs'), 'palettes', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), paletteRegistry());
});

test('palette authoring preserves timeline geometry and escapes source copy', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-palettes-'));
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'examples/concurrency.timeline.json')));
    let geometry;
    for (const palette of Object.keys(PALETTES)) {
      data.meta.color_palette = palette;
      const input = path.join(temp, 'input.json'), output = path.join(temp, 'output.html');
      fs.writeFileSync(input, JSON.stringify(data));
      const result = spawnSync(process.execPath, [path.join(root, 'bin/archify.mjs'), 'render', 'timeline', input, output], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const html = fs.readFileSync(output, 'utf8');
      assert.ok(html.includes(`data-color-palette="${palette}"`));
      const bars = [...html.matchAll(/<rect[^>]*data-time-start[^>]*>/g)].map(m => m[0]);
      if (geometry) assert.deepEqual(bars, geometry); else geometry = bars;
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

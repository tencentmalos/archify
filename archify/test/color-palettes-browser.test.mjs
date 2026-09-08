import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ChromeVisualBrowser, findChrome } from '../bin/visual-check.mjs';
import { PALETTES } from '../renderers/shared/color-palettes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.ARCHIFY_CHROME ? findChrome() : null;
test('palette picker, theme, diagram geometry and SVG exports stay orthogonal in Chrome', {
  skip: chrome ? false : 'Set ARCHIFY_CHROME for the browser palette/export regression.',
}, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-palette-browser-'));
  const browser = new ChromeVisualBrowser(chrome);
  try {
    const input = path.join(temp, 'source.json'), output = path.join(temp, 'diagram.html');
    const data = JSON.parse(fs.readFileSync(path.join(root, 'examples/concurrency.timeline.json')));
    data.meta.color_palette = 'studio'; fs.writeFileSync(input, JSON.stringify(data));
    execFileSync(process.execPath, [path.join(root, 'bin/archify.mjs'), 'deliver', 'timeline', input, output, '--quality', 'showcase', '--json']);
    await browser.inspect({ artifactPath: output, width: 1440, height: 900, theme: 'dark' });
    const session = await browser.sessionPromise;
    const evaluate = async expression => {
      const result = await browser.cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session);
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const results = await evaluate(`(async function () {
      var records = []; var original = Array.from(document.querySelectorAll('[data-time-start]')).map(e => [e.getAttribute('x'), e.getAttribute('width')]);
      HTMLAnchorElement.prototype.click = function () {};
      var create = URL.createObjectURL; var captured;
      URL.createObjectURL = function (blob) { if (blob.type.indexOf('image/svg') === 0) captured = blob.text(); return create.call(URL, blob); };
      for (var palette of ['studio', 'ocean', 'sunset', 'feishu']) {
        var select = document.getElementById('color-palette'); select.value = palette; select.dispatchEvent(new Event('change', { bubbles: true }));
        for (var theme of ['dark', 'light']) {
          if (document.documentElement.getAttribute('data-theme') !== theme) Archify.theme.toggle();
          await Archify.exportMenu.run('svg');
          var svg = await captured;
          var style = getComputedStyle(document.documentElement);
          records.push({ palette: Archify.palette.current(), theme: document.documentElement.getAttribute('data-theme'), preset: document.documentElement.getAttribute('data-preset'),
            text: getComputedStyle(document.querySelector('.diagram-container svg text')).fill,
            background: style.getPropertyValue('--bg').trim(),
            geometry: Array.from(document.querySelectorAll('[data-time-start]')).map(e => [e.getAttribute('x'), e.getAttribute('width')]), original,
            exportHasLight: svg.includes(${JSON.stringify(PALETTES.studio.light.bg)}), svg,
            hasLanes: document.querySelectorAll('.diagram-container svg rect').length,
            grid: document.querySelectorAll('[data-timeline-grid]').length });
        }
      }
      return records;
    })()`);
    for (const record of results) {
      assert.equal(record.preset, 'classic');
      assert.deepEqual(record.geometry, record.original);
      assert.equal(record.background, PALETTES[record.palette][record.theme].bg);
      const rgb = PALETTES[record.palette][record.theme].text.match(/[a-f0-9]{2}/gi).map(c => parseInt(c, 16)).join(', ');
      assert.equal(record.text, `rgb(${rgb})`);
      assert.ok(record.svg.includes(PALETTES[record.palette].dark.bg));
      assert.ok(record.svg.includes(PALETTES[record.palette].light.bg));
      assert.ok(!record.svg.includes('<select'), 'viewer controls must not leak into exported SVG');
      assert.equal(record.grid, 31);
    }
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
});

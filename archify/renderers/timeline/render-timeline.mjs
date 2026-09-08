import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDiagram, writeDiagram, svgRootAttrs, svgAccessibleText, focusNodeAttrs, focusNodeTitle } from '../shared/cli.mjs';
import { esc } from '../shared/utils.mjs';
import { analyzeTimeline } from './model.mjs';

const { diagram, template, outPath } = loadDiagram({
  rendererDir: path.dirname(fileURLToPath(import.meta.url)), diagramType: 'timeline', defaultExample: 'concurrency.timeline.json',
});
const report = analyzeTimeline(diagram);
if (process.argv.includes('--layout-json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const zh = diagram.meta.locale === 'zh-CN';
  const label = (en, cn) => zh ? cn : en;
  const number = n => Number(n.toFixed(6)).toString();
  const height = report.viewBox[1];
  const chartEnd = Math.max(...report.lanes.map(l => l.y + l.height));
  const parts = [`<svg viewBox="0 0 1200 ${height}" ${svgRootAttrs(diagram.meta)} data-diagram-type="timeline">`, svgAccessibleText(diagram.meta, 'timeline')];
  const text = (x, y, value, size = 13, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" class="t-primary" ${extra}>${esc(value)}</text>`;
  const evidenceText = diagram.evidence_kind === 'synthetic'
    ? label('SYNTHETIC — model example, not a performance capture', '合成示例 — 不代表实测性能')
    : label('MEASURED — source declarations retained; verify the original evidence', '实测数据 — 保留来源声明，须核验原始证据');
  parts.push(text(30, 30, evidenceText, 16));
  parts.push(text(30, 57, label('Relative milliseconds · linear scale · hover/click intervals for exact identity', '相对毫秒 · 线性比例 · 悬停或点击查看精确身份'), 13));
  [['c-backend', label('work', '工作')], ['c-external', 'detail'], ['c-security', 'wait']].forEach(([css, name], index) => {
    parts.push(`<rect x="${860 + index * 100}" y="43" width="18" height="14" class="${css}"/>${text(884 + index * 100, 55, name, 12)}`);
  });
  for (const lane of report.lanes) {
    const top = lane.y - 8;
    parts.push(`<rect x="30" y="${top}" width="1130" height="${lane.height + 8}" rx="8" fill="var(--lane-fill)" stroke="var(--lane-stroke)" stroke-width="1.2"/>`);
    parts.push(`<rect x="30" y="${top}" width="190" height="${lane.height + 8}" rx="8" fill="var(--lane-header, var(--mask))" stroke="var(--lane-stroke)" stroke-width="1.2"/>`);
    parts.push(`<rect x="30" y="${top + 8}" width="3" height="${lane.height - 8}" rx="1.5" fill="var(--backend-stroke)"/>`);
  }
  for (let minor = 0; minor <= 30; minor++) {
    if (minor % 5 === 0) continue;
    const x = 240 + minor / 30 * 920;
    parts.push(`<line x1="${x}" y1="100" x2="${x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-opacity="0.22" stroke-width="0.7" data-timeline-grid="minor"/>`);
  }
  for (let tick = 0; tick <= 6; tick++) {
    const x = 240 + tick / 6 * 920;
    const time = diagram.window.start + tick / 6 * (diagram.window.end - diagram.window.start);
    parts.push(`<line x1="${x}" y1="100" x2="${x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-opacity="0.55" stroke-width="1.2" data-timeline-grid="major"/>`);
    parts.push(text(x, 92, `${number(time)} ms`, 12, 'text-anchor="middle"'));
  }
  for (const lane of report.lanes) {
    // Explicit wrapping changes only label layout, never measured interval coordinates.
    const lines = []; let line = '', units = 0;
    for (const char of lane.label) {
      const width = char.codePointAt(0) < 128 ? 0.62 : 1;
      if (units + width > 14 && line) { lines.push(line); line = ''; units = 0; }
      line += char; units += width;
    }
    if (line) lines.push(line);
    lines.forEach((value, index) => parts.push(text(42, lane.y + 17 + index * 16, value, 13)));
    parts.push(`<line x1="30" y1="${lane.y + lane.height}" x2="1160" y2="${lane.y + lane.height}" stroke="var(--lane-stroke)"/>`);
  }
  for (const bar of report.bars) {
    const outgoing = report.dependencies.filter(e => e.from === bar.id).map(e => `${e.to}: ${e.label} [${e.source}]`).join('; ');
    const source = diagram.sources.find(s => s.id === bar.source);
    const metadata = { kind: bar.role, sublabel: `${bar.id} · ${bar.start}–${bar.end} ms (${bar.end - bar.start} ms)`,
      context: `${bar.lane}; ${bar.role}; source=${source.reference}; token=${bar.token ?? '?'}; frame=${bar.frame ?? '?'}; visible=${bar.visibleStart}–${bar.visibleEnd} ms${outgoing ? '; completion → ' + outgoing : ''}` };
    const css = bar.role === 'wait' ? 'c-security' : bar.role === 'detail' ? 'c-external' : 'c-backend';
    parts.push(`<g ${focusNodeAttrs(bar.id, bar.label, metadata, diagram.meta.locale)}>${focusNodeTitle(bar.label, metadata)}`);
    // Never widen a short interval to fit its label. The full label stays in accessible
    // metadata/tooltip and the saved JSON. Adjacent intervals keep their actual endpoints.
    parts.push(`<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="24" rx="4" class="${css}" stroke-width="1" ${bar.role === 'wait' ? 'stroke-dasharray="4 3"' : ''} data-time-start="${bar.visibleStart}" data-time-end="${bar.visibleEnd}"/>`);
    const units = [...bar.label].reduce((sum, char) => sum + (char.codePointAt(0) < 128 ? 0.62 : 1), 0);
    if (units * 12 + 16 <= bar.width) parts.push(text(bar.x + 8, bar.y + 16, bar.label, 12));
    parts.push('</g>');
  }
  const markerGroups = [];
  [...report.markers].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)).forEach((marker, index) => {
    const description = `${marker.label}; ${marker.time} ms; source=${marker.source}; token=${marker.token ?? '?'}`;
    parts.push(`<g><title>${esc(description)}</title><line x1="${marker.x}" y1="103" x2="${marker.x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-dasharray="3 4"/></g>`);
    const last = markerGroups.at(-1);
    if (last && marker.x - last.x < 48) last.items.push(description);
    else markerGroups.push({ x: marker.x, first: index + 1, items: [description] });
  });
  for (const group of markerGroups) {
    const name = `M${group.first}${group.items.length > 1 ? '+' : ''}`;
    parts.push(`<g><title>${esc(group.items.join(' | '))}</title>${text(Math.min(1140, group.x), chartEnd + 24, name, 11)}</g>`);
  }
  parts.push(text(30, chartEnd + 62, label('Concurrency = distinct work lanes; detail/wait excluded', '并发 = 工作 lane 数；detail 和 wait 不重复计入'), 14));
  const metricLines = [`${label('Peak', '峰值')}: ${report.metrics.peakActiveLanes}`];
  for (const h of report.metrics.histogram) {
    const token = `${h.activeLanes} lanes: ${number(h.duration)} ms`;
    if (metricLines.at(-1).length + token.length > 110) metricLines.push(token);
    else metricLines[metricLines.length - 1] += ' | ' + token;
  }
  metricLines.forEach((line, index) => parts.push(text(30, chartEnd + 86 + index * 18, line, 13)));
  parts.push(text(30, chartEnd + 110 + (metricLines.length - 1) * 18, `${label('Completion links', '有来源的完成关系')}: ${report.dependencies.length} · ${label('listed in interval details; no inferred critical path', '详见区间详情；不推断关键路径')}`, 13));
  parts.push('</svg>');
  writeDiagram({ outPath, template, diagramType: 'timeline', meta: diagram.meta, svg: parts.join('\n'), cards: [] });
}

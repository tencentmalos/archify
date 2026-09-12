import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDiagram, writeDiagram, svgRootAttrs, svgAccessibleText, focusNodeAttrs, focusNodeTitle } from '../shared/cli.mjs';
import { esc } from '../shared/utils.mjs';
import { analyzeTimeline } from './model.mjs';
import { fitTimelineLabel, intervalText } from './labels.mjs';

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
  const width = report.viewBox[0], right = report.plot.right;
  const chartEnd = Math.max(...report.lanes.map(l => l.y + l.height));
  const parts = [`<svg viewBox="0 0 ${width} ${height}" ${svgRootAttrs(diagram.meta)} data-diagram-type="timeline">`, svgAccessibleText(diagram.meta, 'timeline')];
  const text = (x, y, value, size = 13, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" class="t-primary" ${extra}>${esc(value)}</text>`;
  const evidenceText = diagram.evidence_kind === 'synthetic'
    ? label('SYNTHETIC — model example, not a performance capture', '合成示例 — 不代表实测性能')
    : label('MEASURED — source declarations retained; verify the original evidence', '实测数据 — 保留来源声明，须核验原始证据');
  parts.push(text(30, 30, evidenceText, 16));
  parts.push(text(30, 57, label('Relative milliseconds · linear scale · hover/click intervals for exact identity', '相对毫秒 · 线性比例 · 悬停或点击查看精确身份'), 13));
  const phaseColor = diagram.meta.interval_color === 'label';
  const phaseStyles = ['c-backend', 'c-frontend', 'c-database', 'c-messagebus', 'c-cloud', 'c-security', 'c-external'];
  const phaseStyle = name => {
    let hash = 0; for (const c of name) hash = (hash * 31 + c.codePointAt(0)) >>> 0;
    return phaseStyles[hash % phaseStyles.length];
  };
  (phaseColor ? [['c-backend', label('phase color', '阶段颜色')], ['c-security', label('dashed = wait', '虚线 = 等待')]]
    : [['c-backend', label('work', '工作')], ['c-external', 'detail'], ['c-security', 'wait']]).forEach(([css, name], index) => {
    const x = right - 300 + index * (phaseColor ? 150 : 100);
    parts.push(`<rect x="${x}" y="43" width="18" height="14" class="${css}" ${phaseColor && index === 1 ? 'stroke-dasharray="4 3"' : ''}/>${text(x + 24, 55, name, 12)}`);
  });
  for (const [index, zone] of report.zones.entries()) {
    const color = ['frontend', 'backend', 'cloud'][index % 3];
    parts.push(`<g data-timeline-zone="${esc(zone.id)}"><title>${esc(zone.label)}; independently counted lanes</title>`);
    parts.push(`<rect x="20" y="${zone.y}" width="${width - 40}" height="${zone.height}" rx="9" fill="var(--${color}-fill)" stroke="var(--${color}-stroke)" stroke-width="1.4"/>`);
    parts.push(text(34, zone.y + 19, zone.label, 15, 'font-weight="600"'));
    parts.push('</g>');
  }
  for (const lane of report.lanes) {
    const top = lane.y - 8;
    parts.push(`<rect x="30" y="${top}" width="${right - 30}" height="${lane.height + 8}" rx="8" fill="var(--lane-fill)" stroke="var(--lane-stroke)" stroke-width="1.2"/>`);
    parts.push(`<rect x="30" y="${top}" width="190" height="${lane.height + 8}" rx="8" fill="var(--lane-header, var(--mask))" stroke="var(--lane-stroke)" stroke-width="1.2"/>`);
    parts.push(`<rect x="30" y="${top + 8}" width="3" height="${lane.height - 8}" rx="1.5" fill="var(--backend-stroke)"/>`);
  }
  for (let minor = 0; minor <= 30; minor++) {
    if (minor % 5 === 0) continue;
    const x = 240 + minor / 30 * (right - 240);
    parts.push(`<line x1="${x}" y1="100" x2="${x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-opacity="0.22" stroke-width="0.7" data-timeline-grid="minor"/>`);
  }
  for (let tick = 0; tick <= 6; tick++) {
    const x = 240 + tick / 6 * (right - 240);
    const time = diagram.window.start + tick / 6 * (diagram.window.end - diagram.window.start);
    parts.push(`<line x1="${x}" y1="100" x2="${x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-opacity="0.55" stroke-width="1.2" data-timeline-grid="major"/>`);
    parts.push(text(x, 92, `${Number(time.toFixed(2))} ms`, 12, `text-anchor="${tick === 6 ? 'end' : tick === 0 ? 'start' : 'middle'}"`));
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
    if (report.zones.length) {
      const observed = Number(report.metrics.laneBusy[lane.id].toFixed(1));
      const waiting = Number(report.metrics.laneWait[lane.id].toFixed(1));
      parts.push(text(42, lane.y + lane.height - 7, `P ${observed} / W ${waiting} ms`, 11));
    }
    parts.push(`<line x1="30" y1="${lane.y + lane.height}" x2="${right}" y2="${lane.y + lane.height}" stroke="var(--lane-stroke)"/>`);
  }
  for (const bar of report.bars) {
    const outgoing = report.dependencies.filter(e => e.from === bar.id).map(e => `${e.to}: ${e.label} [${e.source}]`).join('; ');
    const source = diagram.sources.find(s => s.id === bar.source);
    const metadata = { kind: bar.role, sublabel: `${bar.id} · ${bar.start}–${bar.end} ms (${bar.end - bar.start} ms)`,
      context: `${bar.lane}; ${bar.role}; source=${source.reference}; token=${bar.token ?? '?'}; frame=${bar.frame ?? '?'}; visible=${bar.visibleStart}–${bar.visibleEnd} ms${outgoing ? '; completion → ' + outgoing : ''}` };
    const css = phaseColor ? phaseStyle(bar.label) : bar.role === 'wait' ? 'c-security' : bar.role === 'detail' ? 'c-external' : 'c-backend';
    parts.push(`<g ${focusNodeAttrs(bar.id, bar.label, metadata, diagram.meta.locale)}>${focusNodeTitle(bar.label, metadata)}`);
    // Never widen a short interval to fit its label. The full label stays in accessible
    // metadata/tooltip and the saved JSON. Adjacent intervals keep their actual endpoints.
    parts.push(`<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="24" rx="4" class="${css}" stroke-width="1" ${bar.role === 'wait' ? 'stroke-dasharray="4 3"' : ''} data-time-start="${bar.visibleStart}" data-time-end="${bar.visibleEnd}"/>`);
    const visibleLabel = intervalText(bar);
    if (visibleLabel) parts.push(text(bar.x + 6, bar.y + 17, visibleLabel, 13, 'data-timeline-label="interval"'));
    else {
      // Free space after a short bar can carry its name without widening time.
      // Stop before the next bar on this exact row; no label crosses a neighbor.
      const nextX = Math.min(right, ...report.bars.filter(b => b.lane === bar.lane && b.y === bar.y && b.x >= bar.x + bar.width).map(b => b.x));
      const x = bar.x + bar.width + 6;
      const outside = fitTimelineLabel(bar.display_label || bar.label, nextX - x - 6);
      if (outside) {
        parts.push(`<line x1="${bar.x + bar.width}" y1="${bar.y + 12}" x2="${x - 2}" y2="${bar.y + 12}" stroke="var(--text-muted)"/>`);
        parts.push(text(x, bar.y + 17, outside, 13, 'data-timeline-label="outside"'));
      }
    }
    parts.push('</g>');
  }
  const markerGroups = [];
  [...report.markers].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)).forEach((marker, index) => {
    const description = `${marker.label}; ${marker.time} ms; source=${marker.source}; token=${marker.token ?? '?'}`;
    parts.push(`<g><title>${esc(description)}</title><line x1="${marker.x}" y1="103" x2="${marker.x}" y2="${chartEnd}" stroke="var(--text-muted)" stroke-dasharray="3 4"/></g>`);
    const last = markerGroups.at(-1);
    if (last && marker.x - last.x < 48) last.items.push(description);
    else markerGroups.push({ x: marker.x, first: index + 1, label: marker.label, items: [description] });
  });
  for (const [index, group] of markerGroups.entries()) {
    const available = (markerGroups[index + 1]?.x ?? right) - group.x - 8;
    const [name, duration] = group.label.split(' · ');
    if (available <= 0) continue;
    parts.push(`<g><title>${esc(group.items.join(' | '))}</title>${text(group.x, chartEnd + 28, fitTimelineLabel(name + (group.items.length > 1 ? ' +' : ''), available, 12), 12)}`);
    if (duration) parts.push(text(group.x, chartEnd + 44, fitTimelineLabel(duration, available, 12), 12));
    parts.push('</g>');
  }
  if (report.zones.length) {
    parts.push(text(30, chartEnd + 70, label('P = non-wait phase union; W = wait union on each lane. Nested/overlapping observations are not additive.', 'P = 各轨道非等待阶段并集；W = 等待并集。嵌套和重叠区间不可相加。'), 13));
    parts.push(text(30, chartEnd + 90, label('Zones counted separately; elapsed time includes scheduling. No CPU utilization or hardware GPU time. ≥ = clipped interval.', '各区域独立统计；经过时间包含调度。不是 CPU 利用率或硬件 GPU 时间。≥ 表示裁剪区间。'), 13));
    parts.push(text(30, chartEnd + 110, `${label('Proved completion links', '已证明的完成关系')}: ${report.dependencies.length} · ${label('Temporal overlap is not a dependency; full names and endpoints remain in focus.', '时间重叠不证明依赖；全名和端点保留在详情中。')}`, 13));
  } else {
  parts.push(text(30, chartEnd + 62, label('Concurrency = distinct work lanes; detail/wait excluded', '并发 = 工作 lane 数；detail 和 wait 不重复计入'), 14));
  const metricLines = [`${label('Peak', '峰值')}: ${report.metrics.peakActiveLanes}`];
  for (const h of report.metrics.histogram) {
    const token = `${h.activeLanes} lanes: ${number(h.duration)} ms`;
    if (metricLines.at(-1).length + token.length > 110) metricLines.push(token);
    else metricLines[metricLines.length - 1] += ' | ' + token;
  }
  metricLines.forEach((line, index) => parts.push(text(30, chartEnd + 86 + index * 18, line, 13)));
  parts.push(text(30, chartEnd + 110 + (metricLines.length - 1) * 18, `${label('Completion links', '有来源的完成关系')}: ${report.dependencies.length} · ${label('listed in interval details; no inferred critical path', '详见区间详情；不推断关键路径')}`, 13));
  }
  parts.push('</svg>');
  writeDiagram({ outPath, template, diagramType: 'timeline', meta: diagram.meta, svg: parts.join('\n'), cards: [] });
}

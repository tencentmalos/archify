import { textUnits } from '../shared/utils.mjs';

// The viewer uses a monospace font. Keep the authored font size and interval
// geometry; only abbreviate visible text. Full identity remains in focus/title.
export function fitTimelineLabel(value, width, size = 13) {
  const fits = text => textUnits(text) * size * 0.62 <= width;
  if (fits(value)) return value;
  const chars = Array.from(value);
  while (chars.length && !fits(chars.join('') + '…')) chars.pop();
  return chars.length >= 3 ? chars.join('') + '…' : '';
}

export function intervalText(bar) {
  const label = bar.display_label || bar.label;
  const width = bar.width - 12;
  const clipped = bar.visibleStart !== bar.start || bar.visibleEnd !== bar.end;
  const duration = `${clipped ? '≥' : ''}${Number((bar.visibleEnd - bar.visibleStart).toFixed(2))} ms`;
  const withDuration = `${label} · ${duration}`;
  return fitTimelineLabel(withDuration, width) === withDuration
    ? withDuration : fitTimelineLabel(label, width);
}

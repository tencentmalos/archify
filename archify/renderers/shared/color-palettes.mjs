// Primitive colors -> semantic tokens -> independent light/dark modes.
// Studio is Figma-inspired, not an official or exhaustive Figma token export.
export const PALETTES = {
  studio: {
    label: ['Studio · blue/violet', 'Studio · 蓝紫'],
    light: { bg: '#F6F8FC', panel: '#FFFFFF', text: '#172033', muted: '#48566B', border: '#B7C3D6', fill: '#EDF2FA', colors: ['#075EAD', '#116A50', '#6941A5', '#815309', '#AC2944', '#A14516', '#48566B'] },
    dark: { bg: '#111827', panel: '#192235', text: '#F4F7FF', muted: '#C3CEE1', border: '#566780', fill: '#24324A', colors: ['#8BC7FF', '#8CDDBB', '#CCADFF', '#F1D084', '#FFA9BC', '#FFC298', '#C3CEE1'] },
  },
  ocean: {
    label: ['Ocean · teal/blue', 'Ocean · 青蓝'],
    light: { bg: '#F0F8F8', panel: '#FCFFFF', text: '#16363C', muted: '#3D626A', border: '#A9C8CB', fill: '#E4F1F1', colors: ['#076478', '#17694F', '#4C5597', '#75550A', '#A5354B', '#965025', '#3D626A'] },
    dark: { bg: '#0E242B', panel: '#15323B', text: '#ECFAFC', muted: '#B5D5DD', border: '#547D87', fill: '#21444E', colors: ['#8CDDEB', '#9BDCC3', '#BABDFF', '#EBD196', '#FFB0BD', '#F7C49B', '#B5D5DD'] },
  },
  sunset: {
    label: ['Sunset · orange/plum', 'Sunset · 橙紫'],
    light: { bg: '#FBF5EF', panel: '#FFFCF8', text: '#392535', muted: '#695167', border: '#CAB3C2', fill: '#F5E9EF', colors: ['#974B13', '#41643C', '#76438F', '#785509', '#A02E4C', '#995216', '#695167'] },
    dark: { bg: '#281D2A', panel: '#362639', text: '#FFF3ED', muted: '#DEC3D6', border: '#806680', fill: '#49334A', colors: ['#FFCC9A', '#BCDEA3', '#DDB9FF', '#F2D59A', '#FFB5C7', '#FFD2A1', '#DEC3D6'] },
  },
  feishu: {
    label: ['Paper · brick red', '飞书纸白 · 朱红'],
    light: { bg: '#FAF7F0', panel: '#FAF7F0', text: '#2B2A27', muted: '#6E675D', border: '#B8AEA0', fill: '#F7E4DF', colors: ['#2B2A27', '#2B2A27', '#2B2A27', '#6E675D', '#B5432A', '#B5432A', '#6E675D'] },
    dark: { bg: '#201E1A', panel: '#2A2722', text: '#F7F0E5', muted: '#CFC4B5', border: '#817568', fill: '#3A302A', colors: ['#F7F0E5', '#F7F0E5', '#F7F0E5', '#CFC4B5', '#FFB29B', '#FFB29B', '#CFC4B5'] },
  },
};
export const COMPONENT_KINDS = ['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external'];
function blend(base, accent, amount) {
  const a = base.match(/[0-9a-f]{2}/gi), b = accent.match(/[0-9a-f]{2}/gi);
  return '#' + a.map((v, i) => Math.round(parseInt(v, 16) * (1 - amount) + parseInt(b[i], 16) * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function semanticTokens(mode) {
  const tokens = {
    bg: mode.bg, grid: mode.border, text: mode.text, 'text-muted': mode.muted,
    'text-dim': mode.muted, 'text-faint': mode.muted, panel: mode.panel,
    'panel-border': mode.border, 'lane-fill': blend(mode.panel, mode.colors[0], 0.035), 'lane-stroke': mode.border,
    'region-fill': blend(mode.panel, mode.colors[3], 0.045), 'region-header': blend(mode.panel, mode.colors[3], 0.08),
    'region-border': mode.border, 'lane-header': mode.fill,
    mask: mode.panel, arrow: mode.muted, 'arrow-emphasis': mode.colors[0],
    'toolbar-bg': mode.panel, 'toolbar-border': mode.border, 'toolbar-text': mode.text,
    'toolbar-hover': mode.fill, 'toolbar-menu-bg': mode.panel,
  };
  COMPONENT_KINDS.forEach((kind, index) => {
    tokens[`${kind}-fill`] = blend(mode.panel, mode.colors[index], 0.07);
    tokens[`${kind}-stroke`] = mode.colors[index];
  });
  return tokens;
}
export function paletteCss() {
  const declaration = mode => Object.entries(semanticTokens(mode)).map(([key, value]) => `--${key}: ${value};`).join(' ');
  return Object.entries(PALETTES).map(([name, palette]) => (
    ['light', 'dark'].map(mode => `[data-color-palette="${name}"][data-theme="${mode}"] { ${declaration(palette[mode])} }`).join('\n')
    + `\n@media print { [data-color-palette="${name}"][data-theme] { ${Object.entries(semanticTokens(palette.light)).map(([key, value]) => `--${key}: ${value} !important;`).join(' ')} } }`
  )).join('\n') + `
    /* Named palettes share a section/card hierarchy; layout and connectivity stay authored. */
    svg[data-color-palette]:not([data-color-palette="default"]) .c-region { fill: var(--region-fill); stroke: var(--region-border); stroke-width: 1.2; stroke-dasharray: none; }
    svg[data-color-palette]:not([data-color-palette="default"]) .c-security-group { fill: var(--security-fill); stroke: var(--security-stroke); stroke-width: 1.2; stroke-dasharray: 5 4; }
    svg[data-color-palette]:not([data-color-palette="default"]) [data-graph-role="structural-frame-label-mask"] { fill: var(--region-header); stroke: var(--region-border); stroke-width: 1; rx: 5px; }
    svg[data-color-palette]:not([data-color-palette="default"]) [data-node-id] > rect:not(.c-mask):not([data-time-start]) { rx: 8px; }
    .palette-control { display: grid; gap: 6px; padding: 10px 12px; color: var(--toolbar-text); font-size: 12px; }
    .palette-control select { width: 100%; background: var(--toolbar-bg); color: var(--toolbar-text); border: 1px solid var(--toolbar-border); padding: 7px; border-radius: 5px; font: inherit; }
  `;
}
export function paletteRuntime(locale) {
  const zh = locale === 'zh-CN';
  const names = { default: zh ? '原有风格配色' : 'Style default', ...Object.fromEntries(Object.entries(PALETTES).map(([key, p]) => [key, p.label[zh ? 1 : 0]])) };
  // Fixed bundled values only, never insert authored input into executable JavaScript.
  return `<script>
    Archify.palette = (function () {
      var names = ${JSON.stringify(names)};
      var root = document.documentElement;
      var svg = document.querySelector('.diagram-container svg');
      var menu = document.getElementById('preset-menu');
      var authored = root.getAttribute('data-color-palette') || 'default';
      var label = document.createElement('label');
      label.className = 'palette-control'; label.setAttribute('role', 'none');
      label.appendChild(document.createTextNode(${JSON.stringify(zh ? '配色（独立于布局风格）' : 'Palette (independent of style)')}));
      var select = document.createElement('select'); select.id = 'color-palette';
      select.setAttribute('aria-label', ${JSON.stringify(zh ? '配色方案' : 'Color palette')});
      Object.keys(names).forEach(function (name) { var option = document.createElement('option'); option.value = name; option.textContent = names[name]; select.appendChild(option); });
      label.appendChild(select); if (menu) menu.appendChild(label);
      function apply(name) {
        if (!Object.prototype.hasOwnProperty.call(names, name)) return false;
        if (root.getAttribute('data-embed') === 'true') return false;
        root.setAttribute('data-color-palette', name);
        if (svg) svg.setAttribute('data-color-palette', name);
        select.value = name;
        return true;
      }
      select.value = authored;
      if (svg) svg.setAttribute('data-color-palette', authored);
      select.addEventListener('change', function () { apply(select.value); });
      select.addEventListener('keydown', function (event) { if (event.key !== 'Escape') event.stopPropagation(); });
      return { apply: apply, current: function () { return root.getAttribute('data-color-palette') || 'default'; }, authored: authored };
    })();
  </script>`;
}

export function paletteRegistry() {
  return { schema: 'archify.color-palettes.v1', palettes: Object.fromEntries(Object.entries(PALETTES).map(([name, palette]) => [name, {
    label: palette.label,
    light: semanticTokens(palette.light),
    dark: semanticTokens(palette.dark),
  }])) };
}

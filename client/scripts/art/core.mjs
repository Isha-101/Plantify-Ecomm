// Tiny SVG drawing toolkit used by generate-art.mjs (original illustrations, no external assets).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
let counter = 0;
export const uid = (p = 'u') => `${p}${++counter}`;
export const f = (v) => Math.round(v * 10) / 10;

const toRgb = (hex) => { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const toHex = (r) => '#' + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#000000', t);

export const G = { deep: '#244C3A', mid: '#477A58', sage: '#A8BDA5', mint: '#E5F0E5', cream: '#F8F6EF', beige: '#EDE5D5', ink: '#24342B' };

// ---------- leaf shapes (base at origin, tip at (0,-L)) ----------
export const leafD = (L, W) => `M0 0C${f(-W * 0.8)} ${f(-L * 0.2)} ${f(-W * 0.7)} ${f(-L * 0.78)} 0 ${f(-L)}C${f(W * 0.7)} ${f(-L * 0.78)} ${f(W * 0.8)} ${f(-L * 0.2)} 0 0Z`;
export const ovalD = (L, W) => `M0 0C${f(-W)} ${f(-L * 0.12)} ${f(-W)} ${f(-L * 0.88)} 0 ${f(-L)}C${f(W)} ${f(-L * 0.88)} ${f(W)} ${f(-L * 0.12)} 0 0Z`;
export const heartD = (L, W) => `M0 0C${f(-W * 0.2)} ${f(L * 0.12)} ${f(-W)} ${f(L * 0.02)} ${f(-W * 0.92)} ${f(-L * 0.4)}C${f(-W * 0.8)} ${f(-L * 0.76)} ${f(-W * 0.2)} ${f(-L * 0.9)} 0 ${f(-L)}C${f(W * 0.2)} ${f(-L * 0.9)} ${f(W * 0.8)} ${f(-L * 0.76)} ${f(W * 0.92)} ${f(-L * 0.4)}C${f(W)} ${f(L * 0.02)} ${f(W * 0.2)} ${f(L * 0.12)} 0 0Z`;
export const fiddleD = (L, W) => `M0 0C${f(-W * 0.3)} ${f(-L * 0.08)} ${f(-W * 0.46)} ${f(-L * 0.3)} ${f(-W * 0.42)} ${f(-L * 0.46)}C${f(-W * 1.05)} ${f(-L * 0.62)} ${f(-W * 0.75)} ${f(-L * 1.02)} 0 ${f(-L)}C${f(W * 0.75)} ${f(-L * 1.02)} ${f(W * 1.05)} ${f(-L * 0.62)} ${f(W * 0.42)} ${f(-L * 0.46)}C${f(W * 0.46)} ${f(-L * 0.3)} ${f(W * 0.3)} ${f(-L * 0.08)} 0 0Z`;
const halfD = (L, W) => `M0 0C${f(W * 0.8)} ${f(-L * 0.2)} ${f(W * 0.7)} ${f(-L * 0.78)} 0 ${f(-L)}Z`;

/** A leaf with a lighter right half and a midrib. Angle 0 = pointing straight up, clockwise positive. */
export function leaf(x, y, a, L, W, color, o = {}) {
  const d = o.d || leafD(L, W);
  const vein = o.vein === false ? '' : `<path d="M0 -2L0 ${f(-L * 0.9)}" stroke="${o.veinColor || 'rgba(255,255,255,.38)'}" stroke-width="${f(Math.max(1, W * 0.07))}" stroke-linecap="round" fill="none"/>`;
  const edge = o.edge ? `<path d="${d}" fill="none" stroke="${o.edge}" stroke-width="${o.edgeW || 2}"/>` : '';
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="${d}" fill="${color}"/><path d="${halfD(L, W)}" fill="rgba(255,255,255,.13)"/>${o.extra || ''}${edge}${vein}</g>`;
}

export function quad(p0, p1, p2, t) {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { x, y, a: (Math.atan2(dx, -dy) * 180) / Math.PI };
}
export const stem = (p0, p1, p2, color, w = 4) => `<path d="M${f(p0[0])} ${f(p0[1])}Q${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

/** Place leaves along a quadratic stem. `make(point, i, side)` returns svg for one leaf. */
export function along(p0, p1, p2, n, make, { from = 0.2, to = 1, pairs = false } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? to : from + ((to - from) * i) / (n - 1);
    const pt = quad(p0, p1, p2, t);
    if (pairs) { out += make(pt, i, -1, t) + make(pt, i, 1, t); } else out += make(pt, i, i % 2 ? 1 : -1, t);
  }
  return out;
}

// ---------- pots ----------
export const POT_COLORS = {
  terracotta: ['#C9825E', '#B56E4C', '#DA9A78'],
  white: ['#F4F0E6', '#DDD6C5', '#FFFFFF'],
  sage: ['#93B196', '#7A9B7E', '#B2CBB3'],
  charcoal: ['#46504B', '#343D39', '#5B665F'],
  cream: ['#E8DCC3', '#D3C4A5', '#F3EBD8'],
  blue: ['#8EA7B0', '#778F98', '#AEC3CA'],
  blush: ['#DDAFA3', '#C99485', '#EBC8BE'],
  wood: ['#B58B5E', '#9C7348', '#CBA478'],
};
/** Pot drawn with the soil line at y=0 and body extending down to y=h. */
export function pot(style = 'terracotta', { w = 150, h = 110, shape = 'taper', saucer = true } = {}) {
  const [base, dark, light] = POT_COLORS[style] || POT_COLORS.terracotta;
  const rimH = Math.round(h * 0.17);
  const top = w / 2, bot = shape === 'cyl' ? w / 2 - 4 : w * 0.36;
  const bodyTop = rimH;
  const gid = uid('pg');
  const body = shape === 'round'
    ? `<path d="M${-top + 6} ${rimH}C${-top - 6} ${h * 0.55} ${-bot} ${h} 0 ${h}C${bot} ${h} ${top + 6} ${h * 0.55} ${top - 6} ${rimH}Z" fill="url(#${gid})"/>`
    : `<path d="M${-top + 7} ${bodyTop}L${-bot} ${h}Q0 ${h + 6} ${bot} ${h}L${top - 7} ${bodyTop}Z" fill="url(#${gid})"/>`;
  return `<defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".35" stop-color="${light}"/><stop offset=".6" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`
    + body
    + `<rect x="${-top}" y="0" width="${w}" height="${rimH}" rx="${rimH / 2.4}" fill="url(#${gid})"/>`
    + `<rect x="${-top + 8}" y="${rimH - 3}" width="${w - 16}" height="4" fill="rgba(0,0,0,.12)"/>`
    + (saucer ? `<ellipse cx="0" cy="${h + 4}" rx="${bot + 14}" ry="6" fill="${dark}"/><ellipse cx="0" cy="${h + 2}" rx="${bot + 14}" ry="5" fill="${base}"/>` : '');
}
export const soil = (w = 150) => `<ellipse cx="0" cy="3" rx="${w / 2 - 6}" ry="9" fill="#4A3426"/><ellipse cx="0" cy="2" rx="${w / 2 - 12}" ry="6" fill="#5B4231"/>`;

export const shadow = (w = 150, y = 0) => `<ellipse cx="0" cy="${y}" rx="${w * 0.62}" ry="${w * 0.1}" fill="rgba(36,52,43,.20)"/>`;

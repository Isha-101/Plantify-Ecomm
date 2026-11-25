import { rng, f, uid, leaf, leafD, ovalD, heartD, fiddleD, quad, stem, along, lighten, darken, mix, G } from './core.mjs';

// Every drawer returns { back, front, h, focus } in "soil-line" coordinates: y=0 is the soil, up is negative.
const P = (back, h, focus, front = '') => ({ back, front, h, focus });

function snake() {
  const blades = [[-92, 150, 34, -22], [-62, 205, 40, -14], [-30, 265, 44, -7], [2, 310, 46, 0], [34, 275, 44, 6], [66, 215, 40, 13], [94, 150, 34, 21]];
  let out = '';
  for (const [x, h, w, lean] of blades) {
    const id = uid('sn');
    const d = `M${x - w / 2} 6Q${x - w * 0.6 + lean * 0.5} ${-h * 0.55} ${x + lean} ${-h}Q${x + w * 0.6 + lean * 0.5} ${-h * 0.55} ${x + w / 2} 6Z`;
    let bands = '';
    for (let k = 1; k < 7; k++) bands += `<path d="M${x - w} ${-h * k / 7}q${w / 4} -7 ${w / 2} 0t${w / 2} 0t${w / 2} 0" stroke="#1d4d37" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    out += `<clipPath id="${id}"><path d="${d}"/></clipPath><path d="${d}" fill="#3C7B55"/><g clip-path="url(#${id})"><path d="M${x} 0L${x + lean} ${-h}" stroke="#5a9a6f" stroke-width="${w * 0.35}" opacity=".5"/>${bands}</g><path d="${d}" fill="none" stroke="#D3CF6A" stroke-width="4"/>`;
  }
  return P(out, 310, -170);
}

function zz() {
  let out = '';
  const stems = [[-70, -150, -190], [-40, -50, -240], [-10, -10, -285], [18, 14, -260], [46, 60, -225], [76, 120, -170], [-95, -190, -120]];
  for (const [x0, dx, h] of stems) {
    const p0 = [x0 * 0.4, 6], p1 = [x0 * 0.5 + dx * 0.25, h * 0.7], p2 = [x0 * 0.5 + dx * 0.6, h];
    out += stem(p0, p1, p2, '#6a8a52', 6);
    out += along(p0, p1, p2, 7, (pt, i, side, t) => leaf(pt.x, pt.y, pt.a + side * 62, 34 - t * 6, 15, i % 2 ? '#2E6B40' : '#357A48', { d: ovalD(34, 15), vein: false }), { from: 0.22, pairs: true });
  }
  return P(out, 290, -170);
}

function pothos() {
  let back = '', front = '';
  const stems = [[-60, -120, -120], [-25, -50, -190], [10, 10, -220], [40, 70, -170], [70, 130, -110]];
  for (const [x0, dx, h] of stems) {
    const p0 = [x0 * 0.5, 6], p1 = [x0 * 0.5 + dx * 0.3, h * 0.65], p2 = [x0 * 0.5 + dx * 0.7, h];
    back += stem(p0, p1, p2, '#5b8a45', 4);
    back += along(p0, p1, p2, 5, (pt, i, side) => pothosLeaf(pt.x, pt.y, side * 55 + pt.a * 0.5 + (i % 2 ? 10 : -10), 38 + (i % 3) * 4), { from: 0.25 });
  }
  const trails = [[-62, -20, 130], [58, 20, 150], [-20, -8, 105], [30, 12, 95]];
  for (const [x0, dx, len] of trails) {
    const p0 = [x0, 14], p1 = [x0 + dx * 1.4, 60], p2 = [x0 + dx, len];
    front += stem(p0, p1, p2, '#5b8a45', 4);
    front += along(p0, p1, p2, 5, (pt, i, side) => pothosLeaf(pt.x, pt.y, 180 + side * 50 + (pt.a > 90 ? 0 : 0), 30), { from: 0.2 });
  }
  return P(back, 230, -140, front);
}
function pothosLeaf(x, y, a, L) {
  const W = L * 0.62;
  const splash = `<ellipse cx="${-W * 0.25}" cy="${-L * 0.45}" rx="${W * 0.3}" ry="${L * 0.16}" fill="#E1DE82" opacity=".85" transform="rotate(-25 ${-W * 0.25} ${-L * 0.45})"/><ellipse cx="${W * 0.3}" cy="${-L * 0.65}" rx="${W * 0.2}" ry="${L * 0.1}" fill="#E1DE82" opacity=".8"/>`;
  return leaf(x, y, a, L, W, '#4F9A4C', { d: heartD(L, W), extra: splash });
}

function peaceLily() {
  let out = '';
  const ls = [[-78, 150], [-58, 175], [-36, 195], [-14, 205], [8, 205], [30, 195], [52, 175], [74, 150], [-95, 110], [95, 110]];
  ls.forEach(([a, L], i) => { out += leaf(a * 0.35, 6, a * 0.7, L, 30, i % 2 ? '#2D6A45' : '#357650'); });
  const fl = [[-30, 250, -8], [32, 280, 8], [0, 225, 0]];
  for (const [x, h, a] of fl) {
    out += stem([x * 0.3, 0], [x * 0.5, -h * 0.5], [x, -h], '#4F8A55', 4);
    out += `<g transform="translate(${x} ${-h}) rotate(${a})"><path d="${leafD(70, 28)}" fill="#FBFBF6"/><path d="M0 0C14 -20 18 -45 0 -70Z" fill="rgba(0,0,0,.05)"/><rect x="-4" y="-34" width="8" height="30" rx="4" fill="#F1E6A8"/></g>`;
  }
  return P(out, 280, -150);
}

function monstera() {
  let out = '';
  const defs = [[-120, -150, 120, 98], [-55, -215, 130, 108], [20, -270, 135, 112], [90, -205, 125, 104], [135, -125, 112, 92]];
  for (const [x, y, L, W] of defs) {
    const p0 = [x * 0.15, 6], p1 = [x * 0.3, y * 0.6], p2 = [x * 0.62, y * 0.88];
    out += stem(p0, p1, p2, '#4a7a4f', 5);
    const pt = quad(p0, p1, p2, 1);
    const id = uid('ms');
    let cuts = '';
    for (let k = 1; k <= 4; k++) for (const s of [-1, 1]) cuts += `<path d="M${s * W * 1.05} ${-L * (0.1 + k * 0.16)}L${s * W * 0.32} ${-L * (0.2 + k * 0.14)}" stroke="#000" stroke-width="${k < 3 ? 9 : 7}" stroke-linecap="round"/>`;
    out += `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-300" width="400" height="400"><rect x="-200" y="-300" width="400" height="400" fill="#fff"/>${cuts}<ellipse cx="${-W * 0.35}" cy="${-L * 0.4}" rx="6" ry="9" fill="#000"/><ellipse cx="${W * 0.35}" cy="${-L * 0.55}" rx="6" ry="9" fill="#000"/></mask>`;
    out += `<g transform="translate(${f(p2[0])} ${f(p2[1])}) rotate(${f(pt.a * 0.4 + (x < 0 ? -18 : 18))})" mask="url(#${id})"><path d="${heartD(L, W)}" fill="#2C6446"/><path d="M0 0C${W} ${-L * 0.1} ${W * 0.9} ${-L * 0.8} 0 ${-L}Z" fill="rgba(255,255,255,.13)"/><path d="M0 0L0 ${-L * 0.92}" stroke="rgba(255,255,255,.35)" stroke-width="3"/></g>`;
  }
  return P(out, 300, -170);
}

function rubber() {
  let out = `<path d="M-5 6L-3 -250L5 -250L7 6Z" fill="#7A6A4F"/>`;
  const ls = [[-1, 30, 120, 62, 52], [1, 70, 125, 66, 56], [-1, 110, 120, 62, 56], [1, 150, 108, 58, 58], [-1, 190, 96, 54, 56], [1, 225, 80, 46, 50]];
  for (const [side, y, L, W, a] of ls) out += leaf(side * 4, -y, side * a, L, W, '#27503A', { d: ovalD(L, W), veinColor: 'rgba(230,160,160,.8)' });
  out += `<path d="${leafD(60, 14)}" transform="translate(0 -250)" fill="#B5473F"/>`;
  return P(out, 300, -160);
}

function spider() {
  let back = '', front = '';
  const arcs = [[-1, 150, 110], [-1, 125, 70], [-1, 105, 20], [-1, 80, -30], [1, 150, 105], [1, 125, 60], [1, 100, 10], [1, 75, -35], [-1, 60, -90], [1, 55, -90]];
  arcs.forEach(([s, w, h], i) => {
    const p0 = [0, 4], p1 = [s * w * 0.35, -h - 60], p2 = [s * w * 1.1, -h * 0.1 + 60];
    const col = i % 2 ? '#78A862' : '#6A9C58';
    back += `<path d="M${p0}Q${p1} ${p2}" fill="none" stroke="${col}" stroke-width="15" stroke-linecap="round"/><path d="M${p0}Q${p1} ${p2}" fill="none" stroke="#EFF3C8" stroke-width="4" stroke-linecap="round"/>`;
  });
  const babies = [[-95, 60], [95, 70]];
  for (const [x, y] of babies) {
    front += `<path d="M${x * 0.4} -50Q${x * 0.8} -90 ${x} ${y}" stroke="#7a9a5a" stroke-width="2.5" fill="none"/>`;
    for (let k = -2; k <= 2; k++) front += leaf(x, y, k * 28, 36, 5, '#78A862', { vein: false });
  }
  return P(back, 190, -90, front);
}

function frond(p0, p1, p2, n, leafL, leafW, color, stemColor, angle = 60, taper = 0.35) {
  let out = stem(p0, p1, p2, stemColor, 4);
  out += along(p0, p1, p2, n, (pt, i, side, t) => leaf(pt.x, pt.y, pt.a + side * angle, leafL * (1 - t * taper), leafW, color, { vein: false }), { from: 0.15, pairs: true });
  return out;
}
function areca() {
  let out = '';
  const fr = [[-150, -170], [-110, -250], [-60, -300], [-10, -320], [45, -300], [100, -250], [150, -170], [-170, -80], [170, -80]];
  fr.forEach(([x, h], i) => out += frond([x * 0.08, 6], [x * 0.3, h * 0.8], [x * 0.95, h * 0.55 + (x < 0 ? 30 : 30) * (Math.abs(x) > 100 ? 1.6 : 0.4)], 15, 52, 7, i % 2 ? '#6FAF54' : '#82BD5C', '#9CAF5A', 62));
  return P(out, 320, -170);
}
function fern() {
  let out = '';
  const fr = [[-190, -60], [-150, -140], [-100, -200], [-45, -240], [10, -250], [60, -235], [110, -195], [155, -135], [195, -55], [-60, -90]];
  fr.forEach(([x, h], i) => out += frond([x * 0.06, 6], [x * 0.35, h * 1.05], [x * 0.95, h * 0.5 + Math.abs(x) * 0.25], 18, 40, 7, i % 2 ? '#4F9A4B' : '#5BA656', '#6c9a50', 68, 0.55));
  return P(out, 250, -130);
}

function aglaonema() {
  let out = '';
  const ls = [[-70, 120, 46, 8], [-45, 150, 48, 4], [-22, 170, 50, 2], [0, 175, 52, 0], [22, 165, 50, -2], [46, 145, 48, -4], [70, 115, 46, -8], [-100, 85, 40, 10], [100, 85, 40, -10]];
  ls.forEach(([a, L, W], i) => {
    const pink = `<path d="${leafD(L * 0.78, W * 0.52)}" transform="translate(0 -${L * 0.12})" fill="#E58AA0" opacity=".85"/><path d="${leafD(L * 0.5, W * 0.3)}" transform="translate(0 -${L * 0.2})" fill="#F3B2C0" opacity=".8"/>`;
    out += leaf(a * 0.3, 6, a * 0.78, L, W, '#35634A', { extra: pink, veinColor: 'rgba(255,255,255,.5)' });
  });
  return P(out, 180, -100);
}

function luckyBamboo() {
  let out = '';
  const st = [[-34, 230, -4], [4, 285, 0], [38, 200, 5]];
  for (const [x, h, lean] of st) {
    out += `<path d="M${x} 90L${x + lean} ${-h}" stroke="#86B65A" stroke-width="13" stroke-linecap="round"/><path d="M${x + 3} 90L${x + lean + 3} ${-h}" stroke="rgba(255,255,255,.25)" stroke-width="3"/>`;
    for (let k = 0; k < 4; k++) out += `<rect x="${x - 8 + lean * (k / 4)}" y="${-h * (0.15 + k * 0.22)}" width="16" height="5" rx="2" fill="#5E8E3E"/>`;
    for (const a of [-55, -25, 25, 55]) out += leaf(x + lean, -h + 6, a, 70, 12, '#5FA24A');
    out += leaf(x + lean, -h + 6, 0, 56, 10, '#6FB458');
  }
  return P(out, 290, -150);
}

function fiddle() {
  let out = `<path d="M-6 6L-4 -260L4 -260L6 6Z" fill="#7C6A4C"/>`;
  const ls = [[-1, 40, 112, 66, 55], [1, 80, 116, 68, 58], [-1, 122, 112, 66, 52], [1, 165, 104, 62, 52], [-1, 205, 94, 56, 48], [1, 240, 82, 48, 44], [-1, 265, 62, 38, 28]];
  for (const [s, y, L, W, a] of ls) out += leaf(s * 4, -y, s * a, L, W, '#3C7C46', { d: fiddleD(L, W), veinColor: 'rgba(255,255,255,.45)' });
  return P(out, 320, -190);
}

function calathea() {
  let out = '';
  const ls = [[-110, 80, 58], [-70, 140, 66], [-30, 190, 70], [20, 200, 72], [65, 150, 66], [105, 85, 58], [-5, 120, 62]];
  ls.forEach(([x, h, W], i) => {
    const L = W * 1.5;
    const p0 = [x * 0.1, 6], p1 = [x * 0.35, -h * 0.5], p2 = [x * 0.6, -h];
    out += stem(p0, p1, p2, '#6C8F58', 4);
    let stripes = '';
    for (let k = 1; k < 5; k++) for (const s of [-1, 1]) stripes += `<path d="M0 ${-L * 0.15 * k}Q${s * W * 0.45} ${-L * 0.15 * k - L * 0.1} ${s * W * 0.8} ${-L * 0.15 * k - L * 0.26}" stroke="#D5E8C8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>`;
    const pt = quad(p0, p1, p2, 1);
    out += leaf(p2[0], p2[1], pt.a * 0.5 + (x < 0 ? -14 : 14), L, W, i % 2 ? '#6EA070' : '#5E9264', { d: ovalD(L, W), extra: stripes, veinColor: '#EAF5DE' });
  });
  return P(out, 260, -150);
}

function peperomia() {
  let out = '';
  for (let i = 0; i < 13; i++) {
    const a = -80 + i * 13.3, h = 70 + (i % 4) * 22;
    const x = Math.sin((a * Math.PI) / 180) * (h * 0.9), y = -Math.cos((a * Math.PI) / 180) * h;
    out += stem([x * 0.1, 6], [x * 0.4, y * 0.5], [x, y], '#B5605A', 3);
    let stripes = '';
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) stripes += `<path d="M0 ${-34}Q${s * 14} ${-30 + k * 4} ${s * 20 * (1 - k * 0.1)} ${-8 - k * 8}" stroke="#2F6B4B" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
    out += leaf(x, y, a * 0.7, 52, 34, '#9CBFA0', { d: ovalD(52, 34), extra: stripes, vein: false });
  }
  return P(out, 160, -90);
}

function aloe() {
  let out = '';
  const ls = [-72, -50, -28, -10, 10, 28, 50, 72, -88, 88];
  ls.forEach((a, i) => {
    const L = 150 + (10 - Math.abs(a) / 6) * 1.5, W = 30;
    let sp = '';
    for (let k = 0; k < 7; k++) sp += `<ellipse cx="${(k % 2 ? 1 : -1) * 6}" cy="${-20 - k * 17}" rx="3" ry="1.8" fill="#E5F0D8" opacity=".75"/>`;
    out += leaf(a * 0.25, 6, a, L, W, i % 2 ? '#6BAE78' : '#5CA06C', { extra: sp, vein: false, edge: '#4a8a5a', edgeW: 1.5 });
  });
  return P(out, 190, -100);
}

function jade() {
  let out = `<path d="M-8 6L-10 -70L-4 -90L-18 -130" stroke="#8B6B4E" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M-4 -90L26 -130" stroke="#8B6B4E" stroke-width="11" stroke-linecap="round"/><path d="M-10 -70L40 -100L62 -135" stroke="#8B6B4E" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M-12 -60L-50 -95L-62 -130" stroke="#8B6B4E" stroke-width="9" stroke-linecap="round" fill="none"/>`;
  const r = rng(11);
  const tips = [[-18, -130], [26, -130], [62, -135], [-62, -130], [-40, -150], [4, -160], [44, -165], [-8, -115], [-48, -100], [40, -108]];
  for (const [x, y] of tips) for (let k = 0; k < 9; k++) {
    const a = -90 + k * 22.5 + (r() - 0.5) * 12;
    out += leaf(x, y, a, 34, 17, k % 3 === 0 ? '#58A06C' : '#4C9462', { d: ovalD(34, 17), vein: false, edge: k % 4 === 0 ? '#C0675E' : undefined, edgeW: 2 });
  }
  return P(out, 190, -110);
}

function rosette(rings, colors, tipColor, W = 30, Lmax = 70) {
  let out = '';
  rings.forEach(([n, spread, L, lift], ri) => {
    for (let i = 0; i < n; i++) {
      const a = -spread + (i * 2 * spread) / (n - 1);
      const col = colors[ri % colors.length];
      const tip = tipColor ? `<path d="${leafD(L, W)}" fill="${tipColor}" opacity=".0"/><ellipse cx="0" cy="${-L * 0.92}" rx="${W * 0.28}" ry="${L * 0.1}" fill="${tipColor}"/>` : '';
      out += leaf(a * 0.35, -lift, a, L, W * (1 - ri * 0.12), col, { d: ovalD(L, W * (1 - ri * 0.12)), extra: tip, vein: false });
    }
  });
  return out;
}
const echeveria = () => P(rosette([[7, 85, 62, 0], [6, 62, 58, 14], [5, 42, 52, 26], [3, 20, 44, 36]], ['#9DB8B2', '#A9C4BC', '#B7CEC4', '#C5D9CD'], '#D9A0A8', 28), 100, -50);

function haworthia() {
  let out = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = -60 + (i * 120) / (n - 1), L = 92 - Math.abs(a) * 0.25;
    let bars = '';
    for (let k = 0; k < 5; k++) bars += `<path d="M-9 ${-14 - k * 15}h18" stroke="#E8F0E4" stroke-width="3" stroke-linecap="round" opacity=".85"/>`;
    out += leaf(a * 0.2, 4, a, L, 22, i % 2 ? '#2F6B45' : '#3A7A50', { extra: bars, vein: false });
  }
  return P(out, 100, -55);
}

function burrosTail() {
  let back = '', front = '';
  const r = rng(5);
  const strands = [[-70, -26, 100], [-40, -16, 120], [-10, -4, 135], [20, 10, 110], [50, 20, 125], [78, 30, 98]];
  strands.forEach(([x, dx, len]) => {
    const p0 = [x * 0.5, 4], p1 = [x * 0.9 + dx * 0.5, -22], p2 = [x * 1.25 + dx, 34];
    back += stem(p0, p1, p2, '#7aa07a', 3);
    for (let k = 0; k < 7; k++) { const pt = quad(p0, p1, p2, 0.2 + k * 0.13); back += leaf(pt.x, pt.y, pt.a + (k % 2 ? 80 : -80), 15, 7, '#8DB58A', { d: ovalD(15, 7), vein: false }); }
    const q0 = [x * 1.25 + dx, 34], q1 = [x * 1.35 + dx, 70], q2 = [x * 1.3 + dx + (r() - 0.5) * 10, len];
    front += stem(q0, q1, q2, '#7aa07a', 3);
    for (let k = 0; k < 11; k++) { const pt = quad(q0, q1, q2, 0.05 + k * 0.09); front += `<ellipse cx="${f(pt.x - 4)}" cy="${f(pt.y)}" rx="6" ry="9" fill="${k % 2 ? '#8DB58A' : '#9CC598'}"/><ellipse cx="${f(pt.x + 4)}" cy="${f(pt.y + 5)}" rx="6" ry="9" fill="${k % 2 ? '#9CC598' : '#8DB58A'}"/>`; }
  });
  return P(back, 60, -10, front);
}

function bunnyEars() {
  const paddle = (x, y, a, rx, ry) => {
    const id = uid('bc');
    let dots = '';
    for (let i = -3; i <= 3; i++) for (let j = -4; j <= 4; j++) dots += `<circle cx="${i * 16 + (j % 2) * 8}" cy="${j * 15}" r="2.2" fill="#3F5F36"/><circle cx="${i * 16 + (j % 2) * 8}" cy="${j * 15 - 4}" r="1.6" fill="#F4F1E4"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${a})"><clipPath id="${id}"><ellipse rx="${rx}" ry="${ry}"/></clipPath><ellipse rx="${rx}" ry="${ry}" fill="#7DAD6E"/><g clip-path="url(#${id})">${dots}</g><ellipse rx="${rx}" ry="${ry}" fill="none" stroke="#5E8E52" stroke-width="3"/></g>`;
  };
  return P(paddle(0, -62, 0, 52, 66) + paddle(-34, -150, -22, 38, 54) + paddle(36, -146, 24, 40, 56) + paddle(-52, -205, -30, 26, 38), 240, -120);
}

function orchidFlower(x, y, s, lip = '#C0488F') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-20" cy="-8" rx="23" ry="17" transform="rotate(-18 -20 -8)" fill="#FCF6FA"/><ellipse cx="20" cy="-8" rx="23" ry="17" transform="rotate(18 20 -8)" fill="#FCF6FA"/><ellipse cx="-10" cy="12" rx="12" ry="18" transform="rotate(32 -10 12)" fill="#F7EAF2"/><ellipse cx="10" cy="12" rx="12" ry="18" transform="rotate(-32 10 12)" fill="#F7EAF2"/><ellipse cx="0" cy="14" rx="7" ry="11" fill="${lip}"/><circle cx="0" cy="-2" r="5" fill="#F1D26E"/></g>`;
}
function orchid() {
  let out = '';
  const ls = [[-80, 120], [-40, 112], [40, 112], [80, 120]];
  ls.forEach(([a, L], i) => { out += leaf(a * 0.1, 6, a * 0.85, L, 36, i % 2 ? '#2D7048' : '#35804F', { d: ovalD(L, 34) }); });
  const p0 = [8, 0], p1 = [30, -230], p2 = [110, -270];
  out += stem(p0, p1, p2, '#7B8F4F', 4);
  out += `<path d="M12 0L12 -190" stroke="#B8A27A" stroke-width="2" opacity=".7"/>`;
  [0.35, 0.5, 0.65, 0.82, 1].forEach((t, i) => { const pt = quad(p0, p1, p2, t); out += orchidFlower(pt.x, pt.y + 2, 1.15 - i * 0.12); });
  return P(out, 290, -170);
}

function africanViolet() {
  let out = '';
  const ring = [[-70, 8, -18], [-40, 22, 4], [0, 28, 16], [40, 22, 4], [70, 8, -18], [-20, 16, -4], [20, 16, -4]];
  ring.forEach(([x, y, a]) => { out += `<ellipse cx="${x}" cy="${-8 - y * 0.6}" rx="${x === 0 ? 38 : 32}" ry="19" transform="rotate(${a} ${x} ${-8 - y * 0.6})" fill="#3F7A4A"/><ellipse cx="${x}" cy="${-10 - y * 0.6}" rx="${(x === 0 ? 38 : 32) - 6}" ry="13" transform="rotate(${a} ${x} ${-10 - y * 0.6})" fill="#4E8D58" opacity=".7"/>`; });
  const flowers = [[-30, -52], [0, -66], [30, -52], [-12, -44], [14, -42], [-48, -34], [48, -34]];
  flowers.forEach(([x, y], i) => { out += `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-9" rx="7" ry="10" transform="rotate(${a})" fill="${i % 2 ? '#8A5CB4' : '#7B4FA2'}"/>`).join('')}<circle r="3.4" fill="#F1D26E"/></g>`; });
  return P(out, 80, -40);
}

function anthurium() {
  let out = '';
  const ls = [[-90, 110, 52, -30], [-45, 150, 58, -12], [0, 160, 60, 0], [45, 145, 56, 12], [88, 105, 50, 30]];
  ls.forEach(([x, h, W, a]) => { const p0 = [x * 0.1, 6], p1 = [x * 0.4, -h * 0.5], p2 = [x * 0.7, -h * 0.9]; out += stem(p0, p1, p2, '#5f8a52', 5); out += leaf(p2[0], p2[1], a * 1.6, W * 1.6, W, '#276842', { d: heartD(W * 1.6, W), veinColor: 'rgba(255,255,255,.4)' }); });
  [[-40, 230, -10], [18, 262, 8], [64, 215, 16]].forEach(([x, h, a]) => {
    out += stem([x * 0.3, 0], [x * 0.4, -h * 0.6], [x, -h], '#6a9a5a', 3);
    out += `<g transform="translate(${x} ${-h}) rotate(${a})"><path d="${heartD(58, 40)}" transform="rotate(180) translate(0 58)" fill="#D32F42"/><path d="${heartD(58, 40)}" transform="rotate(180) translate(0 58)" fill="rgba(255,255,255,.14)" clip-path="inset(0 0 0 50%)"/><path d="M0 -4Q10 -22 6 -44" stroke="#F3E3A0" stroke-width="7" stroke-linecap="round" fill="none"/></g>`;
  });
  return P(out, 280, -150);
}

// ----- generic bush: branches fanning from the base with leaves and optional flowers -----
const flowerFns = {
  jasmine: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-8" rx="4.5" ry="9" transform="rotate(${a})" fill="#fff" stroke="#E7E1CF" stroke-width=".8"/>`).join('')}<circle r="2.6" fill="#F4D96E"/></g>`,
  rose: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="19" fill="#D9557A"/><circle r="14" fill="#E5708B"/><path d="M-10 0a10 10 0 0 1 20 0a7 7 0 0 1-14 2a4 4 0 0 1 8-3" fill="none" stroke="#B83A63" stroke-width="2.5" stroke-linecap="round"/><circle r="4" fill="#B83A63"/></g>`,
  hibiscus: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-20" rx="17" ry="22" transform="rotate(${a})" fill="#E23B4E" opacity=".95"/>`).join('')}<circle r="7" fill="#A3122A"/><path d="M0 0L18 -22" stroke="#F4D96E" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="-22" r="3.5" fill="#F4D96E"/></g>`,
  bract: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[-40, 0, 40].map((a, i) => `<path d="${leafD(26, 15)}" transform="rotate(${a})" fill="${i === 1 ? '#E0408D' : '#CF2E7F'}"/>`).join('')}<circle r="3" fill="#FFF4D0"/></g>`,
  tulsi: (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0L0 -38" stroke="#6d5a8a" stroke-width="2"/>${[0, 1, 2, 3, 4].map((k) => `<ellipse cx="-5" cy="${-8 - k * 7}" rx="4" ry="2.4" fill="#9B83C4"/><ellipse cx="5" cy="${-11 - k * 7}" rx="4" ry="2.4" fill="#B29CD6"/>`).join('')}</g>`,
};
function bush({ leafColors, L, W, shape = 'oval', branches = 9, height = 220, spread = 150, n = 6, flower, nFlowers = 4, stemColor = '#6b8a50', flowerScale = 1, leafAngle = 58, seed = 3 }) {
  const r = rng(seed);
  let out = '', flowers = '';
  for (let i = 0; i < branches; i++) {
    const side = (i / (branches - 1)) * 2 - 1;
    const h = height * (0.55 + 0.45 * (1 - Math.abs(side) * 0.7)) * (0.9 + r() * 0.2);
    const p0 = [side * 10, 6], p1 = [side * spread * 0.35, -h * 0.55], p2 = [side * spread * 0.62, -h];
    out += stem(p0, p1, p2, stemColor, 4);
    out += along(p0, p1, p2, n, (pt, k, s) => {
      const col = leafColors[(i + k) % leafColors.length];
      const d = shape === 'heart' ? heartD(L, W) : shape === 'pointed' ? leafD(L, W) : ovalD(L, W);
      return leaf(pt.x, pt.y, pt.a + s * (leafAngle + r() * 14), L * (0.85 + r() * 0.3), W, col, { d: shape === 'oval' ? ovalD(L, W) : d, vein: false });
    }, { from: 0.18, pairs: true });
    out += leaf(p2[0], p2[1], (Math.atan2(p2[0] - p1[0], -(p2[1] - p1[1])) * 180) / Math.PI, L * 0.8, W, leafColors[0], { d: ovalD(L, W), vein: false });
    if (flower && i % Math.max(1, Math.round(branches / nFlowers)) === 0) flowers += flowerFns[flower](p2[0] + side * 4, p2[1] - 4, flowerScale);
  }
  if (flower === 'rose') flowers += flowerFns.rose(-34, -height * 0.55, 0.8) + flowerFns.rose(40, -height * 0.5, 0.75);
  if (flower === 'jasmine') for (let i = 0; i < 9; i++) flowers += flowerFns.jasmine(-60 + r() * 120, -40 - r() * (height - 60), 1);
  if (flower === 'bract') for (let i = 0; i < 8; i++) flowers += flowerFns.bract(-70 + r() * 140, -50 - r() * (height - 60), 0.9);
  return P(out + flowers, height + 20, -height * 0.55);
}

const tulsi = () => bush({ leafColors: ['#5F9A4C', '#6BA656', '#53914A'], L: 34, W: 17, branches: 9, height: 230, spread: 130, n: 6, flower: 'tulsi', nFlowers: 5, stemColor: '#7a6a8a' });
const currLeaf = () => {
  let out = '';
  const br = [[-120, -150], [-70, -230], [-20, -270], [35, -250], [90, -210], [135, -140]];
  br.forEach(([x, h], i) => out += frond([x * 0.06, 6], [x * 0.3, h * 0.8], [x * 0.85, h * 0.9 + 15], 11, 36, 12, i % 2 ? '#2F6B3E' : '#3A7A48', '#6b7a45', 58, 0.3));
  return P(out, 290, -160);
};
const mint = () => bush({ leafColors: ['#4F9A52', '#5AA85C', '#449048'], L: 36, W: 25, branches: 11, height: 150, spread: 120, n: 5, stemColor: '#7aa060', leafAngle: 70, seed: 9 });
const basil = () => bush({ leafColors: ['#3E8E45', '#4A9C4F', '#368040'], L: 58, W: 34, branches: 7, height: 200, spread: 105, n: 4, stemColor: '#6a9a50', leafAngle: 50, seed: 4 });
const jasmine = () => bush({ leafColors: ['#3F7A4F', '#4A8A58'], L: 30, W: 15, branches: 9, height: 230, spread: 140, n: 6, flower: 'jasmine', stemColor: '#5f7a4a', seed: 6 });
const rose = () => bush({ leafColors: ['#3A6B45', '#467A50'], L: 38, W: 19, branches: 7, height: 200, spread: 110, n: 4, flower: 'rose', nFlowers: 3, stemColor: '#6a5a3e', seed: 7 });
const hibiscus = () => bush({ leafColors: ['#2E7040', '#37804A'], L: 52, W: 28, branches: 7, height: 250, spread: 130, n: 4, flower: 'hibiscus', nFlowers: 3, flowerScale: 1.25, stemColor: '#6b5a3e', seed: 8 });
const bougainvillea = () => bush({ leafColors: ['#4C8F4E', '#59A058'], L: 30, W: 16, branches: 9, height: 240, spread: 160, n: 6, flower: 'bract', nFlowers: 6, stemColor: '#7a5a3e', seed: 12 });

function lavender() {
  let out = '';
  for (let i = 0; i < 13; i++) {
    const side = (i / 12) * 2 - 1, h = 200 + (i % 3) * 25 - Math.abs(side) * 40, x = side * 85;
    out += `<path d="M${side * 8} 6Q${x * 0.5} ${-h * 0.5} ${x} ${-h}" stroke="#7d9a6a" stroke-width="2.5" fill="none"/>`;
    for (let k = 0; k < 5; k++) { const y = -h + k * 12; out += `<ellipse cx="${x - 5}" cy="${y}" rx="5" ry="8" fill="#8A6DB8"/><ellipse cx="${x + 5}" cy="${y + 4}" rx="5" ry="8" fill="#9C82C6"/>`; }
    out += `<ellipse cx="${x}" cy="${-h - 10}" rx="4.5" ry="8" fill="#7A5CAA"/>`;
  }
  for (let i = 0; i < 12; i++) out += leaf(0, 6, -75 + i * 13.6, 90 + (i % 3) * 14, 6, '#8FA88A', { vein: false });
  return P(out, 260, -150);
}

export const PLANT_ART = {
  'snake-plant': snake, 'zz-plant': zz, 'golden-pothos': pothos, 'peace-lily': peaceLily, 'monstera-deliciosa': monstera,
  'rubber-plant': rubber, 'spider-plant': spider, 'areca-palm': areca, 'boston-fern': fern, 'chinese-evergreen': aglaonema,
  'lucky-bamboo': luckyBamboo, 'fiddle-leaf-fig': fiddle, 'calathea-orbifolia': calathea, 'peperomia-watermelon': peperomia,
  'aloe-vera': aloe, 'jade-plant': jade, 'echeveria-elegans': echeveria, 'haworthia-zebra': haworthia, 'burros-tail': burrosTail,
  'bunny-ear-cactus': bunnyEars, 'phalaenopsis-orchid': orchid, 'african-violet': africanViolet, 'anthurium-red': anthurium,
  'jasmine-mogra': jasmine, 'miniature-rose': rose, 'tulsi-holy-basil': tulsi, 'curry-leaf-plant': currLeaf, 'mint-pudina': mint,
  'basil-sweet': basil, lavender, hibiscus, bougainvillea,
};

/** Pot style / size per plant so the catalogue looks varied. */
export const PLANT_POTS = {
  'snake-plant': ['charcoal', 150, 110, 'taper'], 'zz-plant': ['white', 140, 100, 'taper'], 'golden-pothos': ['terracotta', 140, 95, 'taper'],
  'peace-lily': ['cream', 150, 105, 'round'], 'monstera-deliciosa': ['white', 170, 120, 'taper'], 'rubber-plant': ['blue', 150, 110, 'taper'],
  'spider-plant': ['sage', 140, 95, 'round'], 'areca-palm': ['terracotta', 170, 120, 'taper'], 'boston-fern': ['cream', 150, 100, 'round'],
  'chinese-evergreen': ['blush', 140, 100, 'taper'], 'lucky-bamboo': ['vase', 120, 130, 'vase'], 'fiddle-leaf-fig': ['white', 170, 125, 'taper'],
  'calathea-orbifolia': ['sage', 150, 105, 'round'], 'peperomia-watermelon': ['blush', 130, 90, 'round'], 'aloe-vera': ['terracotta', 140, 95, 'taper'],
  'jade-plant': ['charcoal', 130, 90, 'cyl'], 'echeveria-elegans': ['terracotta', 120, 80, 'round'], 'haworthia-zebra': ['white', 120, 80, 'cyl'],
  'burros-tail': ['cream', 130, 90, 'round'], 'bunny-ear-cactus': ['terracotta', 130, 90, 'taper'], 'phalaenopsis-orchid': ['white', 130, 90, 'cyl'],
  'african-violet': ['blush', 120, 80, 'round'], 'anthurium-red': ['white', 140, 100, 'round'], 'jasmine-mogra': ['terracotta', 150, 105, 'taper'],
  'miniature-rose': ['cream', 140, 95, 'round'], 'tulsi-holy-basil': ['terracotta', 150, 105, 'taper'], 'curry-leaf-plant': ['terracotta', 170, 120, 'taper'],
  'mint-pudina': ['sage', 140, 95, 'round'], 'basil-sweet': ['terracotta', 140, 95, 'taper'], lavender: ['cream', 140, 100, 'taper'],
  hibiscus: ['terracotta', 170, 120, 'taper'], bougainvillea: ['terracotta', 170, 120, 'taper'],
};

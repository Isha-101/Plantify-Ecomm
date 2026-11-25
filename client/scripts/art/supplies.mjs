import { f, uid, leaf, leafD, ovalD, lighten, darken, pot, soil, shadow, G } from './core.mjs';
import { PLANT_ART, PLANT_POTS } from './plants.mjs';

// Art objects: { svg, h, focus } in baseline coordinates (bottom at y=0, up is negative, centred on x=0).
const A = (svg, h, focus) => ({ svg, h, focus });
export const place = (art, x, y, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">${art.svg}</g>`;

function vase(w, h) {
  const rx = w / 2;
  let peb = '';
  const cols = ['#E8E1D2', '#C9D4C4', '#D8C7A6', '#B9C7C9', '#EFEAE0'];
  for (let i = 0; i < 14; i++) peb += `<ellipse cx="${-rx + 12 + (i % 7) * ((w - 24) / 6)}" cy="${h - 12 - Math.floor(i / 7) * 12}" rx="10" ry="7" fill="${cols[i % 5]}"/>`;
  return `<rect x="${-rx}" y="0" width="${w}" height="${h}" rx="14" fill="rgba(180,220,235,.30)"/><rect x="${-rx + 3}" y="30" width="${w - 6}" height="${h - 33}" rx="11" fill="rgba(140,200,225,.28)"/>${peb}<rect x="${-rx}" y="0" width="${w}" height="${h}" rx="14" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3"/><rect x="${-rx + 8}" y="10" width="7" height="${h - 30}" rx="3.5" fill="rgba(255,255,255,.55)"/>`;
}

/** A plant in its pot as a self-contained art object. */
export function plantArt(slug, over = {}) {
  const def = PLANT_ART[slug]();
  const [style, w, h, shape] = over.pot || PLANT_POTS[slug];
  const sauc = shape === 'vase' ? 0 : 8;
  const potSvg = shape === 'vase' ? vase(w, h) : pot(style, { w, h, shape });
  const svg = `${shadow(w, 0)}<g transform="translate(0 ${-(h + sauc)})">${shape === 'vase' ? '' : soil(w)}${def.back}${potSvg}${def.front}</g>`;
  return A(svg, def.h + h + sauc, -(h + sauc) + def.focus);
}

const label = (txt, x, y, size = 16, fill = G.deep, weight = 700, anchor = 'middle', ls = 1) => `<text x="${x}" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${txt}</text>`;

// ---------------- seeds ----------------
function packet(color, icon, name, sub) {
  const w = 96, hgt = 250, id = uid('pk');
  const top = `M${-w} ${-hgt}l16 -10 16 10 16 -10 16 10 16 -10 16 10 16 -10 16 10 16 -10 16 10 16 -10 16 10 16 -10 16 10Z`;
  const svg = `${shadow(200, 2)}<path d="M${-w} ${-hgt}H${w}V0H${-w}Z" fill="${color}"/><path d="M${-w} ${-hgt}H${w}V${-hgt + 40}H${-w}Z" fill="${darken(color, 0.15)}"/><rect x="${-w + 14}" y="${-hgt + 56}" width="${(w - 14) * 2}" height="130" rx="14" fill="#FBF8EF"/><g transform="translate(0 ${-hgt + 120})">${icon}</g>${label(name, 0, -hgt + 208, 17, G.deep, 700)}${label(sub, 0, -hgt + 232, 11, lighten(G.ink, 0.2), 400, 'middle', 2)}<path d="M${-w} ${-hgt}H${w}" stroke="rgba(255,255,255,.35)" stroke-width="3"/><path d="M${-w} 0H${w}" stroke="rgba(0,0,0,.12)" stroke-width="3"/><rect x="${-w}" y="${-hgt}" width="${w * 2}" height="${hgt}" fill="url(#${id})"/><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient></defs>`;
  let seeds = '';
  [[-150, -4], [-132, -9], [-165, -10], [138, -4], [155, -9], [128, -11], [172, -3]].forEach(([x, y], i) => { seeds += `<ellipse cx="${x}" cy="${y}" rx="6" ry="3.4" fill="${i % 2 ? '#8C6A44' : '#A8825A'}" transform="rotate(${i * 30} ${x} ${y})"/>`; });
  return A(svg + seeds, 255, -140);
}
const tomatoIcon = `<path d="M0 -10Q-4 -46 -30 -36" stroke="#4F9A4C" stroke-width="3" fill="none"/><circle cx="-30" cy="-6" r="31" fill="#D8412F"/><circle cx="-34" cy="-12" r="9" fill="rgba(255,255,255,.28)"/><path d="M-30 -37l-8 8 8 -2 8 2z" fill="#4F9A4C"/><circle cx="26" cy="12" r="24" fill="#E4563F"/><path d="M26 -10l-7 7 7 -2 7 2z" fill="#4F9A4C"/>`;
const marigoldIcon = `<g>${[...Array(12)].map((_, i) => `<ellipse cx="0" cy="-26" rx="11" ry="22" transform="rotate(${i * 30})" fill="${i % 2 ? '#F29B21' : '#F6B13A'}"/>`).join('')}${[...Array(8)].map((_, i) => `<ellipse cx="0" cy="-14" rx="8" ry="14" transform="rotate(${i * 45 + 20})" fill="#E8821A"/>`).join('')}<circle r="9" fill="#C25E12"/></g>`;
const basilIcon = `<path d="M0 50V-8" stroke="#4F9A4C" stroke-width="4"/>${[[-40, 28], [40, 28], [-26, 0], [26, 0], [0, -34]].map(([a, L], i) => leaf(0, [30, 30, 8, 8, -6][i], a * 1.1, 52, 28, i % 2 ? '#3E8E45' : '#4A9C4F', { d: ovalD(52, 28) })).join('')}`;
const microIcon = `<rect x="-62" y="22" width="124" height="26" rx="6" fill="#7B5E44"/>${[-44, -22, 0, 22, 44].map((x, i) => `<path d="M${x} 24V${-6 - (i % 3) * 8}" stroke="#7DB65A" stroke-width="3"/>${leaf(x, -6 - (i % 3) * 8, -50, 24, 11, '#6FB458', { vein: false })}${leaf(x, -6 - (i % 3) * 8, 50, 24, 11, '#82C568', { vein: false })}`).join('')}`;

// ---------------- pots & planters ----------------
function terracottaSet() {
  const one = (x, w, h) => `<g transform="translate(${x} ${-h - 8})">${soil(w)}${pot('terracotta', { w, h })}</g>${shadow(w, 0).replace('cy="0"', `cx="${x}" cy="0"`).replace('cx="0" ', '')}`;
  return A(one(-92, 100, 78) + one(102, 86, 66) + one(0, 124, 96).replace('', ''), 120, -60);
}
function ceramicPlanter() {
  const w = 170, h = 200, g = uid('cp');
  const body = `<defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="#D9D2C2"/><stop offset=".3" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F1ECE0"/><stop offset="1" stop-color="#CFC7B5"/></linearGradient></defs><rect x="${-w / 2}" y="0" width="${w}" height="${h}" rx="26" fill="url(#${g})"/><rect x="${-w / 2 - 4}" y="0" width="${w + 8}" height="22" rx="11" fill="url(#${g})"/><ellipse cx="0" cy="4" rx="${w / 2 - 6}" ry="7" fill="#4A3426"/>`;
  const pl = PLANT_ART['zz-plant']();
  return A(`${shadow(w, 0)}<g transform="translate(0 ${-h})"><g transform="translate(0 6) scale(.72)">${pl.back}</g>${body.replace(/<ellipse cx="0" cy="4"[^>]*\/>$/, '')}</g>`, h + 190, -h);
}
function selfWatering() {
  const w = 150, h = 150;
  const plant = PLANT_ART['golden-pothos']();
  return A(`${shadow(w, 0)}<g transform="translate(0 ${-h})"><g transform="translate(0 6) scale(.62)">${plant.back}${plant.front}</g><rect x="${-w / 2}" y="0" width="${w}" height="${h}" rx="22" fill="#EFEADF"/><rect x="${-w / 2}" y="${h * 0.72}" width="${w}" height="${h * 0.28}" rx="18" fill="#D4CDBB"/><rect x="${-14}" y="${h * 0.18}" width="28" height="${h * 0.72}" rx="14" fill="#FFFFFF" stroke="#C9C2AE" stroke-width="2"/><rect x="-10" y="${h * 0.5}" width="20" height="${h * 0.36}" rx="10" fill="#6FB7DA"/><rect x="${-w / 2}" y="0" width="${w}" height="16" rx="8" fill="#FBF8EF"/></g>`, h + 140, -h);
}
function hangingBasket() {
  const plant = PLANT_ART['golden-pothos']();
  const chains = [-70, 0, 70].map((x) => `<path d="M${x} -150L0 -330" stroke="#8A7B66" stroke-width="3" stroke-dasharray="7 4" fill="none"/>`).join('');
  return A(`${chains}<circle cx="0" cy="-334" r="9" fill="none" stroke="#6b5d4a" stroke-width="4"/><g transform="translate(0 -150)"><g transform="translate(0 4) scale(.6)">${plant.back}</g><path d="M-92 0Q-84 82 0 90Q84 82 92 0Z" fill="#8B6C47"/><path d="M-92 0Q-84 82 0 90Q84 82 92 0" fill="none" stroke="#6E5236" stroke-width="3"/>${[...Array(5)].map((_, i) => `<path d="M${-70 + i * 35} 4Q${-66 + i * 35} 50 ${-30 + i * 15} 84" stroke="#6E5236" stroke-width="2" fill="none"/>`).join('')}<ellipse cx="0" cy="2" rx="92" ry="9" fill="#A07F57"/><g transform="scale(.6)">${plant.front}</g></g>`, 345, -170);
}
function woodenPlanter() {
  const w = 340, h = 110;
  let planks = '';
  for (let i = 1; i < 3; i++) planks += `<path d="M${-w / 2} ${i * h / 3}H${w / 2}" stroke="rgba(60,40,20,.28)" stroke-width="2"/>`;
  for (let i = 0; i < 6; i++) planks += `<path d="M${-w / 2 + 20 + i * 62} 4q6 ${h / 2} -4 ${h - 8}" stroke="rgba(60,40,20,.12)" stroke-width="2" fill="none"/>`;
  const herbs = ['mint-pudina', 'basil-sweet', 'tulsi-holy-basil'].map((s, i) => { const d = PLANT_ART[s](); return `<g transform="translate(${-100 + i * 100} 10) scale(.5)">${d.back}</g>`; }).join('');
  return A(`${shadow(w, 0)}<g transform="translate(0 ${-h})"><rect x="${-w / 2 + 6}" y="0" width="${w - 12}" height="16" fill="#4A3426"/>${herbs}<rect x="${-w / 2}" y="6" width="${w}" height="${h - 6}" rx="8" fill="#B58B5E"/>${planks}<rect x="${-w / 2 - 4}" y="0" width="${w + 8}" height="20" rx="6" fill="#CBA478"/></g>`, h + 150, -h - 20);
}

// ---------------- tools ----------------
function shears() {
  return A(`${shadow(220, 0)}<g transform="translate(0 -170) rotate(-32)"><path d="M-6 8Q-30 70 -52 150" stroke="#C0473B" stroke-width="30" stroke-linecap="round" fill="none"/><path d="M6 8Q30 70 52 150" stroke="#2F5D49" stroke-width="30" stroke-linecap="round" fill="none"/><path d="M-6 8Q-30 70 -52 150" stroke="rgba(255,255,255,.25)" stroke-width="6" stroke-linecap="round" fill="none" transform="translate(-6 0)"/><path d="M0 0C-16 -50 -26 -100 -8 -150C6 -130 14 -80 12 -10Z" fill="#CBD3D4"/><path d="M0 0C20 -40 34 -80 24 -120C6 -108 -4 -60 -10 -4Z" fill="#9AA6A8"/><circle cx="0" cy="0" r="9" fill="#5b6769"/><circle cx="0" cy="0" r="3.5" fill="#D6DDDE"/><path d="M-10 90Q0 110 10 90" stroke="#555" stroke-width="3" fill="none"/></g>`, 330, -160);
}
function trowelFork() {
  const handle = (c) => `<rect x="-14" y="-310" width="28" height="118" rx="14" fill="${c}"/><rect x="-14" y="-310" width="28" height="16" rx="8" fill="rgba(0,0,0,.18)"/><rect x="-4" y="-304" width="6" height="104" rx="3" fill="rgba(255,255,255,.25)"/><rect x="-14" y="-196" width="28" height="10" fill="#8A929A"/><rect x="-6" y="-188" width="12" height="40" fill="#A9B3B6"/>`;
  const trowel = `<g transform="translate(-72 0) rotate(-5)">${handle('#B07A4A')}<path d="M-6 -150L-40 -90Q-46 -28 0 0Q46 -28 40 -90L6 -150Z" fill="#C5CED0"/><path d="M-6 -150L-40 -90Q-46 -28 0 0L0 -150Z" fill="rgba(0,0,0,.1)"/><path d="M0 -150V-14" stroke="rgba(255,255,255,.55)" stroke-width="3"/></g>`;
  const fork = `<g transform="translate(78 0) rotate(5)">${handle('#B07A4A')}<path d="M-34 -148H34V-98Q34 -86 26 -78L26 0H14V-76H5V0H-5V-76H-14V0H-26L-26 -78Q-34 -86 -34 -98Z" fill="#C5CED0"/><path d="M-34 -148H0V-76H-14V0H-26L-26 -78Q-34 -86 -34 -98Z" fill="rgba(0,0,0,.08)"/></g>`;
  return A(`${shadow(260, 2)}${trowel}${fork}`, 312, -170);
}
function wateringCan() {
  return A(`${shadow(260, 0)}<path d="M-70 -60Q-130 -80 -150 -190" stroke="#6F9A7A" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M-170 -210l30 -30 26 26 -30 30z" fill="#5B8664"/><g>${[0, 1, 2, 3, 4].map((i) => `<circle cx="${-156 + i * 6}" cy="${-206 - i * 3}" r="1.6" fill="#2f4a37" transform="translate(-4 10)"/>`).join('')}</g><path d="M70 -100Q130 -110 120 -40Q112 -5 70 -26" stroke="#5B8664" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M-80 -150Q0 -190 82 -150" stroke="#5B8664" stroke-width="14" fill="none" stroke-linecap="round" transform="translate(0 -30)"/><path d="M-78 -10L-70 -140Q0 -154 74 -140L82 -10Q0 12 -78 -10Z" fill="#7FAE8A"/><path d="M-78 -10L-70 -140Q-40 -146 -30 -144L-40 0Z" fill="rgba(0,0,0,.12)"/><ellipse cx="2" cy="-140" rx="73" ry="12" fill="#5B8664"/><ellipse cx="2" cy="-141" rx="58" ry="8" fill="#2f4a37"/><path d="M-60 -70H64" stroke="rgba(255,255,255,.35)" stroke-width="3"/>`, 280, -120);
}
function sprayBottle() {
  const id = uid('sb');
  return A(`${shadow(150, 0)}<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#cfe7ef" stop-opacity=".8"/><stop offset=".4" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#b6d6e2" stop-opacity=".8"/></linearGradient></defs><rect x="-48" y="-200" width="96" height="200" rx="24" fill="url(#${id})" stroke="#BFD7E0" stroke-width="3"/><rect x="-44" y="-120" width="88" height="116" rx="20" fill="#7FC3E0" opacity=".55"/><rect x="-34" y="-150" width="68" height="60" rx="8" fill="#FBF8EF"/>${label('MIST', 0, -122, 18, G.deep, 700, 'middle', 3)}<path d="M-8 -140l8 -9 8 9" fill="none"/><rect x="-16" y="-232" width="32" height="34" fill="#C9D3D5"/><path d="M-30 -262H40Q52 -262 52 -246V-232H-30Q-42 -232 -42 -246Q-42 -262 -30 -262Z" fill="#3E4C47"/><rect x="-62" y="-258" width="26" height="12" rx="5" fill="#2e3935"/><path d="M26 -232Q42 -214 36 -190" stroke="#3E4C47" stroke-width="9" stroke-linecap="round" fill="none"/>`, 270, -130);
}

// ---------------- soil & feed ----------------
function bag(body, panel, name, sub, icon, size = 1) {
  const id = uid('bg');
  const w = 105, h = 270;
  return A(`${shadow(260, 0)}<path d="M${-w} ${-h}Q${-w - 10} ${-h / 2} ${-w + 6} 0H${w - 6}Q${w + 10} ${-h / 2} ${w} ${-h}Z" fill="${body}"/><path d="M${-w} ${-h}H${w}V${-h + 22}H${-w}Z" fill="${darken(body, 0.18)}"/>${[...Array(12)].map((_, i) => `<path d="M${-w + 8 + i * 17.5} ${-h + 2}v18" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`).join('')}<rect x="${-w + 16}" y="${-h + 52}" width="${(w - 16) * 2}" height="${h - 120}" rx="16" fill="${panel}"/><g transform="translate(0 ${-h + 110})">${icon}</g>${label(name, 0, -h + 168, 17, G.deep)}${label(sub, 0, -h + 190, 11, lighten(G.ink, 0.2), 400, 'middle', 1.5)}<path d="M${-w + 6} ${-h + 22}Q${-w + 20} ${-h / 2} ${-w + 12} -6" stroke="rgba(255,255,255,.28)" stroke-width="8" fill="none" stroke-linecap="round"/>`
    + `<path d="M${w + 10} 0Q${w + 40} -18 ${w + 80} 0Z" fill="${darken(body, 0.25)}" opacity=".9"/><path d="M${w - 10} 0Q${w + 30} -24 ${w + 90} 0Z" fill="${darken(body, 0.35)}"/>`, h + 5, -h / 2);
}
const sproutIcon = `<path d="M0 36V-6" stroke="#4F9A4C" stroke-width="5"/>${leaf(0, -4, -48, 42, 20, '#4F9A4C')}${leaf(0, 6, 52, 40, 19, '#6BAE78')}`;
const cactusIcon = `<rect x="-14" y="-34" width="28" height="70" rx="14" fill="#5C9A62"/><path d="M-14 4h-16v-26" stroke="#5C9A62" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10h14v-34" stroke="#5C9A62" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const wormIcon = `<path d="M-40 14Q-24 -22 -8 6T24 -6T42 18" stroke="#C98A7A" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="42" cy="16" r="2" fill="#6b3b32"/><path d="M-30 30h60" stroke="#7B5E44" stroke-width="8" stroke-linecap="round"/>`;
function bottle(liquid, labelColor, name, sub, cap = '#2F5D49', h = 230, w = 82) {
  const id = uid('bt');
  return A(`${shadow(150, 0)}<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${darken(liquid, 0.2)}"/><stop offset=".3" stop-color="${lighten(liquid, 0.3)}"/><stop offset="1" stop-color="${darken(liquid, 0.15)}"/></linearGradient></defs><path d="M${-w / 2} 0V${-h * 0.72}Q${-w / 2} ${-h * 0.86} ${-w * 0.2} ${-h * 0.9}V${-h * 0.96}H${w * 0.2}V${-h * 0.9}Q${w / 2} ${-h * 0.86} ${w / 2} ${-h * 0.72}V0Q0 8 ${-w / 2} 0Z" fill="url(#${id})"/><rect x="${-w * 0.24}" y="${-h * 1.06}" width="${w * 0.48}" height="${h * 0.12}" rx="4" fill="${cap}"/><rect x="${-w / 2 + 2}" y="${-h * 0.62}" width="${w - 4}" height="${h * 0.4}" fill="${labelColor}"/>${label(name, 0, -h * 0.46, 14, G.deep, 700)}${label(sub, 0, -h * 0.35, 9, G.ink, 400, 'middle', 1.5)}<path d="M${-w / 2 + 8} -20V${-h * 0.7}" stroke="rgba(255,255,255,.4)" stroke-width="5" stroke-linecap="round"/>`, h * 1.08, -h / 2);
}

// ---------------- accessories ----------------
function moistureMeter() {
  const pl = plantArt('peperomia-watermelon', { pot: ['terracotta', 130, 90, 'taper'] });
  const needle = `<path d="M-26 6A26 26 0 0 1 26 6" stroke="#E5E0D0" stroke-width="9" fill="none"/><path d="M-26 6A26 26 0 0 1 -9 -20" stroke="#D96A4A" stroke-width="9" fill="none"/><path d="M-9 -20A26 26 0 0 1 9 -20" stroke="#E8B64A" stroke-width="9" fill="none"/><path d="M9 -20A26 26 0 0 1 26 6" stroke="#4FA46A" stroke-width="9" fill="none"/><path d="M0 8L14 -16" stroke="#24342B" stroke-width="3.5" stroke-linecap="round"/><circle cy="8" r="5" fill="#24342B"/>`;
  return A(`${place(pl, 40, 0, 0.8)}<g transform="translate(-92 0)">${shadow(60, 0)}<path d="M-5 -230V-20L0 0L5 -20V-230Z" fill="#B7BFC1"/><path d="M-5 -230V-20L0 0V-230Z" fill="rgba(0,0,0,.12)"/><circle cx="0" cy="-262" r="46" fill="#F4F0E6" stroke="#CFC7B5" stroke-width="4"/><circle cx="0" cy="-262" r="38" fill="#fff"/><g transform="translate(0 -262)">${needle}</g>${label('MOIST', 0, -234, 8, G.ink, 700, 'middle', 1)}</g>`, 310, -150);
}
function growLight() {
  const pl = plantArt('golden-pothos', { pot: ['sage', 140, 95, 'round'] });
  const id = uid('gl');
  return A(`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".75"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient></defs><path d="M-110 -308L110 -308L170 -60L-170 -60Z" fill="url(#${id})"/>${place(pl, 0, 0, 1)}<rect x="96" y="-110" width="36" height="22" rx="4" fill="#3E4C47"/><path d="M114 -100Q150 -240 90 -300Q60 -330 10 -326" stroke="#3E4C47" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="-100" y="-340" width="150" height="30" rx="15" fill="#E9E6DC" stroke="#BDB8A8" stroke-width="2"/><rect x="-88" y="-326" width="126" height="10" rx="5" fill="#FFF3C4"/>`, 345, -180);
}
function plantStand() {
  const slots = [['echeveria-elegans', 120, -250, 0.62], ['haworthia-zebra', -20, -165, 0.66], ['golden-pothos', 90, -80, 0.5]];
  const wood = '#B58B5E';
  const shelves = [-76, -164, -250].map((y, i) => `<rect x="${-120 + i * 0}" y="${y}" width="240" height="12" rx="4" fill="${wood}"/>`).join('');
  const items = [['echeveria-elegans', -60, -76, 0.72], ['haworthia-zebra', 50, -164, 0.78], ['golden-pothos', -50, -250, 0.55]].map(([s, x, y, k]) => place(plantArt(s), x, y, k)).join('');
  return A(`${shadow(260, 0)}<path d="M-112 -76L-130 0M112 -76L130 0M-112 -250L-112 -76M112 -250L112 -76" stroke="#9C7348" stroke-width="10" stroke-linecap="round"/>${items}${shelves}`, 270, -140);
}
const neem = () => bottle('#A0703B', '#EEF3DE', 'NEEM', 'OIL SPRAY', '#2F5D49', 220, 86);

// ---------------- kits ----------------
function kitBox(plants, extras, tag, ribbon = false) {
  const w = 340, h = 140;
  const inner = plants.map(([s, x, y, k]) => place(plantArt(s), x, -h * 0.85 + y, k)).join('');
  const front = `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="6" fill="#C9A675"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="6" fill="url(#kb)"/><path d="M${-w / 2} ${-h + 10}H${w / 2}" stroke="rgba(0,0,0,.12)" stroke-width="4"/><path d="M${-w / 2} ${-h}l-18 -24 36 10z M${w / 2} ${-h}l18 -24 -36 10z" fill="#B8935F"/>`;
  const lbl = `<rect x="-92" y="${-h + 34}" width="184" height="70" rx="8" fill="#FBF8EF"/>${label('PLANTIFY', 0, -h + 62, 20, G.deep, 700, 'middle', 5)}${label(tag, 0, -h + 86, 11, G.ink, 400, 'middle', 2)}`;
  const rib = ribbon ? `<path d="M-14 ${-h}V0M14 ${-h}V0" stroke="#D96A7A" stroke-width="2" opacity="0"/><rect x="-16" y="${-h}" width="32" height="${h}" fill="#D96A7A"/><path d="M0 ${-h}Q-48 ${-h - 54} -56 ${-h - 18}Q-30 ${-h + 6} 0 ${-h}Q48 ${-h - 54} 56 ${-h - 18}Q30 ${-h + 6} 0 ${-h}Z" fill="#E8798A"/><circle cx="0" cy="${-h}" r="9" fill="#C75466"/>` : '';
  const ex = extras.map(([a, x, y, k]) => place(a, x, y, k)).join('');
  return A(`<defs><linearGradient id="kb" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".1"/><stop offset=".4" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>${shadow(w, 0)}${inner}${front}${rib}${lbl}${ex}`, h + 250, -h - 60);
}

export function supplyArt(slug) {
  switch (slug) {
    case 'cherry-tomato-seeds': return packet('#D8412F', tomatoIcon, 'Cherry Tomato', 'SEEDS · 30 PCS');
    case 'marigold-seeds': return packet('#F29B21', marigoldIcon, 'Marigold', 'SEEDS · 50 PCS');
    case 'sweet-basil-seeds': return packet('#4A9C4F', basilIcon, 'Sweet Basil', 'SEEDS · 200 PCS');
    case 'microgreens-seed-mix': return packet('#8CB86A', microIcon, 'Microgreens', 'SEED MIX · 50 G');
    case 'terracotta-pot-set': return terracottaSet();
    case 'ceramic-planter-white': return ceramicPlanter();
    case 'self-watering-planter': return selfWatering();
    case 'hanging-basket-planter': return hangingBasket();
    case 'wooden-balcony-planter': return woodenPlanter();
    case 'pruning-shears': return shears();
    case 'trowel-fork-set': return trowelFork();
    case 'long-spout-watering-can': return wateringCan();
    case 'fine-mist-spray-bottle': return sprayBottle();
    case 'premium-potting-mix': return bag('#6B4E37', '#F5EFE0', 'Potting Mix', 'PREMIUM · 5 KG', sproutIcon);
    case 'cactus-succulent-mix': return bag('#C9AE7B', '#FBF5E6', 'Cactus Mix', 'GRITTY · 2 KG', cactusIcon);
    case 'organic-vermicompost': return bag('#3E4A36', '#EEF3DE', 'Vermicompost', 'ORGANIC · 2 KG', wormIcon);
    case 'liquid-plant-food': return bottle('#5EA06A', '#F5F7E8', 'PLANT FOOD', 'LIQUID · 250 ML');
    case 'soil-moisture-meter': return moistureMeter();
    case 'clip-on-grow-light': return growLight();
    case 'plant-stand-3-tier': return plantStand();
    case 'neem-oil-spray': return neem();
    case 'beginner-plant-kit': return kitBox([['snake-plant', -85, 0, 0.5], ['golden-pothos', 70, 0, 0.5]], [[sprayBottle(), 196, 0, 0.55]], 'BEGINNER KIT');
    case 'desk-plant-kit': return kitBox([['peperomia-watermelon', -90, 0, 0.62], ['haworthia-zebra', 0, 0, 0.7], ['echeveria-elegans', 92, 0, 0.7]], [[bag('#C9AE7B', '#FBF5E6', 'Cactus Mix', '2 KG', cactusIcon), -205, 0, 0.42]], 'DESK KIT');
    case 'balcony-garden-kit': return kitBox([['tulsi-holy-basil', -100, 0, 0.5], ['mint-pudina', 0, 0, 0.55], ['basil-sweet', 100, 0, 0.5]], [[wateringCan(), 215, 0, 0.42]], 'BALCONY KIT');
    case 'indoor-jungle-starter-kit': return kitBox([['monstera-deliciosa', -105, 0, 0.5], ['zz-plant', 0, 0, 0.5], ['spider-plant', 100, 0, 0.55], ['golden-pothos', 30, 6, 0.4]], [[bottle('#5EA06A', '#F5F7E8', 'PLANT FOOD', '250 ML'), 210, 0, 0.5]], 'JUNGLE KIT');
    case 'succulent-collection': return kitBox([['aloe-vera', -110, 0, 0.55], ['jade-plant', -35, 0, 0.55], ['echeveria-elegans', 35, 0, 0.7], ['haworthia-zebra', 100, 0, 0.7], ['burros-tail', 150, 20, 0.5]], [], 'SUCCULENT SET');
    case 'plant-gift-kit-peace-lily': return kitBox([['peace-lily', 0, 0, 0.58]], [[sprayBottle(), -200, 0, 0.5], [bottle('#5EA06A', '#F5F7E8', 'PLANT FOOD', '250 ML'), 205, 0, 0.5]], 'GIFT KIT', true);
    default: return null;
  }
}

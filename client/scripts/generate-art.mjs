// Generates the original SVG illustrations used as product / category / room / hero imagery.
// Run:  npm run art     (reads product slugs from ../server/src/seed/catalogue.js)
// Swap in real photography any time by replacing files in public/images/** or updating product.image in the DB.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { f, uid, hash, leaf, ovalD, leafD, lighten, darken, G, pot, soil, shadow } from './art/core.mjs';
import { PLANT_ART } from './art/plants.mjs';
import { plantArt, supplyArt, place } from './art/supplies.mjs';
import { buildCatalogue } from '../../server/src/seed/catalogue.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const write = (rel, svg) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, svg); };
const svgDoc = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"${extra}>${body}</svg>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const THEMES = {
  'indoor-plants': ['#F4F8F0', '#DCEBD9', '#E6D8BC'], 'outdoor-plants': ['#F3F8E8', '#D7E8C3', '#D9C8A0'],
  succulents: ['#FCF2E6', '#F1DCC3', '#E2CFAF'], 'flowering-plants': ['#FCF1F0', '#F3DAD9', '#E9D7C2'],
  seeds: ['#FFF7E8', '#F6E3BE', '#E8D6B4'], 'pots-planters': ['#F7F2E9', '#E8DFCC', '#DCCBAA'],
  'gardening-tools': ['#EFF4F1', '#D5E2DB', '#D9CBAE'], 'soil-fertilizers': ['#F4EEE3', '#E2D5BF', '#D6C4A2'],
  'plant-accessories': ['#EFF3F5', '#D8E3E8', '#DCCFB5'], 'plant-kits': ['#FFF4E8', '#F2DDBF', '#E6D3AE'],
};

function artFor(p) {
  if (p.isPlant) return plantArt(p.slug);
  const a = supplyArt(p.slug);
  if (!a) throw new Error('no art for ' + p.slug);
  return a;
}

// ---------- 1. main product image (600×600) ----------
function mainView(art, cat) {
  const [c1, c2, table] = THEMES[cat] || THEMES['indoor-plants'];
  const s = clamp(410 / art.h, 0.62, 1.3);
  const bg = uid('bg');
  return svgDoc(600, 600, `<defs><radialGradient id="${bg}" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
<rect width="600" height="600" fill="url(#${bg})"/>
<circle cx="300" cy="250" r="215" fill="rgba(255,255,255,.42)"/><circle cx="300" cy="250" r="160" fill="rgba(255,255,255,.28)"/>
<rect y="486" width="600" height="114" fill="${table}"/><rect y="486" width="600" height="5" fill="rgba(255,255,255,.55)"/><rect y="491" width="600" height="3" fill="rgba(0,0,0,.06)"/>
<g transform="translate(300 488) scale(${f(s)})">${art.svg}</g>`);
}

// ---------- 2. detail / close-up (600×600) ----------
function detailView(art, cat, slug) {
  const [c1, c2] = THEMES[cat] || THEMES['indoor-plants'];
  const h = hash(slug);
  let bokeh = '';
  for (let i = 0; i < 9; i++) bokeh += `<circle cx="${(h * (i + 3)) % 600}" cy="${(h * (i + 7)) % 600}" r="${30 + ((h >> i) % 60)}" fill="rgba(255,255,255,${0.14 + (i % 3) * 0.07})"/>`;
  const z = art.h > 200 ? 2.05 : 2.5;
  const bg = uid('bg');
  return svgDoc(600, 600, `<defs><linearGradient id="${bg}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${darken(c2, 0.08)}"/><stop offset="1" stop-color="${lighten(c1, 0.2)}"/></linearGradient><clipPath id="${bg}c"><rect width="600" height="600"/></clipPath></defs>
<rect width="600" height="600" fill="url(#${bg})"/>${bokeh}
<g clip-path="url(#${bg}c)"><g transform="translate(300 300) scale(${z}) translate(0 ${f(-art.focus)})">${art.svg}</g></g>
<rect width="600" height="600" fill="none" stroke="rgba(36,52,43,.06)" stroke-width="10"/>`);
}

// ---------- 3. in-room scene (600×600) ----------
const woodFloor = (y, c = '#C9A47A') => `<rect y="${y}" width="600" height="${600 - y}" fill="${c}"/>${[...Array(6)].map((_, i) => `<path d="M0 ${y + 24 + i * 24}H600" stroke="rgba(0,0,0,.06)" stroke-width="2"/>`).join('')}<rect y="${y - 8}" width="600" height="8" fill="rgba(255,255,255,.55)"/>`;
const windowFrame = (x, y, w, h, arch = false) => {
  const g = uid('sky');
  const shape = arch ? `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE0EE"/><stop offset="1" stop-color="#F7FCFF"/></linearGradient></defs><path d="${shape}" fill="url(#${g})" stroke="#FFFFFF" stroke-width="10"/><path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h * 0.48}H${x + w}" stroke="#fff" stroke-width="6"/><ellipse cx="${x + w * 0.3}" cy="${y + h * 0.28}" rx="${w * 0.2}" ry="${h * 0.05}" fill="rgba(255,255,255,.8)"/>`;
};
const beam = (x1, y1, x2, y2, floorY) => `<path d="M${x1} ${y1}L${x2} ${y2}L${x2 + 150} ${floorY}L${x1 + 20} ${floorY - 30}Z" fill="rgba(255,244,200,.28)"/>`;

function sceneView(art, cat, slug, idx) {
  const tall = art.h > 360;
  const variants = tall ? ['floor'] : ['window', 'shelf', 'desk'];
  const v = cat === 'plant-kits' || (!art.isPlant && !tall && false) ? 'bench' : variants[idx % variants.length];
  const kind = (!art.plant) && !PLANT_ART[slug] ? 'bench' : v;
  let bg = '', ax = 300, ay = 440, target = 260;
  switch (kind) {
    case 'window':
      bg = `<rect width="600" height="600" fill="#EFE6D3"/>${windowFrame(60, 70, 230, 300)}<path d="M40 60Q70 220 40 400H20V60Z" fill="rgba(255,255,255,.55)"/>${beam(90, 380, 300, 430, 600)}${woodFloor(470)}<rect x="290" y="392" width="230" height="16" rx="8" fill="#9C7348"/><rect x="316" y="408" width="14" height="70" fill="#8A6540"/><rect x="480" y="408" width="14" height="70" fill="#8A6540"/><rect x="430" y="80" width="100" height="130" fill="#fff" stroke="#C9B48C" stroke-width="8"/><path d="M450 190q30 -90 60 -100q-20 60 -60 100Z" fill="#A8BDA5"/>`;
      ax = 405; ay = 392; target = 270; break;
    case 'shelf':
      bg = `<rect width="600" height="600" fill="#DDE8DC"/><rect y="470" width="600" height="130" fill="#CBD9C9"/><rect x="120" y="90" width="150" height="190" fill="#fff" stroke="#9C7348" stroke-width="10"/><circle cx="195" cy="170" r="42" fill="#A8BDA5"/><path d="M150 262q45 -80 90 0Z" fill="#477A58"/><rect x="60" y="402" width="480" height="18" rx="6" fill="#B58B5E"/><path d="M110 420v50M490 420v50" stroke="#8A6540" stroke-width="10"/><rect x="88" y="340" width="16" height="62" fill="#C0644F"/><rect x="106" y="352" width="14" height="50" fill="#3F6F8F"/><rect x="122" y="330" width="18" height="72" fill="#D9B24F"/><rect x="478" y="362" width="34" height="40" rx="6" fill="#F6EFE0"/><path d="M495 362v-12" stroke="#444" stroke-width="2"/><ellipse cx="495" cy="346" rx="4" ry="7" fill="#F6B13A"/>`;
      ax = 320; ay = 402; target = 250; break;
    case 'desk':
      bg = `<rect width="600" height="600" fill="#E4EDE6"/><circle cx="480" cy="130" r="48" fill="#fff" stroke="#9C7348" stroke-width="8"/><path d="M480 130V100M480 130l22 10" stroke="#24342B" stroke-width="4" stroke-linecap="round"/><rect x="0" y="430" width="600" height="22" fill="#B58B5E"/><rect x="0" y="452" width="600" height="148" fill="#9C7348"/><rect x="0" y="452" width="600" height="6" fill="rgba(0,0,0,.14)"/><path d="M350 430l10 -120h160l10 120Z" fill="#2E3A36"/><rect x="368" y="322" width="140" height="92" fill="#DCEBE6"/><path d="M380 345h60M380 362h90M380 380h50" stroke="#477A58" stroke-width="5" stroke-linecap="round"/><rect x="330" y="424" width="210" height="10" rx="5" fill="#C8CFCB"/><rect x="552" y="392" width="30" height="36" rx="6" fill="#fff"/><path d="M582 400q16 4 0 20" stroke="#fff" stroke-width="5" fill="none"/>`;
      ax = 170; ay = 430; target = 250; break;
    case 'bench':
      bg = `<rect width="600" height="600" fill="#E9E2D0"/><rect x="0" y="0" width="600" height="600" fill="url(#pegs)"/><defs><pattern id="pegs" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="2" fill="rgba(0,0,0,.08)"/></pattern></defs><rect x="30" y="210" width="540" height="14" rx="5" fill="#B58B5E"/>${place(plantArt('echeveria-elegans'), 110, 210, 0.55)}${place(plantArt('golden-pothos'), 300, 210, 0.42)}${place(plantArt('haworthia-zebra'), 490, 210, 0.6)}<rect x="0" y="468" width="600" height="132" fill="#9C7348"/><rect x="0" y="468" width="600" height="10" fill="#B58B5E"/>`;
      ax = 300; ay = 470; target = 300; break;
    default: // floor
      bg = `<rect width="600" height="600" fill="#F2EBDD"/>${windowFrame(360, 60, 190, 280, true)}${beam(380, 330, 420, 360, 600)}${woodFloor(470, '#BFA27D')}<ellipse cx="300" cy="520" rx="260" ry="46" fill="rgba(168,189,165,.45)"/><rect x="-40" y="330" width="260" height="150" rx="26" fill="#6F8F86"/><rect x="-40" y="300" width="60" height="180" rx="22" fill="#5E7E75"/><rect x="40" y="350" width="150" height="60" rx="18" fill="#8DAAA1"/><rect x="-30" y="470" width="14" height="22" fill="#6b5a3e"/><rect x="190" y="470" width="14" height="22" fill="#6b5a3e"/>`;
      ax = 400; ay = 480; target = 400;
  }
  const s = clamp(target / art.h, 0.5, 1.25);
  return svgDoc(600, 600, `${bg}<g transform="translate(${ax} ${ay}) scale(${f(s)})">${art.svg}</g><rect width="600" height="600" fill="rgba(36,52,43,.03)"/>`);
}

// ---------- rooms (800×600) ----------
function room(kind) {
  const base = (wall, floor, floorY = 470) => `<rect width="800" height="600" fill="${wall}"/><rect y="${floorY}" width="800" height="${600 - floorY}" fill="${floor}"/><rect y="${floorY - 8}" width="800" height="8" fill="rgba(255,255,255,.5)"/>`;
  const P = (slug, x, y, s) => place(plantArt(slug), x, y, s);
  switch (kind) {
    case 'bedroom': return svgDoc(800, 600, `${base('#EADFD0', '#CDB391')}<rect x="60" y="150" width="400" height="320" rx="20" fill="#8E6B4B"/><rect x="40" y="330" width="460" height="160" rx="18" fill="#F6F1E6"/><rect x="40" y="300" width="460" height="52" rx="22" fill="#fff"/><rect x="70" y="280" width="120" height="60" rx="26" fill="#E7DFD0"/><rect x="40" y="400" width="460" height="92" rx="14" fill="#A8BDA5"/><rect x="540" y="380" width="140" height="22" rx="6" fill="#9C7348"/><rect x="556" y="402" width="12" height="80" fill="#8A6540"/><rect x="652" y="402" width="12" height="80" fill="#8A6540"/>${P('snake-plant', 610, 380, 0.55)}${windowFrame(560, 60, 180, 220).replace(/#fff/g, '#FFFFFF')}`);
    case 'living-room': return svgDoc(800, 600, `${base('#F0E9DA', '#C8AB84')}<ellipse cx="400" cy="540" rx="340" ry="50" fill="rgba(168,189,165,.5)"/><rect x="60" y="300" width="400" height="170" rx="30" fill="#6F8F86"/><rect x="40" y="260" width="70" height="220" rx="26" fill="#5E7E75"/><rect x="420" y="280" width="70" height="200" rx="26" fill="#5E7E75"/><rect x="120" y="320" width="280" height="80" rx="24" fill="#86A59B"/>${windowFrame(520, 70, 200, 330, true)}${P('monstera-deliciosa', 600, 500, 1.0)}<rect x="130" y="130" width="140" height="110" fill="#fff" stroke="#9C7348" stroke-width="8"/><path d="M150 220q40 -80 90 -70q-10 50 -90 70Z" fill="#477A58"/>`);
    case 'study': return svgDoc(800, 600, `${base('#E3EBDD', '#B58B5E')}<rect x="60" y="80" width="260" height="14" fill="#9C7348"/><rect x="60" y="190" width="260" height="14" fill="#9C7348"/>${[...Array(9)].map((_, i) => `<rect x="${70 + i * 27}" y="${i % 3 ? 120 : 112}" width="21" height="${i % 3 ? 70 : 78}" fill="${['#C0644F', '#3F6F8F', '#D9B24F', '#6B8F5E'][i % 4]}"/>`).join('')}<rect x="360" y="360" width="400" height="22" fill="#9C7348"/><rect x="380" y="382" width="14" height="96" fill="#8A6540"/><rect x="730" y="382" width="14" height="96" fill="#8A6540"/><path d="M640 360v-90l-60 -34" stroke="#3E4C47" stroke-width="8" fill="none"/><path d="M552 232l46 -22 18 36z" fill="#F4C95D"/><rect x="400" y="260" width="140" height="96" rx="6" fill="#2E3A36"/><rect x="408" y="268" width="124" height="80" fill="#DCEBE6"/>${P('golden-pothos', 690, 360, 0.5)}`);
    case 'bathroom': return svgDoc(800, 600, `<rect width="800" height="600" fill="#DDEBE8"/>${[...Array(10)].map((_, i) => `<path d="M0 ${i * 60}H800M${i * 90} 0V600" stroke="rgba(255,255,255,.55)" stroke-width="3"/>`).join('')}<rect y="470" width="800" height="130" fill="#C9D6D2"/><ellipse cx="180" cy="130" rx="95" ry="115" fill="#F4FAFA" stroke="#9C7348" stroke-width="10"/><path d="M110 140q60 -90 140 0" stroke="rgba(120,160,170,.3)" stroke-width="14" fill="none"/><rect x="60" y="300" width="360" height="190" rx="50" fill="#fff"/><rect x="60" y="300" width="360" height="40" rx="20" fill="#EEF4F4"/><rect x="520" y="330" width="200" height="20" rx="6" fill="#B58B5E"/><rect x="540" y="350" width="12" height="130" fill="#8A6540"/><rect x="690" y="350" width="12" height="130" fill="#8A6540"/>${P('boston-fern', 620, 330, 0.7)}`);
    case 'balcony': return svgDoc(800, 600, `<defs><linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE0EE"/><stop offset="1" stop-color="#F9F1DC"/></linearGradient></defs><rect width="800" height="600" fill="url(#bsky)"/><circle cx="640" cy="120" r="50" fill="#FFE9A8"/><path d="M0 420V330h60v-50h50v70h70v-110h60v110h90v-60h60v60h80v-90h70v90h90V320h50v100Z" fill="#B9CFC0" opacity=".7"/><rect y="440" width="800" height="160" fill="#C9B79A"/><rect y="400" width="800" height="12" fill="#7D8C86"/>${[...Array(20)].map((_, i) => `<rect x="${i * 42 + 10}" y="412" width="6" height="40" fill="#7D8C86"/>`).join('')}<rect y="450" width="800" height="12" fill="#6F7D77"/>${P('hibiscus', 180, 560, 0.95)}${place(plantArt('basil-sweet'), 440, 570, 0.9)}${place(plantArt('lavender'), 640, 560, 0.85)}`);
    case 'office': return svgDoc(800, 600, `${base('#E9EDEB', '#9FA9A4')}<rect x="60" y="360" width="460" height="22" fill="#CDB391"/><rect x="80" y="382" width="14" height="96" fill="#9AA6A1"/><rect x="486" y="382" width="14" height="96" fill="#9AA6A1"/><rect x="190" y="210" width="220" height="140" rx="8" fill="#2E3A36"/><rect x="200" y="220" width="200" height="120" fill="#DCEBE6"/><path d="M215 248h90M215 270h140M215 292h70" stroke="#477A58" stroke-width="7" stroke-linecap="round"/><rect x="290" y="350" width="22" height="12" fill="#2E3A36"/>${windowFrame(580, 60, 170, 300)}${P('zz-plant', 120, 360, 0.5)}<rect x="440" y="316" width="46" height="44" rx="6" fill="#fff"/>`);
    default: return '';
  }
}

// ---------- hero (1600×1000) ----------
function hero() {
  const P = (slug, x, y, s) => place(plantArt(slug), x, y, s);
  return svgDoc(1600, 1000, `<defs><linearGradient id="hw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8F6EF"/><stop offset=".55" stop-color="#E5F0E5"/><stop offset="1" stop-color="#C9DEC8"/></linearGradient><linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE0EE"/><stop offset="1" stop-color="#FBF7E4"/></linearGradient><radialGradient id="hl" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFF6D2" stop-opacity=".8"/><stop offset="1" stop-color="#FFF6D2" stop-opacity="0"/></radialGradient></defs>
<rect width="1600" height="1000" fill="url(#hw)"/>
<path d="M1000 120h340V760H1000Z M1000 340" fill="none"/>
<path d="M1010 760V330A165 165 0 0 1 1340 330V760Z" fill="url(#hs)" stroke="#FFFFFF" stroke-width="16"/><path d="M1175 165V760M1010 470H1340" stroke="#fff" stroke-width="10"/><ellipse cx="1090" cy="300" rx="70" ry="16" fill="rgba(255,255,255,.85)"/><ellipse cx="1260" cy="240" rx="50" ry="12" fill="rgba(255,255,255,.7)"/>
<path d="M1040 770L1500 1000H820Z" fill="url(#hl)"/>
<rect y="760" width="1600" height="240" fill="#CDB391"/>${[...Array(8)].map((_, i) => `<path d="M0 ${790 + i * 28}H1600" stroke="rgba(0,0,0,.06)" stroke-width="3"/>`).join('')}<rect y="752" width="1600" height="10" fill="rgba(255,255,255,.55)"/>
<ellipse cx="1180" cy="905" rx="460" ry="64" fill="rgba(168,189,165,.5)"/>
<rect x="1360" y="560" width="200" height="22" rx="6" fill="#9C7348"/><rect x="1380" y="582" width="16" height="180" fill="#8A6540"/><rect x="1520" y="582" width="16" height="180" fill="#8A6540"/>
${P('monstera-deliciosa', 800, 900, 1.5)}${P('fiddle-leaf-fig', 1560, 800, 1.1).replace('', '')}${P('golden-pothos', 1460, 560, 0.8)}${P('snake-plant', 1220, 880, 1.15)}${P('peace-lily', 1010, 910, 0.78)}${P('echeveria-elegans', 1330, 905, 0.8)}
<rect x="1080" y="90" width="150" height="190" fill="#fff" stroke="#9C7348" stroke-width="10" transform="translate(300 40)"/><path d="M1400 290q50 -110 100 -110q-6 70 -100 110Z" fill="#A8BDA5"/>`);
}

// ---------- category tiles ----------
const CAT_ART = {
  'indoor-plants': () => plantArt('monstera-deliciosa'), 'outdoor-plants': () => plantArt('hibiscus'), succulents: () => plantArt('echeveria-elegans'),
  'flowering-plants': () => plantArt('phalaenopsis-orchid'), seeds: () => supplyArt('marigold-seeds'), 'pots-planters': () => supplyArt('terracotta-pot-set'),
  'gardening-tools': () => supplyArt('pruning-shears'), 'soil-fertilizers': () => supplyArt('premium-potting-mix'),
  'plant-accessories': () => supplyArt('clip-on-grow-light'), 'plant-kits': () => supplyArt('beginner-plant-kit'),
};

const fallback = svgDoc(600, 600, `<rect width="600" height="600" fill="#E5F0E5"/><circle cx="300" cy="280" r="150" fill="#F8F6EF"/><g transform="translate(300 380)">${leaf(0, 0, -28, 190, 70, '#477A58')}${leaf(0, 0, 30, 170, 62, '#244C3A')}${leaf(0, 0, 0, 215, 56, '#6A9E73')}</g><text x="300" y="520" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#477A58">Plantify</text>`);
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#244C3A"/><path d="M32 52V30" stroke="#E5F0E5" stroke-width="3.5" stroke-linecap="round"/><path d="M32 32C18 32 12 22 13 12c12-1 19 5 19 20Z" fill="#A8BDA5"/><path d="M32 40c12 0 19-8 19-20-12 0-19 7-19 20Z" fill="#E5F0E5"/></svg>`;

// ---------- run ----------
const products = buildCatalogue();
let n = 0;
products.forEach((p, i) => {
  const art = artFor(p);
  art.plant = p.isPlant;
  write(`images/products/${p.slug}.svg`, mainView(art, p.category));
  write(`images/products/${p.slug}-detail.svg`, detailView(art, p.category, p.slug));
  write(`images/products/${p.slug}-scene.svg`, sceneView(art, p.category, p.slug, i));
  n += 3;
});
for (const [slug, fn] of Object.entries(CAT_ART)) { write(`images/categories/${slug}.svg`, mainView(fn(), slug)); n++; }
for (const r of ['bedroom', 'living-room', 'study', 'bathroom', 'balcony', 'office']) { write(`images/rooms/${r}.svg`, room(r)); n++; }
write('images/hero.svg', hero()); write('images/fallback.svg', fallback); write('favicon.svg', favicon);
console.log(`Generated ${n + 3} SVG files into ${root}`);

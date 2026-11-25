// Transparent keyword + intent search over the in-memory catalogue (a few hundred products at most).
// For a much larger catalogue, move this to MongoDB text indexes or Atlas Search.

const STOP = new Set(['the', 'a', 'an', 'for', 'and', 'of', 'in', 'my', 'to', 'with', 'that', 'are', 'is', 'i', 'need', 'want', 'best', 'good']);

export const POPULAR_QUERIES = ['low light', 'pet safe', 'beginner', 'succulents', 'watering', 'herbs', 'hanging', 'desk plant', 'balcony', 'gift'];

export function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tokenize(q) {
  const raw = String(q || '')
    .toLowerCase()
    .replace(/[^a-z0-9’' -]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const kept = raw.filter((t) => !STOP.has(t));
  return (kept.length ? kept : raw).map(stem);
}

const has = (arr, v) => Array.isArray(arr) && arr.includes(v);
const tagHas = (p, ...words) => words.some((w) => (p.tags || []).some((t) => t.includes(w)));

// Intent rules: phrases that map to structured product attributes.
const RULES = [
  { re: /\b(low[- ]?light|shade|shady|dark|dim|no sun|little light)\b/, score: (p) => (p.isPlant && has(p.lightTolerance, 'low') ? 14 : tagHas(p, 'low light', 'grow light') ? 8 : 0) },
  { re: /\b(bright|sunny|full sun|sun lovers?|direct sun|south[- ]facing)\b/, score: (p) => (p.light === 'bright-direct' ? 10 : 0) },
  { re: /\b(pets?|cats?|dogs?|kids?|non[- ]?toxic)\b|\bpet[- ]?(safe|friendly)\b/, score: (p) => (p.petSafe === 'safe' ? 14 : 0) },
  { re: /\b(easy|beginners?|low[- ]?maintenance|hard to kill|first plant|forgiving|starter)\b/, score: (p) => (p.difficulty === 'easy' ? 10 : tagHas(p, 'beginner') ? 8 : 0) },
  { re: /\b(water|watering|irrigat\w*)\b/, score: (p) => (p.subcategory === 'Watering Tools' ? 14 : tagHas(p, 'watering', 'moisture') ? 10 : 0) },
  { re: /\b(hanging|trailing|vine|climber)\b/, score: (p) => (tagHas(p, 'hanging', 'trailing', 'climber') ? 10 : 0) },
  { re: /\b(flowers?|flowering|blooms?|blossoms?)\b/, score: (p) => (p.plantType === 'flowering' ? 10 : tagHas(p, 'flower') ? 6 : 0) },
  { re: /\b(herbs?|kitchen|edible|cooking)\b/, score: (p) => (p.plantType === 'herb' ? 12 : tagHas(p, 'herb', 'edible', 'kitchen') ? 8 : 0) },
  { re: /\b(balcony|outdoors?|terrace|garden)\b/, score: (p) => (p.placement === 'outdoor' || p.placement === 'both' ? 8 : has(p.rooms, 'balcony') ? 6 : 0) },
  { re: /\b(desk|table|tabletop|workspace)\b/, score: (p) => (has(p.spaces, 'small-desk') ? 10 : tagHas(p, 'desk') ? 8 : 0) },
  { re: /\b(gifts?|presents?|housewarming)\b/, score: (p) => (tagHas(p, 'gift') ? 12 : 0) },
  { re: /\b(succulents?|cactus|cacti)\b/, score: (p) => (p.plantType === 'succulent' ? 10 : 0) },
  { re: /\b(humid|humidity|bathroom|steamy)\b/, score: (p) => (p.humidity === 'high' || has(p.rooms, 'bathroom') ? 8 : 0) },
  { re: /\b(pests?|bugs?|insects?|mealybugs?|aphids?)\b/, score: (p) => (tagHas(p, 'pest') ? 14 : 0) },
  { re: /\b(fertili[sz]ers?|feed|feeding|nutrients?)\b/, score: (p) => (p.category === 'soil-fertilizers' && p.subcategory === 'Fertilizers' ? 14 : 0) },
];

function fieldScore(token, p) {
  const name = p.name.toLowerCase();
  const words = name.split(/[^a-z0-9’']+/).filter(Boolean).map(stem);
  let best = 0;
  if (words.includes(token)) best = Math.max(best, 10);
  else if (words.some((w) => w.startsWith(token)) && token.length >= 3) best = Math.max(best, 8);
  if ((p.botanicalName || '').toLowerCase().includes(token) && token.length >= 3) best = Math.max(best, 8);
  if ((p.tags || []).some((t) => t.split(/\s+/).map(stem).includes(token) || (token.length >= 4 && t.includes(token)))) best = Math.max(best, 6);
  if ([p.category, p.subcategory, p.plantType].filter(Boolean).some((v) => v.toLowerCase().replace(/-/g, ' ').includes(token))) best = Math.max(best, 5);
  if (best < 5 && (p.description || '').toLowerCase().includes(token) && token.length >= 4) best = Math.max(best, 2);
  if (best < 2) {
    const careText = p.care ? Object.values(p.care).flat().filter((v) => typeof v === 'string').join(' ').toLowerCase() : '';
    if (token.length >= 4 && careText.includes(token)) best = 1;
  }
  return best;
}

export function scoreProduct(p, q, tokens = tokenize(q)) {
  const phrase = String(q || '').toLowerCase();
  let score = 0;
  let matchedTokens = 0;
  for (const t of tokens) {
    const s = fieldScore(t, p);
    if (s > 0) matchedTokens += 1;
    score += s;
  }
  let intent = 0;
  for (const r of RULES) if (r.re.test(phrase)) intent += r.score(p);
  // Several tokens: reward products that match most of them.
  if (tokens.length > 1) score += matchedTokens === tokens.length ? 6 : 0;
  return score + intent > 0 && (matchedTokens > 0 || intent > 0) ? score + intent : 0;
}

export function searchProducts(products, q) {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  return products
    .map((p) => ({ p, s: scoreProduct(p, q, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.popularity - a.p.popularity)
    .map((x) => x.p);
}

export function searchGuides(guides, q) {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  return guides
    .map((g) => {
      const title = g.title.toLowerCase();
      const hay = `${g.summary} ${g.sections.map((s) => `${s.heading} ${s.body}`).join(' ')}`.toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (title.includes(t)) s += 10;
        if ((g.tags || []).some((x) => x.includes(t))) s += 8;
        if (g.summary.toLowerCase().includes(t)) s += 3;
        if (hay.includes(t)) s += 1;
      }
      return { g, s };
    })
    .filter((x) => x.s >= 8)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.g);
}

/** Autocomplete suggestions: products, categories, popular queries and guides. */
export function suggest(q, { products, categories, guides }, limit = 8) {
  const text = String(q || '').trim().toLowerCase();
  if (!text) return POPULAR_QUERIES.slice(0, 6).map((label) => ({ type: 'query', label, value: label }));
  const out = [];
  const push = (s) => {
    if (!out.some((o) => o.type === s.type && o.value === s.value)) out.push(s);
  };
  for (const p of products) {
    if (p.name.toLowerCase().includes(text) || (p.botanicalName || '').toLowerCase().includes(text)) {
      push({ type: 'product', label: p.name, value: p.slug, image: p.image, price: p.price });
    }
    if (out.length >= 5) break;
  }
  for (const c of categories) if (c.name.toLowerCase().includes(text)) push({ type: 'category', label: c.name, value: c.slug });
  for (const label of POPULAR_QUERIES) if (label.includes(text) || text.includes(label)) push({ type: 'query', label, value: label });
  for (const g of guides) if (g.title.toLowerCase().includes(text)) push({ type: 'guide', label: g.title, value: g.slug });
  if (out.length < 3) {
    // Fall back to the best semantic matches so "low light" style queries still suggest plants.
    for (const p of searchProducts(products, text).slice(0, 3)) push({ type: 'product', label: p.name, value: p.slug, image: p.image, price: p.price });
  }
  return out.slice(0, limit);
}

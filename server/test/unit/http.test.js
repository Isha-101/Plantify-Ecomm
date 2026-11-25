// HTTP-layer tests that run without MongoDB: the catalogue models are stubbed with the real seed data,
// so routing, validation, filtering, sorting, search and the feature endpoints are exercised end to end.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Product } from '../../src/models/Product.js';
import { Category } from '../../src/models/Category.js';
import { createApp } from '../../src/app.js';
import { buildCatalogue, categories } from '../../src/seed/catalogue.js';

mongoose.set('bufferCommands', false);

let server;
let base;
let docs;

before(async () => {
  const cat = buildCatalogue();
  docs = cat.map(({ kitSlugs, ...p }) => new Product(p));
  const idBySlug = new Map(docs.map((d) => [d.slug, d._id]));
  cat.filter((p) => p.kitSlugs).forEach((k) => {
    docs.find((d) => d.slug === k.slug).kitItems = k.kitSlugs.map(({ slug, quantity }) => ({ product: idBySlug.get(slug), quantity }));
  });
  Product.find = async (filter = {}) => {
    const ids = filter._id?.$in;
    return ids ? docs.filter((d) => ids.map(String).includes(String(d._id))) : docs;
  };
  Product.findOne = async ({ slug }) => docs.find((d) => d.slug === slug) || null;
  Product.findById = async (id) => docs.find((d) => String(d._id) === String(id)) || null;
  Product.aggregate = async () => Object.entries(docs.reduce((m, d) => ({ ...m, [d.category]: (m[d.category] || 0) + 1 }), {})).map(([_id, n]) => ({ _id, n }));
  Category.find = () => ({ sort: async () => categories.map((c) => new Category(c)) });

  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server?.close());

const get = async (path, headers = {}) => {
  const r = await fetch(base + path, { headers });
  return { status: r.status, body: await r.json() };
};
const post = async (path, body, headers = {}) => {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};

test('health, unknown routes and malformed JSON', async () => {
  assert.equal((await get('/health')).body.ok, true);
  const nf = await get('/nope');
  assert.equal(nf.status, 404);
  const bad = await post('/compatibility/check', '{not json');
  assert.equal(bad.status, 400);
});

test('requests carrying an unlisted Origin (e.g. the built client served by this app) are not rejected', async () => {
  // The Vite build adds `crossorigin` to its module scripts, so browsers send an Origin header even for same-origin loads.
  const own = new URL(base).origin;
  const same = await fetch(`${base}/health`, { headers: { Origin: own } });
  assert.equal(same.status, 200);
  const other = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(other.status, 200);
  assert.equal(other.headers.get('access-control-allow-origin'), null, 'no CORS headers for unlisted origins');
});

test('protected routes require a token', async () => {
  for (const p of ['/cart', '/wishlist', '/orders', '/garden', '/auth/me', '/planner/plans']) assert.equal((await get(p)).status, 401, p);
  assert.equal((await get('/cart', { Authorization: 'Bearer garbage' })).status, 401);
});

test('auth validation errors are field-level', async () => {
  const r = await post('/auth/register', { name: 'A', email: 'x', password: 'short' });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.name && r.body.errors.email && r.body.errors.password);
  const l = await post('/auth/login', { email: 'nope' });
  assert.equal(l.status, 400);
});

test('product listing: pagination, count, categories', async () => {
  const r = await get('/products?limit=12');
  assert.equal(r.body.products.length, 12);
  assert.ok(r.body.total >= 55 && r.body.pages >= 5);
  const cat = await get('/products?category=succulents&limit=60');
  assert.ok(cat.body.products.length >= 6 && cat.body.products.every((p) => p.category === 'succulents'));
  const cats = await get('/categories');
  assert.equal(cats.body.categories.length, 10);
});

test('product filters: price, type, difficulty, light, pets, placement, rating', async () => {
  const q = async (qs) => (await get(`/products?limit=60&${qs}`)).body.products;
  assert.ok((await q('minPrice=300&maxPrice=500')).every((p) => p.price >= 300 && p.price <= 500));
  assert.ok((await q('plantType=herb')).every((p) => p.plantType === 'herb'));
  assert.ok((await q('difficulty=hard')).every((p) => p.difficulty === 'hard'));
  assert.ok((await q('light=low')).every((p) => p.lightTolerance.includes('low')));
  assert.ok((await q('petSafe=safe')).every((p) => p.petSafe === 'safe'));
  assert.ok((await q('placement=outdoor')).every((p) => ['outdoor', 'both'].includes(p.placement)));
  assert.ok((await q('minRating=4.7')).every((p) => p.rating >= 4.7));
  assert.ok((await q('room=bathroom')).length > 0);
  assert.ok((await q('beginner=true')).every((p) => p.difficulty === 'easy'));
  assert.equal((await q('plantType=herb&difficulty=hard')).length, 0);
});

test('sorting: price, rating, popularity, newest', async () => {
  const s = async (sort) => (await get(`/products?limit=60&sort=${sort}`)).body.products;
  const asc = (await s('price-asc')).map((p) => p.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const desc = (await s('price-desc')).map((p) => p.price);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  const rating = (await s('rating')).map((p) => p.rating);
  assert.deepEqual(rating, [...rating].sort((a, b) => b - a));
  const pop = (await s('popularity')).map((p) => p.popularity);
  assert.deepEqual(pop, [...pop].sort((a, b) => b - a));
  const newest = (await s('newest')).map((p) => +new Date(p.createdAt));
  assert.deepEqual(newest, [...newest].sort((a, b) => b - a));
});

test('search inside the listing, global search and no-results suggestions', async () => {
  const snake = await get('/products?search=snake');
  assert.equal(snake.body.products[0].slug, 'snake-plant');
  const low = await get('/search?q=low%20light');
  assert.ok(low.body.productCount >= 6 && low.body.products.some((p) => p.slug === 'snake-plant'));
  const water = await get('/search?q=watering');
  assert.ok(water.body.guides.some((g) => g.slug === 'watering-101'));
  assert.ok(water.body.products.some((p) => p.subcategory === 'Watering Tools'));
  const none = await get('/search?q=zzzqqq');
  assert.equal(none.body.total, 0);
  assert.ok(none.body.suggestedProducts.length >= 3);
  const sug = await get('/products/suggest?q=mon');
  assert.ok(sug.body.suggestions.some((s) => s.label.includes('Monstera')));
});

test('product details include related, compatible products and kit contents', async () => {
  const d = await get('/products/snake-plant');
  assert.equal(d.body.product.name, 'Snake Plant');
  assert.ok(d.body.product.care.tips.length >= 2);
  assert.ok(d.body.related.length === 4 && d.body.compatible.length >= 2);
  assert.ok(d.body.product.discountPercent > 0);
  const kit = await get('/products/beginner-plant-kit');
  assert.ok(kit.body.kitContents.length === 5);
  assert.equal((await get('/products/not-a-product')).status, 404);
});

test('guest cart quote prices, clamps stock and applies kit and coupon discounts', async () => {
  const ids = Object.fromEntries(docs.map((d) => [d.slug, String(d._id)]));
  const kitId = 'kit-test1';
  const r = await post('/cart/quote', {
    items: [
      { productId: ids['snake-plant'], quantity: 1, kitId, kitName: 'Test' },
      { productId: ids['terracotta-pot-set'], quantity: 1, kitId, kitName: 'Test' },
      { productId: ids['cactus-succulent-mix'], quantity: 1, kitId, kitName: 'Test' },
      { productId: ids['fiddle-leaf-fig'], quantity: 500 },
    ],
    coupon: 'plant10',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.pricing.kitDiscount, 57.35);
  assert.equal(r.body.pricing.coupon.code, 'PLANT10');
  const fig = r.body.items.find((i) => i.product.slug === 'fiddle-leaf-fig');
  assert.equal(fig.quantity, 8);
  assert.equal(fig.stockIssue, 'limited');
  assert.equal(r.body.pricing.hasStockIssues, true);
  assert.equal((await post('/cart/quote', { items: [] })).body.pricing.total, 0);
});

test('Plant Matchmaker endpoints', async () => {
  const q = await get('/matchmaker/questions');
  assert.equal(q.body.questions.length, 7);
  const bad = await post('/matchmaker/recommend', { answers: { space: 'bedroom' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.light);
  const ok = await post('/matchmaker/recommend', { answers: { space: 'study', light: 'low', time: 'minimal', experience: 'beginner', types: ['any'], size: 'small-desk', pets: 'yes' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.results.length >= 3 && ok.body.results.every((r) => r.score <= 100 && r.product.petSafe !== 'toxic'));
  assert.ok(ok.body.personality.title && ok.body.summary.length === 7 && ok.body.excluded.length > 0);
  assert.ok(ok.body.results[0].breakdown.length === 6);
});

test('compatibility checker, kit builder and room planner endpoints', async () => {
  const ids = Object.fromEntries(docs.map((d) => [d.slug, String(d._id)]));
  const c = await post('/compatibility/check', { productIds: [ids['snake-plant'], ids['zz-plant']] });
  assert.equal(c.body.verdict.tone, 'great');
  assert.equal((await post('/compatibility/check', { productIds: [ids['snake-plant']] })).status, 400);
  assert.equal((await post('/compatibility/check', { productIds: [ids['snake-plant'], ids['terracotta-pot-set']] })).status, 400);

  const k = await post('/kits/custom/quote', { items: [{ productId: ids['snake-plant'] }, { productId: ids['terracotta-pot-set'] }, { productId: ids['cactus-succulent-mix'] }] });
  assert.equal(k.body.kit.discountPct, 5);
  assert.equal((await post('/kits/custom/quote', { items: [] })).status, 400);
  const builder = await get('/kits/builder');
  assert.ok(builder.body.roles.find((r) => r.role === 'plant').products.length >= 25);
  assert.equal((await get('/kits')).body.kits.length, 6);

  const plan = await post('/planner/suggest', { room: 'living-room', size: 'medium', windowSide: 'west', windowLight: 'bright-indirect' });
  assert.ok(plan.body.placements.length >= 3 && plan.body.map.rows === 5);
  const ev = await post('/planner/evaluate', { room: 'living-room', size: 'medium', windowSide: 'south', windowLight: 'bright-direct', placements: [{ x: 0, y: 0, productId: ids['aloe-vera'] }, { x: 0, y: 0, productId: ids['jade-plant'] }] });
  assert.equal(ev.status, 400);
});

test('Plant SOS and care content endpoints', async () => {
  const cfg = await get('/care/sos/config');
  assert.ok(cfg.body.groups.length === 4);
  const d = await post('/care/sos/diagnose', { symptoms: ['yellow-lower', 'drooping'], context: { soil: 'soggy' } });
  assert.equal(d.body.diagnoses[0].id, 'overwatering');
  assert.ok(d.body.diagnoses[0].products.length >= 1);
  assert.equal((await post('/care/sos/diagnose', { symptoms: [] })).status, 400);
  const pest = await post('/care/sos/diagnose', { symptoms: ['white-fluff'], productId: String(docs.find((x) => x.slug === 'monstera-deliciosa')._id) });
  assert.ok(pest.body.diagnoses[0].products.some((p) => p.slug === 'neem-oil-spray'));
  assert.ok((await get('/care/guides')).body.guides.length >= 10);
  assert.equal((await get('/care/guides/watering-101')).body.guide.sections.length, 4);
  assert.equal((await get('/care/guides/nope')).status, 404);
  const sheets = await get('/care/plants?light=low&petSafe=safe');
  assert.ok(sheets.body.plants.length >= 1 && sheets.body.plants.every((p) => p.care && p.petSafe === 'safe'));
});

test('newsletter and contact validate input before touching the database', async () => {
  assert.equal((await post('/newsletter', { email: 'not-an-email' })).status, 400);
  assert.equal((await post('/contact', { name: 'A' })).status, 400);
  assert.ok((await get('/coupons')).body.coupons.length >= 3);
});

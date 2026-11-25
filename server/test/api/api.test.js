// Full-stack API tests against a REAL MongoDB.
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/plantify_test npm run test:api
// The database name must contain "test" – it is seeded and then DROPPED at the end.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { seedCatalogue } from '../../src/seed/seed.js';

const URI = process.env.TEST_MONGODB_URI;
const dbName = URI ? new URL(URI).pathname.replace('/', '') : '';
const skip = !URI ? 'Set TEST_MONGODB_URI to a throwaway MongoDB to run these tests.' : !/test/i.test(dbName) ? 'Refusing to run: the database name must contain "test".' : false;

describe('Plantify API (live MongoDB)', { skip }, () => {
  let server;
  let base;
  let token = '';
  const ids = {};
  const email = `tester${Date.now()}@example.com`;

  const call = async (method, path, body, auth = true) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-TZ-Offset': '330', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };

  before(async () => {
    await connectDB(URI);
    await mongoose.connection.dropDatabase();
    await seedCatalogue({ log: () => {} });
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}/api`;
    const all = (await call('GET', '/products?limit=60', undefined, false)).body.products;
    for (const p of all) ids[p.slug] = p.id;
  });

  after(async () => {
    server?.close();
    if (!skip) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('seeds 30+ products with images', async () => {
    assert.ok(Object.keys(ids).length >= 55);
    const r = await call('GET', '/products/snake-plant', undefined, false);
    assert.ok(r.body.product.image.endsWith('.svg'));
    assert.equal((await call('GET', '/products?limit=60&category=plant-kits', undefined, false)).body.total, 6);
  });

  it('registers, rejects duplicates, logs in and reads the profile', async () => {
    const reg = await call('POST', '/auth/register', { name: 'Test Gardener', email, password: 'Plantify123' }, false);
    assert.equal(reg.status, 201);
    assert.ok(reg.body.token && !('password' in reg.body.user));
    token = reg.body.token;
    assert.equal((await call('POST', '/auth/register', { name: 'Again', email, password: 'Plantify123' }, false)).status, 400);
    assert.equal((await call('POST', '/auth/login', { email, password: 'wrong-pass1' }, false)).status, 401);
    const login = await call('POST', '/auth/login', { email: email.toUpperCase(), password: 'Plantify123' }, false);
    assert.equal(login.status, 200);
    const me = await call('GET', '/auth/me');
    assert.equal(me.body.user.email, email);
    const upd = await call('PUT', '/auth/me', { name: 'Test G.', preferences: { experience: 'intermediate', preferredTypes: ['foliage'], pets: 'no' } });
    assert.equal(upd.body.user.preferences.experience, 'intermediate');
  });

  it('cart: add, stock limits, quantity, remove, merge', async () => {
    let r = await call('POST', '/cart/items', { productId: ids['golden-pothos'], quantity: 2 });
    assert.equal(r.status, 201);
    assert.equal(r.body.pricing.subtotal, 498);
    assert.equal(r.body.pricing.shipping, 79);
    r = await call('POST', '/cart/items', { productId: ids['fiddle-leaf-fig'], quantity: 99 });
    assert.equal(r.status, 409);
    r = await call('PATCH', `/cart/items/${ids['golden-pothos']}`, { quantity: 3 });
    assert.equal(r.body.items[0].quantity, 3);
    r = await call('DELETE', `/cart/items/${ids['golden-pothos']}`);
    assert.equal(r.body.items.length, 0);
    r = await call('POST', '/cart/merge', { items: [{ productId: ids['golden-pothos'], quantity: 2 }, { productId: ids['spider-plant'], quantity: 1 }] });
    assert.equal(r.body.items.length, 2);
  });

  it('wishlist: add, list, remove', async () => {
    assert.equal((await call('POST', `/wishlist/${ids['monstera-deliciosa']}`)).status, 201);
    assert.equal((await call('GET', '/wishlist')).body.products.length, 1);
    assert.equal((await call('DELETE', `/wishlist/${ids['monstera-deliciosa']}`)).body.products.length, 0);
  });

  it('checkout: validates, declines safely, then places an order and updates stock', async () => {
    const before = (await call('GET', '/products/golden-pothos', undefined, false)).body.product.stock;
    const address = { fullName: 'Test Gardener', phone: '9876543210', line1: '12 Garden Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' };

    let r = await call('POST', '/orders', { shippingAddress: { ...address, pincode: '12' }, paymentMethod: 'cod' });
    assert.equal(r.status, 400);
    r = await call('POST', '/orders', { shippingAddress: address, paymentMethod: 'card', payment: { cardNumber: '4000000000000002', cardName: 'Test', expiry: '12/40', cvv: '123' } });
    assert.equal(r.status, 402);
    assert.equal((await call('GET', '/products/golden-pothos', undefined, false)).body.product.stock, before, 'declined payment must not change stock');

    r = await call('POST', '/orders', { shippingAddress: address, paymentMethod: 'card', payment: { cardNumber: '4242 4242 4242 4242', cardName: 'Test Gardener', expiry: '12/40', cvv: '123' } });
    assert.equal(r.status, 201);
    const order = r.body.order;
    assert.match(order.orderNumber, /^PLT-\d{6}-[0-9A-F]{6}$/);
    assert.equal(order.payment.status, 'paid');
    assert.equal(order.payment.reference, 'Visa •••• 4242');
    assert.equal(order.items.length, 2);
    assert.equal(order.pricing.total, 249 * 2 + 299 + 79); // ₹797 of items + ₹79 shipping (below the ₹999 free-shipping line)
    assert.equal(order.timeline.length, 5);
    assert.ok(r.body.rewards.newBadges.some((b) => b.key === 'first-order'));
    assert.equal((await call('GET', '/products/golden-pothos', undefined, false)).body.product.stock, before - 2);
    assert.equal((await call('GET', '/cart')).body.items.length, 0, 'cart is cleared');

    ids.order = order.orderNumber;
    assert.equal((await call('POST', '/orders', { shippingAddress: address, paymentMethod: 'cod' })).status, 400, 'empty cart');
  });

  it('orders: history, details and simulated tracking', async () => {
    assert.equal((await call('GET', '/orders')).body.orders.length, 1);
    let r = await call('GET', `/orders/${ids.order}`);
    assert.equal(r.body.order.status, 'Order Placed');
    r = await call('POST', `/orders/${ids.order}/advance`);
    assert.equal(r.body.order.status, 'Processing');
    assert.equal((await call('GET', '/orders/PLT-000000-NOPE00')).status, 404);
  });

  it('reviews update the product rating and are limited to one per user', async () => {
    const before = (await call('GET', '/products/golden-pothos', undefined, false)).body.product;
    let r = await call('POST', '/products/golden-pothos/reviews', { rating: 5, comment: 'Thriving on my desk!' });
    assert.equal(r.status, 201);
    assert.equal(r.body.numReviews, before.numReviews + 1);
    r = await call('POST', '/products/golden-pothos/reviews', { rating: 3, comment: 'Updated my thoughts.' });
    assert.equal(r.status, 200);
    assert.equal(r.body.numReviews, before.numReviews + 1);
    assert.ok(r.body.reviews.some((x) => x.verifiedPurchase));
    assert.equal((await call('POST', '/products/golden-pothos/reviews', { rating: 9, comment: 'x' })).status, 400);
  });

  it('matchmaker saves the last match and awards a badge when signed in', async () => {
    const answers = { space: 'study', light: 'low', time: 'minimal', experience: 'beginner', types: ['any'], size: 'small-desk', pets: 'no' };
    const r = await call('POST', '/matchmaker/recommend', { answers });
    assert.equal(r.status, 200);
    assert.ok(r.body.greeting.startsWith('Hello'));
    assert.ok(r.body.rewards.newBadges.some((b) => b.key === 'plant-matchmaker'));
    assert.ok((await call('GET', '/matchmaker/last')).body.lastMatch.personality);
    const saved = await call('POST', '/matchmaker/save-preferences', { answers });
    assert.equal(saved.body.user.preferences.lightConditions, 'low');
  });

  it('My Garden: add plant, care log (points, dedupe), diary, growth, calendar, stats', async () => {
    let r = await call('POST', '/garden', { productId: ids['snake-plant'], nickname: 'Sir Snake', location: 'bedroom' });
    assert.equal(r.status, 201);
    const pid = r.body.plant.id;
    assert.equal(r.body.rewards.gained, 20);
    assert.equal(r.body.plant.tasks.length, 8);

    r = await call('POST', `/garden/${pid}/care`, { type: 'water' });
    assert.equal(r.status, 201);
    assert.equal(r.body.rewards.gained, 5);
    assert.equal(r.body.rewards.summary.streak.current, 1);
    r = await call('POST', `/garden/${pid}/care`, { type: 'water' });
    assert.equal(r.body.rewards.gained, 0, 'same plant + same task + same day earns no extra points');

    r = await call('POST', `/garden/${pid}/diary`, { note: 'New leaf today!', mood: 'great', health: 5 });
    assert.equal(r.body.plant.diary.length, 1);
    r = await call('POST', `/garden/${pid}/growth`, { heightCm: 42, leafCount: 9 });
    assert.equal(r.body.plant.latestHeightCm, 42);
    assert.equal((await call('POST', `/garden/${pid}/growth`, { heightCm: -3 })).status, 400);

    const cal = await call('GET', '/garden/calendar');
    assert.ok(cal.body.month && typeof cal.body.days === 'object' && cal.body.season.name);
    const stats = await call('GET', '/garden/stats');
    assert.ok(stats.body.gamification.points >= 40);
    assert.equal(stats.body.activity.length, 14);
    assert.ok(stats.body.gamification.badges.find((b) => b.key === 'first-sprout').earned);

    r = await call('PUT', `/garden/${pid}`, { nickname: 'Sir Snake II', tasks: [{ type: 'water', intervalDays: 10, enabled: true }] });
    assert.equal(r.body.plant.nickname, 'Sir Snake II');
    assert.equal(r.body.plant.tasks.find((t) => t.type === 'water').intervalDays, 10);
    assert.equal((await call('GET', '/garden/reminders')).status, 200);
    assert.equal((await call('POST', '/garden', { productId: ids['terracotta-pot-set'], nickname: 'Pot' })).status, 400, 'only plants can be added');
    assert.equal((await call('DELETE', `/garden/${pid}`)).status, 200);
    assert.equal((await call('GET', `/garden/${pid}`)).status, 404);
  });

  it('Plant SOS records the diagnosis for a garden plant', async () => {
    const p = await call('POST', '/garden', { productId: ids['peace-lily'], nickname: 'Lily' });
    const r = await call('POST', '/care/sos/diagnose', { symptoms: ['yellow-lower', 'moldy-soil'], context: { soil: 'soggy' }, gardenPlantId: p.body.plant.id });
    assert.equal(r.body.diagnoses[0].id, 'overwatering');
    assert.ok(r.body.rewards.newBadges.some((b) => b.key === 'plant-doctor'));
    assert.equal((await call('GET', `/garden/${p.body.plant.id}`)).body.plant.lastSos.problem, 'Overwatering');
  });

  it('custom kit goes into the cart with the bundle discount', async () => {
    const items = ['snake-plant', 'terracotta-pot-set', 'cactus-succulent-mix', 'liquid-plant-food'].map((s) => ({ productId: ids[s], quantity: 1 }));
    const r = await call('POST', '/kits/custom/add-to-cart', { items, name: 'Desk starter' });
    assert.equal(r.status, 201);
    assert.equal(r.body.cart.pricing.kitDiscount, Math.round(1426 * 0.08 * 100) / 100);
    assert.ok(r.body.rewards.newBadges.some((b) => b.key === 'kit-creator'));
    await call('DELETE', '/cart');
  });

  it('room planner: save, list and delete plans', async () => {
    const body = { name: 'Living room', room: 'living-room', size: 'medium', windowSide: 'south', windowLight: 'bright-direct', placements: [{ x: 2, y: 4, productId: ids['aloe-vera'] }, { x: 4, y: 4, productId: ids['jade-plant'] }] };
    const r = await call('POST', '/planner/plans', body);
    assert.equal(r.status, 201);
    assert.ok(r.body.plan.score >= 80);
    assert.equal((await call('GET', '/planner/plans')).body.plans.length, 1);
    assert.equal((await call('DELETE', `/planner/plans/${r.body.plan.id}`)).status, 200);
  });

  it('newsletter stores one subscriber per email', async () => {
    assert.equal((await call('POST', '/newsletter', { email: 'friend@example.com' }, false)).status, 201);
    const again = await call('POST', '/newsletter', { email: 'FRIEND@example.com' }, false);
    assert.equal(again.status, 200);
    assert.equal(again.body.alreadySubscribed, true);
  });
});

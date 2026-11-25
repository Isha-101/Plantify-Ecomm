import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { User } from '../../src/models/User.js';
import { Order, ORDER_STATUSES } from '../../src/models/Order.js';
import { GardenPlant } from '../../src/models/GardenPlant.js';
import { Review } from '../../src/models/Review.js';
import { RoomPlan, Subscriber, ContactMessage } from '../../src/models/misc.js';
import { publicUser, toIdString } from '../../src/services/serialize.js';
import { applyAction, evaluateBadges, gamificationSummary } from '../../src/services/gamification.js';
import { buildPlantFromProduct, serializePlant, weeklyChallenges } from '../../src/services/gardenService.js';
import { refreshStatus, orderView } from '../../src/routes/orders.js';
import { cleanKit } from '../../src/services/cartService.js';
import { bySlug } from './helpers.js';
import { config } from '../../src/config/env.js';

mongoose.set('bufferCommands', false); // never wait for a database in these offline tests

test('passwords are hashed with bcrypt before saving and never serialised', async () => {
  const u = new User({ name: 'Asha', email: 'ASHA@Example.com', password: 'Secret123' });
  await assert.rejects(u.save()); // no database: the insert fails, but the pre-save hook has already run
  assert.match(u.password, /^\$2[aby]\$12\$/);
  assert.notEqual(u.password, 'Secret123');
  assert.equal(await u.comparePassword('Secret123'), true);
  assert.equal(await u.comparePassword('wrong'), false);
  assert.equal(u.email, 'asha@example.com');
  assert.equal('password' in u.toJSON(), false);
  assert.equal('password' in publicUser(u), false);
});

test('user validation rejects bad emails and short names', () => {
  const err = new User({ name: 'A', email: 'nope', password: 'x' }).validateSync();
  assert.ok(err.errors.name && err.errors.email);
});

test('publicUser returns hex wishlist ids (ObjectId#id is a buffer – must not leak)', () => {
  const pid = new mongoose.Types.ObjectId();
  const u = new User({ name: 'Asha', email: 'a@b.co', password: 'Secret123', wishlist: [pid] });
  assert.deepEqual(publicUser(u).wishlist, [String(pid)]);
  assert.equal(toIdString(pid), String(pid));
  assert.equal(toIdString({ _id: pid }), String(pid));
});

test('gamification works on a real Mongoose document', () => {
  const u = new User({ name: 'Asha', email: 'a@b.co', password: 'Secret123' });
  const g = u.gamification;
  assert.equal(applyAction(g, 'addPlant', { dayKey: '2026-11-25' }).gained, 20);
  assert.equal(applyAction(g, 'water', { dayKey: '2026-11-25', plantId: 'p1' }).gained, 5);
  assert.equal(applyAction(g, 'water', { dayKey: '2026-11-25', plantId: 'p1' }).gained, 0);
  const fresh = evaluateBadges(g, { plants: 1, careLogs: 1, waterLogs: 1 });
  assert.deepEqual(fresh.map((b) => b.key), ['first-sprout']);
  const s = gamificationSummary(g, '2026-11-25');
  assert.equal(s.points, 25);
  assert.equal(s.streak.current, 1);
  assert.equal(s.badges.filter((b) => b.earned).length, 1);
});

test('garden plants are built from products and serialise with care status', () => {
  const product = bySlug['boston-fern'];
  const base = buildPlantFromProduct(product, { nickname: 'Fernie', location: 'bathroom', acquiredOn: new Date(Date.now() - 10 * 86400000) });
  const plant = new GardenPlant({ ...base, user: new mongoose.Types.ObjectId(), product: new mongoose.Types.ObjectId() });
  assert.equal(plant.validateSync(), undefined);
  plant.diary.push({ note: 'New frond!', mood: 'great', health: 5 });
  plant.growth.push({ heightCm: 30, leafCount: 12 });
  plant.careLog.push({ type: 'water' });
  const v = serializePlant(plant, { now: new Date(), tz: 330 });
  assert.equal(v.nickname, 'Fernie');
  assert.match(v.product, /^[0-9a-f]{24}$/);
  assert.ok(v.care.tasks.length === 8);
  assert.ok(v.care.overdueCount >= 1, 'a fern watered 10 days ago is overdue (every 4 days)');
  assert.equal(v.latestHeightCm, 30);
  assert.equal(v.diary.length, 1);
  assert.ok(v.diary[0].id);
  const ch = weeklyChallenges([plant.toJSON()]);
  assert.equal(ch.find((c) => c.key === 'diary-2').progress, 1);
  assert.equal(ch.find((c) => c.key === 'growth-1').done, true);
});

test('garden plant rejects an unknown care task type', () => {
  const plant = new GardenPlant({ user: new mongoose.Types.ObjectId(), nickname: 'X', tasks: [{ type: 'dance', intervalDays: 3 }] });
  assert.ok(plant.validateSync().errors['tasks.0.type']);
});

test('orders: schema, status timeline and time-based simulation', () => {
  const placed = new Date('2026-11-25T10:00:00Z');
  const order = new Order({
    orderNumber: 'PLT-261125-ABC123',
    user: new mongoose.Types.ObjectId(),
    items: [{ product: new mongoose.Types.ObjectId(), name: 'Snake Plant', unitPrice: 449, listPrice: 449, quantity: 2 }],
    payment: { method: 'cod' },
    pricing: { subtotal: 898, total: 977 },
    statusHistory: [{ status: 'Order Placed', at: placed }],
    placedAt: placed,
  });
  assert.equal(order.validateSync(), undefined);
  assert.equal(order.status, 'Order Placed');
  assert.equal(refreshStatus(order, placed.getTime() + 1000), false);
  assert.equal(refreshStatus(order, placed.getTime() + 2.5 * config.orderStageMs), true);
  assert.equal(order.status, 'Packed');
  assert.deepEqual(order.statusHistory.map((h) => h.status), ORDER_STATUSES.slice(0, 3));
  refreshStatus(order, placed.getTime() + 99 * config.orderStageMs);
  assert.equal(order.status, 'Delivered');
  const v = orderView(order);
  assert.equal(v.timeline.every((t) => t.done), true);
  assert.equal(v.timeline.at(-1).current, true);
  assert.equal(v.itemCount, 2);
  assert.ok(new Order({ ...order.toObject(), payment: { method: 'bitcoin' } }).validateSync().errors['payment.method']);
});

test('reviews, room plans, subscribers and contact messages validate', () => {
  assert.ok(new Review({ product: new mongoose.Types.ObjectId(), name: 'A', rating: 7, comment: 'ok' }).validateSync().errors.rating);
  assert.equal(new Review({ product: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), name: 'A', rating: 5, comment: 'Lovely plant' }).validateSync(), undefined);
  assert.equal(new RoomPlan({ user: new mongoose.Types.ObjectId(), name: 'Study', room: 'study', placements: [{ x: 1, y: 2, product: new mongoose.Types.ObjectId() }] }).validateSync(), undefined);
  assert.ok(new Subscriber({ email: 'bad' }).validateSync().errors.email);
  assert.ok(new ContactMessage({ name: 'A', email: 'a@b.co', message: 'short' }).validateSync().errors.message);
});

test('kit ids are sanitised', () => {
  assert.deepEqual(cleanKit('kit-1<script>', 'My kit'), { kitId: 'kit-1script', kitName: 'My kit' });
  assert.deepEqual(cleanKit('', 'x'), { kitId: undefined, kitName: undefined });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Product } from '../../src/models/Product.js';
import { catalogue, plantsOnly } from './helpers.js';
import { categories } from '../../src/seed/categories.js';

test('catalogue has 30+ products across all 10 categories', () => {
  assert.ok(catalogue.length >= 30);
  assert.equal(categories.length, 10);
  for (const c of categories) assert.ok(catalogue.some((p) => p.category === c.slug), `category ${c.slug} has products`);
});

test('every product validates against the Mongoose schema', () => {
  for (const p of catalogue) {
    const { kitSlugs, id, ...doc } = p;
    const m = new Product(doc);
    const err = m.validateSync();
    assert.equal(err, undefined, `${p.slug}: ${err?.message}`);
  }
});

test('products have no empty cards: image, price, description, gallery', () => {
  for (const p of catalogue) {
    assert.ok(p.name && p.slug && p.description.length > 20, p.slug);
    assert.ok(p.price > 0 && p.stock >= 0, p.slug);
    assert.match(p.image, /^\/images\/products\/.+\.svg$/);
    assert.equal(p.gallery.length, 3);
    assert.ok(p.rating >= 0 && p.numReviews > 0, p.slug);
  }
});

test('plants carry the attributes the Matchmaker needs', () => {
  assert.ok(plantsOnly.length >= 25);
  for (const p of plantsOnly) {
    for (const k of ['plantType', 'difficulty', 'light', 'careTime', 'petSafe', 'placement', 'humidity', 'soilType']) assert.ok(p[k], `${p.slug}.${k}`);
    assert.ok(p.lightTolerance.length >= 1 && p.lightTolerance.includes(p.light), `${p.slug} tolerates its ideal light`);
    assert.ok(p.rooms.length && p.spaces.length, p.slug);
    assert.ok(p.watering.intervalDays > 0, p.slug);
    assert.ok(p.care.tips.length >= 2, p.slug);
  }
});

test('pet safety is never silently assumed', () => {
  const unknown = plantsOnly.filter((p) => p.petSafe === 'unknown');
  assert.ok(unknown.length >= 1);
  for (const p of unknown) assert.match(p.petNote, /not verified/i);
});

test('compatibility references resolve to real products', () => {
  const slugs = new Set(catalogue.map((p) => p.slug));
  for (const p of catalogue) for (const s of p.compatibility?.pairsWith || []) assert.ok(slugs.has(s), `${p.slug} -> ${s}`);
  for (const k of catalogue.filter((p) => p.kitSlugs)) for (const i of k.kitSlugs) assert.ok(slugs.has(i.slug));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { searchProducts, searchGuides, suggest, tokenize } from '../../src/services/search.js';
import { catalogue, bySlug } from './helpers.js';
import { guides } from '../../src/seed/careContent.js';
import { categories } from '../../src/seed/categories.js';

test('"snake" returns the Snake Plant first', () => {
  assert.equal(searchProducts(catalogue, 'snake')[0].slug, 'snake-plant');
});

test('"low light" returns plants that tolerate low light', () => {
  const r = searchProducts(catalogue, 'low light').slice(0, 8);
  assert.ok(r.length >= 6);
  const plantHits = r.filter((p) => p.isPlant);
  assert.ok(plantHits.length >= 5);
  for (const p of plantHits) assert.ok(p.lightTolerance.includes('low') || p.tags.includes('low light'), p.slug);
  assert.ok(r.some((p) => p.slug === 'snake-plant'));
});

test('"watering" returns watering tools and the watering guide', () => {
  const r = searchProducts(catalogue, 'watering');
  assert.equal(r[0].subcategory, 'Watering Tools');
  assert.ok(r.slice(0, 5).some((p) => p.slug === 'soil-moisture-meter' || p.slug === 'long-spout-watering-can'));
  assert.equal(searchGuides(guides, 'watering')[0].slug, 'watering-101');
});

test('searches botanical names, categories, plant types and tags', () => {
  assert.equal(searchProducts(catalogue, 'Sansevieria')[0].slug, 'snake-plant');
  assert.ok(searchProducts(catalogue, 'succulents').slice(0, 5).every((p) => p.plantType === 'succulent' || p.tags.includes('succulents') || p.category === 'succulents' || p.slug.includes('succulent') || p.supply?.suitableFor?.includes('succulents')));
  assert.ok(searchProducts(catalogue, 'hanging').some((p) => p.slug === 'golden-pothos'));
  assert.ok(searchProducts(catalogue, 'pet safe').slice(0, 5).every((p) => p.petSafe === 'safe'));
  assert.ok(searchProducts(catalogue, 'herbs').slice(0, 3).some((p) => p.plantType === 'herb'));
});

test('gibberish yields no results', () => {
  assert.equal(searchProducts(catalogue, 'zzzqqq').length, 0);
});

test('suggestions include products, categories and popular queries', () => {
  const s = suggest('sna', { products: catalogue, categories, guides });
  assert.ok(s.some((x) => x.type === 'product' && x.value === 'snake-plant'));
  const empty = suggest('', { products: catalogue, categories, guides });
  assert.ok(empty.length >= 5 && empty.every((x) => x.type === 'query'));
  assert.ok(suggest('succ', { products: catalogue, categories, guides }).some((x) => x.type === 'category'));
});

test('tokenizer drops stop-words and stems plurals', () => {
  assert.deepEqual(tokenize('The best herbs for my balcony'), ['herb', 'balcony']);
  assert.ok(tokenize('plants').length === 1);
});

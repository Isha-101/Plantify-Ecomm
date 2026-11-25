import test from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, kitDiscountPct, COUPONS } from '../../src/services/pricing.js';
import { bySlug } from './helpers.js';

const S = { shippingFlat: 79, freeShippingOver: 999 };
const line = (slug, quantity, extra = {}) => ({ product: bySlug[slug], quantity, ...extra });

test('subtotal, savings and shipping for a small cart', () => {
  const { pricing } = priceCart([line('golden-pothos', 2)], '', S);
  assert.equal(pricing.subtotal, 498);
  assert.equal(pricing.mrpTotal, 598);
  assert.equal(pricing.productSavings, 100);
  assert.equal(pricing.shipping, 79);
  assert.equal(pricing.total, 577);
  assert.equal(pricing.freeShippingRemaining, 501);
});

test('free shipping at the threshold', () => {
  const { pricing } = priceCart([line('monstera-deliciosa', 2)], '', S);
  assert.equal(pricing.shipping, 0);
  assert.equal(pricing.total, 1798);
});

test('quantity is clamped to stock and flagged', () => {
  const p = { ...bySlug['fiddle-leaf-fig'], stock: 3 };
  const { items, pricing } = priceCart([{ product: p, quantity: 10 }], '', S);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].stockIssue, 'limited');
  assert.equal(pricing.itemCount, 3);
  assert.equal(pricing.hasStockIssues, true);
});

test('out of stock lines are not charged', () => {
  const p = { ...bySlug['snake-plant'], stock: 0 };
  const { items, pricing } = priceCart([{ product: p, quantity: 2 }], '', S);
  assert.equal(items[0].stockIssue, 'out');
  assert.equal(pricing.total, 0);
});

test('custom kit discount tiers apply by distinct product count', () => {
  assert.equal(kitDiscountPct(2), 0);
  assert.equal(kitDiscountPct(3), 5);
  assert.equal(kitDiscountPct(4), 8);
  assert.equal(kitDiscountPct(6), 12);
  const lines = ['snake-plant', 'terracotta-pot-set', 'cactus-succulent-mix'].map((s) => line(s, 1, { kitId: 'k1', kitName: 'My kit' }));
  const { pricing, items } = priceCart(lines, '', S);
  assert.equal(items[0].kitDiscountPct, 5);
  assert.equal(pricing.subtotal, 449 + 449 + 249);
  assert.equal(pricing.kitDiscount, 57.35);
});

test('kit discount does not apply when fewer than 3 distinct products', () => {
  const lines = [line('snake-plant', 2, { kitId: 'k1' }), line('zz-plant', 1, { kitId: 'k1' })];
  assert.equal(priceCart(lines, '', S).pricing.kitDiscount, 0);
});

test('coupons: percent, minimum, invalid, free shipping', () => {
  const cart = [line('monstera-deliciosa', 1)];
  const ok = priceCart(cart, 'plant10', S).pricing;
  assert.equal(ok.coupon.code, 'PLANT10');
  assert.equal(ok.couponDiscount, 89.9);
  assert.equal(priceCart(cart, 'NOPE', S).pricing.couponError, 'That coupon code is not valid.');
  assert.match(priceCart([line('golden-pothos', 1)], 'WELCOME15', S).pricing.couponError, /Add ₹/);
  const ship = priceCart([line('golden-pothos', 1)], 'FREESHIP', S).pricing;
  assert.equal(ship.shipping, 0);
  assert.ok(COUPONS.GREENGIFT);
});

test('empty cart totals zero with no shipping', () => {
  const { pricing } = priceCart([], '', S);
  assert.equal(pricing.total, 0);
  assert.equal(pricing.shipping, 0);
});

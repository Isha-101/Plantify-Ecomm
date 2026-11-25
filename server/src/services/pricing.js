import { config } from '../config/env.js';
import { productSummary } from './serialize.js';

export const COUPONS = {
  PLANT10: { type: 'percent', value: 10, minSubtotal: 499, label: '10% off orders above ₹499' },
  WELCOME15: { type: 'percent', value: 15, minSubtotal: 799, maxDiscount: 300, label: '15% off (up to ₹300) on orders above ₹799' },
  GREENGIFT: { type: 'flat', value: 100, minSubtotal: 1499, label: '₹100 off orders above ₹1,499' },
  FREESHIP: { type: 'shipping', minSubtotal: 0, label: 'Free shipping on this order' },
};

// Custom kits: the more distinct products you bundle, the bigger the saving.
export const KIT_TIERS = [
  { min: 5, pct: 12 },
  { min: 4, pct: 8 },
  { min: 3, pct: 5 },
];

export const kitDiscountPct = (distinctProducts) => KIT_TIERS.find((t) => distinctProducts >= t.min)?.pct ?? 0;

export const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const lineKey = (productId, kitId) => `${String(productId)}::${kitId || ''}`;

/**
 * Prices a set of cart lines.
 * lines: [{ product: plainProduct, quantity, kitId?, kitName? }]
 * Quantities are clamped to stock; lines for out-of-stock products are kept (so the UI can explain) but not charged.
 */
export function priceCart(lines, couponCode, settings = {}) {
  const shippingFlat = settings.shippingFlat ?? config.shippingFlat;
  const freeOver = settings.freeShippingOver ?? config.freeShippingOver;

  // 1. Merge duplicate lines and clamp quantities.
  const merged = new Map();
  for (const l of lines) {
    if (!l?.product) continue;
    const key = lineKey(l.product.id, l.kitId);
    const existing = merged.get(key);
    if (existing) existing.requested += l.quantity;
    else merged.set(key, { product: l.product, requested: l.quantity, kitId: l.kitId || null, kitName: l.kitName || null });
  }

  // Stock is shared by every line of the same product (e.g. same plant in two kits).
  const remainingStock = new Map();
  const items = [];
  for (const entry of merged.values()) {
    const p = entry.product;
    const left = remainingStock.has(p.id) ? remainingStock.get(p.id) : p.stock;
    const quantity = Math.max(0, Math.min(entry.requested, left));
    remainingStock.set(p.id, left - quantity);
    items.push({ ...entry, quantity, stockIssue: quantity === 0 ? 'out' : quantity < entry.requested ? 'limited' : null });
  }

  // 2. Kit discounts: grouped by kitId, based on the number of distinct products that are actually in stock.
  const kitGroups = new Map();
  for (const it of items) {
    if (!it.kitId || it.quantity === 0) continue;
    if (!kitGroups.has(it.kitId)) kitGroups.set(it.kitId, new Set());
    kitGroups.get(it.kitId).add(it.product.id);
  }
  const kitPct = new Map([...kitGroups].map(([id, set]) => [id, kitDiscountPct(set.size)]));

  // 3. Totals
  let mrpTotal = 0;
  let subtotal = 0;
  let kitDiscount = 0;
  let itemCount = 0;
  const pricedItems = items.map((it) => {
    const p = it.product;
    const pct = it.kitId ? kitPct.get(it.kitId) || 0 : 0;
    const listUnit = p.price;
    const unitPrice = money(listUnit * (1 - pct / 100));
    const mrpUnit = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price;
    const lineTotal = money(unitPrice * it.quantity);
    mrpTotal += mrpUnit * it.quantity;
    subtotal += listUnit * it.quantity;
    kitDiscount += (listUnit - unitPrice) * it.quantity;
    itemCount += it.quantity;
    return {
      productId: String(p.id),
      product: productSummary(p),
      quantity: it.quantity,
      requestedQuantity: it.requested,
      stockIssue: it.stockIssue,
      kitId: it.kitId,
      kitName: it.kitName,
      kitDiscountPct: pct,
      listUnitPrice: listUnit,
      unitPrice,
      lineTotal,
    };
  });

  mrpTotal = money(mrpTotal);
  subtotal = money(subtotal);
  kitDiscount = money(kitDiscount);
  const payable = money(subtotal - kitDiscount);

  // 4. Coupon
  let couponDiscount = 0;
  let couponApplied = null;
  let couponError = null;
  let freeShippingByCoupon = false;
  const code = (couponCode || '').toString().trim().toUpperCase();
  if (code) {
    const c = COUPONS[code];
    if (!c) couponError = 'That coupon code is not valid.';
    else if (itemCount === 0) couponError = 'Add items to your cart to use a coupon.';
    else if (payable < c.minSubtotal) couponError = `Add ₹${money(c.minSubtotal - payable)} more to use ${code}.`;
    else {
      couponApplied = { code, label: c.label };
      if (c.type === 'percent') couponDiscount = Math.min(money((payable * c.value) / 100), c.maxDiscount ?? Infinity);
      else if (c.type === 'flat') couponDiscount = Math.min(c.value, payable);
      else if (c.type === 'shipping') freeShippingByCoupon = true;
    }
  }
  couponDiscount = money(couponDiscount);

  // 5. Shipping + total
  const afterDiscounts = money(payable - couponDiscount);
  let shipping = 0;
  if (itemCount > 0 && !freeShippingByCoupon && payable < freeOver) shipping = shippingFlat;
  const freeShippingRemaining = itemCount > 0 && payable < freeOver && !freeShippingByCoupon ? money(freeOver - payable) : 0;
  const total = money(afterDiscounts + shipping);

  return {
    items: pricedItems,
    pricing: {
      itemCount,
      mrpTotal,
      subtotal,
      productSavings: money(mrpTotal - subtotal),
      kitDiscount,
      coupon: couponApplied,
      couponError,
      couponDiscount,
      shipping,
      freeShippingThreshold: freeOver,
      freeShippingRemaining,
      total,
      totalSavings: money(mrpTotal - subtotal + kitDiscount + couponDiscount),
      hasStockIssues: pricedItems.some((i) => i.stockIssue),
    },
  };
}

import crypto from 'node:crypto';
import { Router } from 'express';
import { Order, ORDER_STATUSES } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError, badRequest, conflict, notFound } from '../utils/httpError.js';
import { Validator, isObjectId, str, luhn } from '../utils/validate.js';
import { parseAddress } from '../utils/address.js';
import { cartPayload } from '../services/cartService.js';
import { award } from '../services/gardenService.js';

const router = Router();
router.use(protect);

const DAY = 86400000;

// ───── Order progress simulation ─────
// Orders advance one stage every ORDER_STAGE_MS (default 2 min) so the tracking timeline can be demoed.
export function refreshStatus(order, now = Date.now()) {
  const current = ORDER_STATUSES.indexOf(order.status);
  const auto = Math.min(ORDER_STATUSES.length - 1, Math.floor((now - new Date(order.placedAt).getTime()) / config.orderStageMs));
  const target = Math.max(current, auto);
  if (target === current) return false;
  for (let i = current + 1; i <= target; i++) {
    order.statusHistory.push({ status: ORDER_STATUSES[i], at: new Date(new Date(order.placedAt).getTime() + i * config.orderStageMs) });
  }
  order.status = ORDER_STATUSES[target];
  return true;
}

export function orderView(order) {
  const o = order.toJSON();
  const idx = ORDER_STATUSES.indexOf(o.status);
  o.statusIndex = idx;
  o.timeline = ORDER_STATUSES.map((status, i) => ({ status, done: i <= idx, current: i === idx, at: o.statusHistory.find((h) => h.status === status)?.at || null }));
  o.itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
  return o;
}

// ───── Mock payments (nothing real is charged or stored) ─────
function processPayment(method, body = {}) {
  const v = new Validator();
  if (method === 'cod') return { method, status: 'pending', reference: 'Pay on delivery', transactionId: undefined };

  if (method === 'upi') {
    const upi = str(body.upiId, 60);
    v.check('upiId', /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi), 'Enter a valid UPI ID, e.g. name@upi.');
    v.done('Please check your UPI details.');
    if (/@fail$/i.test(upi)) throw new HttpError(402, 'Mock UPI payment was declined. Try another UPI ID (anything except “@fail”).');
    const [user, handle] = upi.split('@');
    return { method, status: 'paid', reference: `${user.slice(0, 2)}${'•'.repeat(Math.max(2, user.length - 2))}@${handle}`, transactionId: `MOCK-UPI-${crypto.randomBytes(4).toString('hex').toUpperCase()}` };
  }

  if (method === 'card') {
    const digits = String(body.cardNumber || '').replace(/\D/g, '');
    const name = str(body.cardName, 60);
    const m = /^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/.exec(str(body.expiry, 7));
    const cvv = String(body.cvv || '').replace(/\D/g, '');
    v.check('cardNumber', luhn(digits), 'Enter a valid card number (try 4242 4242 4242 4242).');
    v.check('cardName', name.length >= 2, 'Enter the name on the card.');
    const now = new Date();
    const expOk = !!m && new Date(2000 + Number(m[2]), Number(m[1]), 1) > now; // valid through the end of the expiry month
    v.check('expiry', expOk, 'Enter a valid future expiry (MM/YY).');
    v.check('cvv', /^\d{3,4}$/.test(cvv), 'Enter the 3 or 4 digit CVV.');
    v.done('Please check your card details.');
    // Full number and CVV are used only for this validation and are never stored.
    if (digits.endsWith('0002')) throw new HttpError(402, 'Mock card payment was declined. Use 4242 4242 4242 4242 to see a successful payment.');
    const brand = digits.startsWith('4') ? 'Visa' : /^5[1-5]/.test(digits) ? 'Mastercard' : 'Card';
    return { method, status: 'paid', reference: `${brand} •••• ${digits.slice(-4)}`, transactionId: `MOCK-CARD-${crypto.randomBytes(4).toString('hex').toUpperCase()}` };
  }
  throw badRequest('Choose a payment method.', { paymentMethod: 'Choose Cash on Delivery, UPI or Card.' });
}

const newOrderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `PLT-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { shippingAddress, paymentMethod, payment, coupon } = req.body || {};

    const cart = await cartPayload(user, str(coupon, 30));
    if (!cart.items.length) throw badRequest('Your cart is empty.');
    if (cart.pricing.hasStockIssues) {
      const names = cart.items.filter((i) => i.stockIssue).map((i) => i.product.name);
      throw conflict(`Some items are no longer available in the quantity you chose: ${names.join(', ')}. Please review your cart.`, { items: names });
    }
    const address = parseAddress(shippingAddress);
    const pay = processPayment(paymentMethod, payment);

    // Reserve stock atomically per product; undo on any failure.
    const totals = new Map();
    for (const i of cart.items) totals.set(i.productId, (totals.get(i.productId) || 0) + i.quantity);
    const reserved = [];
    try {
      for (const [id, qty] of totals) {
        const r = await Product.updateOne({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty, popularity: qty } });
        if (r.modifiedCount !== 1) throw conflict('Sorry – an item in your cart just sold out. Please review your cart.');
        reserved.push([id, qty]);
      }

      const now = new Date();
      let order;
      for (let attempt = 0; attempt < 5 && !order; attempt++) {
        try {
          order = await Order.create({
            orderNumber: newOrderNumber(),
            user: user._id,
            items: cart.items.map((i) => ({
              product: i.productId,
              name: i.product.name,
              slug: i.product.slug,
              image: i.product.image,
              isPlant: i.product.isPlant,
              unitPrice: i.unitPrice,
              listPrice: i.listUnitPrice,
              quantity: i.quantity,
              kitName: i.kitName || undefined,
            })),
            shippingAddress: { fullName: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode },
            payment: { method: pay.method, status: pay.status, reference: pay.reference, transactionId: pay.transactionId },
            pricing: {
              itemsTotal: cart.pricing.mrpTotal,
              subtotal: cart.pricing.subtotal,
              kitDiscount: cart.pricing.kitDiscount,
              couponCode: cart.pricing.coupon?.code,
              couponDiscount: cart.pricing.couponDiscount,
              shipping: cart.pricing.shipping,
              total: cart.pricing.total,
            },
            status: 'Order Placed',
            statusHistory: [{ status: 'Order Placed', at: now }],
            placedAt: now,
            estimatedDelivery: new Date(now.getTime() + 5 * DAY),
          });
        } catch (e) {
          if (e?.code !== 11000) throw e; // retry only on an order-number collision
        }
      }
      if (!order) throw new Error('Could not generate a unique order number.');

      user.cart = [];
      await user.save();
      const rewards = await award(user, 'order', { tz: req.tz });
      res.status(201).json({ order: orderView(order), rewards });
    } catch (err) {
      for (const [id, qty] of reserved) await Product.updateOne({ _id: id }, { $inc: { stock: qty, popularity: -qty } });
      throw err;
    }
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ placedAt: -1 }).limit(100);
    for (const o of orders) if (refreshStatus(o)) await o.save();
    res.json({ orders: orders.map(orderView) });
  })
);

async function findOrder(req) {
  const ref = String(req.params.ref);
  const filter = isObjectId(ref) ? { _id: ref } : { orderNumber: ref.toUpperCase() };
  const order = await Order.findOne({ ...filter, user: req.user._id });
  if (!order) throw notFound('We could not find that order.');
  return order;
}

router.get(
  '/:ref',
  asyncHandler(async (req, res) => {
    const order = await findOrder(req);
    if (refreshStatus(order)) await order.save();
    res.json({ order: orderView(order) });
  })
);

// Demo helper: jump to the next stage immediately.
router.post(
  '/:ref/advance',
  asyncHandler(async (req, res) => {
    const order = await findOrder(req);
    refreshStatus(order);
    const idx = ORDER_STATUSES.indexOf(order.status);
    if (idx >= ORDER_STATUSES.length - 1) throw badRequest('This order has already been delivered.');
    order.status = ORDER_STATUSES[idx + 1];
    order.statusHistory.push({ status: order.status, at: new Date() });
    // Keep the clock-based simulation consistent with the manual jump.
    order.placedAt = new Date(Math.min(new Date(order.placedAt).getTime(), Date.now() - (idx + 1) * config.orderStageMs));
    await order.save();
    res.json({ order: orderView(order) });
  })
);

export default router;

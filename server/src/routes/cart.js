import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { str } from '../utils/validate.js';
import { cartPayload, quote, addItem, setQuantity, cleanKit } from '../services/cartService.js';

const router = Router();

// Guests keep their cart in localStorage; this prices it (no auth needed).
router.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 60) : [];
    const { missing, ...result } = await quote(items, str(req.body?.coupon, 30));
    res.json(result);
  })
);

router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await cartPayload(req.user, str(req.query.coupon, 30))))
);

router.post(
  '/items',
  asyncHandler(async (req, res) => {
    await addItem(req.user, req.body || {});
    await req.user.save();
    res.status(201).json(await cartPayload(req.user, str(req.body?.coupon, 30)));
  })
);

router.patch(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    await setQuantity(req.user, req.params.productId, req.body?.quantity, cleanKit(req.body?.kitId).kitId);
    await req.user.save();
    res.json(await cartPayload(req.user, str(req.body?.coupon, 30)));
  })
);

router.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    const kitId = cleanKit(req.query.kitId).kitId || '';
    const before = req.user.cart.length;
    req.user.cart = req.user.cart.filter((l) => !(String(l.product) === req.params.productId && (l.kitId || '') === kitId));
    if (req.user.cart.length === before) throw badRequest('That item is not in your cart.');
    await req.user.save();
    res.json(await cartPayload(req.user, str(req.query.coupon, 30)));
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    req.user.cart = [];
    await req.user.save();
    res.json(await cartPayload(req.user));
  })
);

// After login: fold the guest (localStorage) cart into the stored cart, respecting stock.
router.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 60) : [];
    let skipped = 0;
    for (const it of items) {
      try {
        const ok = await addItem(req.user, { productId: it.productId, quantity: it.quantity, kitId: it.kitId, kitName: it.kitName }, { clamp: true });
        if (!ok) skipped += 1;
      } catch {
        skipped += 1;
      }
    }
    await req.user.save();
    res.json({ ...(await cartPayload(req.user, str(req.body?.coupon, 30))), skipped });
  })
);

export default router;

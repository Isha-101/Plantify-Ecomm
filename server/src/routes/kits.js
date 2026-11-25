import crypto from 'node:crypto';
import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { isObjectId, str } from '../utils/validate.js';
import { getAllProducts } from '../services/catalogueService.js';
import { productCard } from '../services/serialize.js';
import { analyzeKit, roleOf, ROLE_ORDER, ROLE_LABEL } from '../services/kitBuilder.js';
import { KIT_TIERS } from '../services/pricing.js';
import { addItem, cartPayload } from '../services/cartService.js';
import { award } from '../services/gardenService.js';

const router = Router();

// Pre-made kits with their contents.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const all = await getAllProducts();
    const byId = new Map(all.map((p) => [p.id, p]));
    const kits = all
      .filter((p) => p.category === 'plant-kits')
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity)
      .map((k) => ({
        ...productCard(k),
        contents: (k.kitItems || []).map((i) => ({ product: productCard(byId.get(String(i.product))), quantity: i.quantity })).filter((i) => i.product),
      }));
    res.json({ kits });
  })
);

// Everything the custom-kit builder can pick from, grouped by role.
router.get(
  '/builder',
  asyncHandler(async (_req, res) => {
    const all = (await getAllProducts()).filter((p) => p.category !== 'plant-kits' && p.stock > 0);
    const roles = ROLE_ORDER.map((role) => ({
      role,
      label: ROLE_LABEL[role],
      products: all
        .filter((p) => roleOf(p) === role)
        .sort((a, b) => b.popularity - a.popularity)
        .map((p) => ({
          ...productCard(p),
          potSizeCm: p.potSizeCm || null,
          soilType: p.soilType || null,
          diameterMinCm: p.supply?.diameterMinCm ?? null,
          diameterMaxCm: p.supply?.diameterMaxCm ?? null,
          hasDrainage: p.supply?.hasDrainage ?? null,
        })),
    })).filter((r) => r.products.length);
    res.json({ roles, tiers: [...KIT_TIERS].reverse() });
  })
);

async function parseEntries(items) {
  if (!Array.isArray(items) || !items.length) throw badRequest('Add at least one product to your kit.');
  if (items.length > 12) throw badRequest('A custom kit can hold up to 12 different products.');
  const all = await getAllProducts();
  const byId = new Map(all.map((p) => [p.id, p]));
  const entries = [];
  for (const it of items) {
    if (!isObjectId(String(it.productId))) throw badRequest('Invalid product in kit.');
    const product = byId.get(String(it.productId));
    if (!product) throw badRequest('One of the products is no longer available.');
    if (product.category === 'plant-kits') throw badRequest('Kits cannot be nested inside custom kits.');
    if (entries.some((e) => e.product.id === product.id)) continue;
    entries.push({ product, quantity: Math.max(1, Math.min(10, Math.floor(Number(it.quantity)) || 1)) });
  }
  return entries;
}

router.post(
  '/custom/quote',
  asyncHandler(async (req, res) => res.json({ kit: analyzeKit(await parseEntries(req.body?.items)) }))
);

// For signed-in users: add every kit item to the cart under one kit id, so the bundle discount applies.
router.post(
  '/custom/add-to-cart',
  protect,
  asyncHandler(async (req, res) => {
    const entries = await parseEntries(req.body?.items);
    const kitId = `kit-${crypto.randomBytes(5).toString('hex')}`;
    const kitName = str(req.body?.name, 60) || 'My custom kit';
    for (const e of entries) await addItem(req.user, { productId: e.product.id, quantity: e.quantity, kitId, kitName });
    await req.user.save();
    const rewards = await award(req.user, 'kit', { tz: req.tz, counter: 'kits' });
    res.status(201).json({ kitId, kit: analyzeKit(entries), cart: await cartPayload(req.user), rewards });
  })
);

export default router;

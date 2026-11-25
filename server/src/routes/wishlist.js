import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/httpError.js';
import { assertObjectId, isObjectId } from '../utils/validate.js';
import { getProductsByIds } from '../services/catalogueService.js';
import { productCard } from '../services/serialize.js';

const router = Router();
router.use(protect);

const payload = async (user) => {
  const products = await getProductsByIds(user.wishlist.map(String));
  return { ids: products.map((p) => p.id), products: products.map(productCard) };
};

router.get('/', asyncHandler(async (req, res) => res.json(await payload(req.user))));

router.post(
  '/merge',
  asyncHandler(async (req, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isObjectId).slice(0, 100);
    const products = await getProductsByIds(ids);
    for (const p of products) if (!req.user.wishlist.some((w) => String(w) === p.id)) req.user.wishlist.push(p.id);
    await req.user.save();
    res.json(await payload(req.user));
  })
);

router.post(
  '/:productId',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.productId, 'product id');
    const [product] = await getProductsByIds([req.params.productId]);
    if (!product) throw notFound('That product is no longer available.');
    if (!req.user.wishlist.some((w) => String(w) === product.id)) req.user.wishlist.push(product.id);
    await req.user.save();
    res.status(201).json(await payload(req.user));
  })
);

router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    req.user.wishlist = req.user.wishlist.filter((w) => String(w) !== req.params.productId);
    await req.user.save();
    res.json(await payload(req.user));
  })
);

export default router;

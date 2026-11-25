import { Router } from 'express';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [cats, counts] = await Promise.all([Category.find().sort('order'), Product.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }])]);
    const byCat = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.json({ categories: cats.map((c) => ({ ...c.toJSON(), productCount: byCat[c.slug] || 0 })) });
  })
);

export default router;

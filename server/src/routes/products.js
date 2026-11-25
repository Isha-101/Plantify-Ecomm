import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Category } from '../models/Category.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { Validator, str, num, isObjectId } from '../utils/validate.js';
import { productCard, productSummary } from '../services/serialize.js';
import { getAllProducts, getProductsByIds, filterProducts, sortProducts } from '../services/catalogueService.js';
import { searchProducts, suggest } from '../services/search.js';
import { guides } from '../seed/careContent.js';
import { award } from '../services/gardenService.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = req.query;
    const all = await getAllProducts();

    // Direct lookup by ids (wishlist / recently viewed / guest cart).
    if (q.ids) {
      const wanted = String(q.ids).split(',').filter(Boolean).slice(0, 60);
      const set = new Set(wanted);
      const found = all.filter((p) => set.has(p.id));
      found.sort((a, b) => wanted.indexOf(a.id) - wanted.indexOf(b.id));
      return res.json({ products: found.map(productCard), total: found.length, page: 1, pages: 1 });
    }

    const text = str(q.search || q.q, 100);
    let pool = all;
    let relevant = null;
    if (text) {
      relevant = searchProducts(pool, text);
      const ids = new Set(relevant.map((p) => p.id));
      pool = pool.filter((p) => ids.has(p.id));
    }

    // Facets that don't depend on the other filters, so the sidebar can show useful ranges/counts.
    const priceValues = pool.map((p) => p.price);
    const categoryCounts = {};
    for (const p of pool) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;

    let list = filterProducts(pool, q);

    const sort = ['relevance', 'price-asc', 'price-desc', 'popularity', 'rating', 'newest', 'featured'].includes(q.sort) ? q.sort : text ? 'relevance' : 'featured';
    if (sort === 'relevance' && relevant) {
      const rank = new Map(relevant.map((p, i) => [p.id, i]));
      list = list.sort((a, b) => rank.get(a.id) - rank.get(b.id));
    } else if (sort === 'featured') {
      list = list.sort((a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity);
    } else {
      list = sortProducts(list, sort);
    }

    const limit = Math.min(60, Math.max(1, Number(q.limit) || 12));
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
    const slice = list.slice((page - 1) * limit, page * limit);

    res.json({
      products: slice.map(productCard),
      total,
      page,
      pages,
      limit,
      query: text,
      sort,
      facets: {
        priceRange: priceValues.length ? { min: Math.floor(Math.min(...priceValues)), max: Math.ceil(Math.max(...priceValues)) } : { min: 0, max: 0 },
        categoryCounts,
      },
    });
  })
);

router.get(
  '/suggest',
  asyncHandler(async (req, res) => {
    const [products, categories] = await Promise.all([getAllProducts(), Category.find().sort('order')]);
    res.json({ suggestions: suggest(str(req.query.q, 60), { products, categories: categories.map((c) => c.toJSON()), guides }) });
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug).toLowerCase();
    const doc = isObjectId(slug) ? await Product.findById(slug) : await Product.findOne({ slug });
    if (!doc) throw notFound('We could not find that product.');
    const product = doc.toJSON();
    const all = await getAllProducts();

    // Related: same category / plant type, ranked by shared tags.
    const tagSet = new Set(product.tags || []);
    const related = all
      .filter((p) => p.id !== product.id)
      .map((p) => ({
        p,
        s: (p.category === product.category ? 3 : 0) + (product.plantType && p.plantType === product.plantType ? 2 : 0) + (p.tags || []).filter((t) => tagSet.has(t)).length,
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.p.popularity - a.p.popularity)
      .slice(0, 4)
      .map((x) => productCard(x.p));

    const bySlug = new Map(all.map((p) => [p.slug, p]));
    const compatible = (product.compatibility?.pairsWith || []).map((s) => bySlug.get(s)).filter(Boolean).map(productCard);

    let kitContents = [];
    if (product.kitItems?.length) {
      const byId = new Map(all.map((p) => [p.id, p]));
      kitContents = product.kitItems.map((k) => ({ product: productCard(byId.get(String(k.product))), quantity: k.quantity })).filter((k) => k.product);
    }

    res.json({
      product: { ...product, kitItems: undefined, discountPercent: product.discountPercent },
      related,
      compatible,
      kitContents,
    });
  })
);

// ───── Reviews ─────
router.get(
  '/:slug/reviews',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: String(req.params.slug).toLowerCase() }).select('_id rating numReviews');
    if (!product) throw notFound('Product not found.');
    const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ reviews: reviews.map((r) => r.toJSON()), rating: product.rating, numReviews: product.numReviews });
  })
);

router.post(
  '/:slug/reviews',
  protect,
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!product) throw notFound('Product not found.');
    const rating = num(req.body?.rating);
    const comment = str(req.body?.comment, 1000);
    const title = str(req.body?.title, 80);
    const v = new Validator();
    v.check('rating', Number.isInteger(rating) && rating >= 1 && rating <= 5, 'Choose a rating from 1 to 5.');
    v.check('comment', comment.length >= 5, 'Tell us a little more (at least 5 characters).');
    v.done();

    const verifiedPurchase = !!(await Order.exists({ user: req.user._id, 'items.product': product._id }));
    const existing = await Review.findOne({ product: product._id, user: req.user._id });
    let total = product.rating * product.numReviews;
    let count = product.numReviews;
    if (existing) {
      total = total - existing.rating + rating;
      Object.assign(existing, { rating, comment, title, verifiedPurchase });
      await existing.save();
    } else {
      total += rating;
      count += 1;
      await Review.create({ product: product._id, user: req.user._id, name: req.user.name, rating, comment, title, verifiedPurchase });
    }
    product.numReviews = count;
    product.rating = Math.round((total / count) * 10) / 10;
    await product.save();

    const rewards = existing ? null : await award(req.user, 'review', { tz: req.tz });
    const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).limit(50);
    res.status(existing ? 200 : 201).json({ reviews: reviews.map((r) => r.toJSON()), rating: product.rating, numReviews: product.numReviews, rewards });
  })
);

export default router;

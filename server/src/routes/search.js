import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { str } from '../utils/validate.js';
import { getAllProducts } from '../services/catalogueService.js';
import { searchProducts, searchGuides, POPULAR_QUERIES } from '../services/search.js';
import { productCard } from '../services/serialize.js';
import { guides } from '../seed/careContent.js';
import { PROBLEMS } from '../services/sos.js';

const router = Router();

// Global search: products + care guides + plant-problem articles.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = str(req.query.q, 100);
    const all = await getAllProducts();
    if (!q) return res.json({ query: '', total: 0, products: [], guides: [], problems: [], popular: POPULAR_QUERIES, suggestedProducts: all.filter((p) => p.featured).slice(0, 4).map(productCard) });

    const products = searchProducts(all, q);
    const matchedGuides = searchGuides(guides, q).slice(0, 4);
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const problems = PROBLEMS.filter((p) => words.some((w) => p.title.toLowerCase().includes(w) || p.summary.toLowerCase().includes(w)))
      .slice(0, 3)
      .map((p) => ({ id: p.id, title: p.title, summary: p.summary }));

    const total = products.length + matchedGuides.length + problems.length;
    res.json({
      query: q,
      total,
      productCount: products.length,
      products: products.slice(0, 48).map(productCard),
      guides: matchedGuides.map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, category: g.category, readMinutes: g.readMinutes })),
      problems,
      // Shown by the no-results state.
      suggestedProducts: total ? [] : [...all].sort((a, b) => b.popularity - a.popularity).slice(0, 6).map(productCard),
      popular: POPULAR_QUERIES,
    });
  })
);

export default router;

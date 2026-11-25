import { Product } from '../models/Product.js';
import { isObjectId } from '../utils/validate.js';

/** Plain-object copies of products (ids as strings, virtuals included). */
export async function getAllProducts(filter = {}) {
  const docs = await Product.find(filter);
  return docs.map((d) => d.toJSON());
}

export async function getProductsByIds(ids) {
  const valid = [...new Set(ids.map(String).filter(isObjectId))];
  if (!valid.length) return [];
  const docs = await Product.find({ _id: { $in: valid } });
  const byId = new Map(docs.map((d) => [String(d._id), d.toJSON()]));
  return valid.map((id) => byId.get(id)).filter(Boolean);
}

const csv = (v) => (typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Applies the product-listing filters (everything except free-text search and sorting). */
export function filterProducts(products, q) {
  const categories = csv(q.category);
  const sub = q.subcategory ? String(q.subcategory).toLowerCase() : null;
  const types = csv(q.plantType);
  const diffs = csv(q.difficulty);
  const lights = csv(q.light);
  const pets = csv(q.petSafe);
  const minPrice = Number.isFinite(Number(q.minPrice)) && q.minPrice !== undefined && q.minPrice !== '' ? Number(q.minPrice) : null;
  const maxPrice = Number.isFinite(Number(q.maxPrice)) && q.maxPrice !== undefined && q.maxPrice !== '' ? Number(q.maxPrice) : null;
  const minRating = Number(q.minRating) || 0;
  const room = q.room ? String(q.room) : null;

  return products.filter((p) => {
    if (categories.length && !categories.includes(p.category)) return false;
    if (sub && (p.subcategory || '').toLowerCase() !== sub) return false;
    if (types.length && !types.includes(p.plantType)) return false;
    if (diffs.length && !diffs.includes(p.difficulty)) return false;
    if (lights.length && !(p.lightTolerance || []).some((l) => lights.includes(l))) return false;
    if (pets.length && !pets.includes(p.petSafe)) return false;
    if (minPrice !== null && p.price < minPrice) return false;
    if (maxPrice !== null && p.price > maxPrice) return false;
    if (minRating && p.rating < minRating) return false;
    if (q.placement === 'indoor' && !['indoor', 'both'].includes(p.placement)) return false;
    if (q.placement === 'outdoor' && !['outdoor', 'both'].includes(p.placement)) return false;
    if (room && !(p.rooms || []).includes(room)) return false;
    if (q.featured === 'true' && !p.featured) return false;
    if (q.isPlant === 'true' && !p.isPlant) return false;
    if (q.beginner === 'true' && !(p.difficulty === 'easy' && (p.isPlant || p.category === 'plant-kits'))) return false;
    if (q.inStock === 'true' && p.stock <= 0) return false;
    return true;
  });
}

export function sortProducts(list, sort) {
  const arr = [...list];
  switch (sort) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'popularity':
      return arr.sort((a, b) => b.popularity - a.popularity);
    case 'rating':
      return arr.sort((a, b) => b.rating - a.rating || b.numReviews - a.numReviews);
    case 'newest':
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    default:
      return arr; // relevance / featured order handled by caller
  }
}

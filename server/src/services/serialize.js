// Small helpers that turn documents into the compact shapes the client needs.

/** Safe string id for ObjectIds, populated docs and plain objects (note: ObjectId#id is a byte buffer, not the hex string). */
export function toIdString(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v.toHexString === 'function') return v.toHexString();
  if (v._id !== undefined) return toIdString(v._id);
  if (typeof v.id === 'string') return v.id;
  return String(v);
}

/** Compact product shape used in cart lines, order items, recommendation cards, etc. */
export function productSummary(p) {
  if (!p) return null;
  return {
    id: toIdString(p.id ?? p._id),
    name: p.name,
    slug: p.slug,
    botanicalName: p.botanicalName || '',
    image: p.image,
    price: p.price,
    originalPrice: p.originalPrice || null,
    discountPercent: p.originalPrice && p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0,
    stock: p.stock,
    category: p.category,
    subcategory: p.subcategory,
    isPlant: !!p.isPlant,
    plantType: p.plantType || null,
    difficulty: p.difficulty || null,
    light: p.light || null,
    lightTolerance: p.lightTolerance || [],
    petSafe: p.petSafe || 'na',
    rating: p.rating,
    numReviews: p.numReviews,
    placement: p.placement || 'na',
    beginnerFriendly: p.difficulty === 'easy' || (p.category === 'plant-kits' && p.subcategory === 'Beginner Kit'),
  };
}

/** Card shape for listings: the summary plus the details shown on product cards and filters. */
export function productCard(p) {
  if (!p) return null;
  return {
    ...productSummary(p),
    shortDescription: p.shortDescription || '',
    tags: p.tags || [],
    rooms: p.rooms || [],
    spaces: p.spaces || [],
    careTime: p.careTime || null,
    humidity: p.humidity || null,
    wateringLabel: p.watering?.label || null,
    wateringIntervalDays: p.watering?.intervalDays || null,
    petNote: p.petNote || '',
    growthRate: p.growthRate || null,
    matureSize: p.matureSize?.label || null,
    popularity: p.popularity || 0,
    createdAt: p.createdAt,
    featured: !!p.featured,
  };
}

export function publicUser(user) {
  const u = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    profile: u.profile || {},
    preferences: u.preferences || {},
    addresses: u.addresses || [],
    wishlist: (u.wishlist || []).map(toIdString),
    createdAt: u.createdAt,
  };
}

export function toPlain(doc) {
  return typeof doc?.toJSON === 'function' ? doc.toJSON() : doc;
}

import { plants } from './plants.js';
import { supplies } from './supplies.js';
import { kitDefs, KIT_DISCOUNT } from './kits.js';
import { categories } from './categories.js';

export const imagePaths = (slug) => ({
  image: `/images/products/${slug}.svg`,
  gallery: [`/images/products/${slug}.svg`, `/images/products/${slug}-detail.svg`, `/images/products/${slug}-scene.svg`],
});

/** Pure builder – returns plain product objects (kits carry `kitSlugs` to be resolved to ids by the seeder). */
export function buildCatalogue(now = Date.now()) {
  const base = [...plants, ...supplies];
  const bySlug = new Map(base.map((p) => [p.slug, p]));

  const kits = kitDefs.map((k) => {
    const comps = k.items.map(([slug, qty]) => {
      const p = bySlug.get(slug);
      if (!p) throw new Error(`Kit "${k.slug}" references unknown product "${slug}"`);
      return { p, qty };
    });
    const sum = comps.reduce((s, c) => s + c.p.price * c.qty, 0);
    const price = Math.floor((sum * (1 - KIT_DISCOUNT)) / 10) * 10 - 1;
    const plantNames = comps.filter((c) => c.p.isPlant).map((c) => c.p.name);
    const anyToxic = comps.some((c) => c.p.petSafe === 'toxic');
    const allSafe = comps.filter((c) => c.p.isPlant).every((c) => c.p.petSafe === 'safe');
    return {
      slug: k.slug,
      name: k.name,
      shortDescription: k.shortDescription,
      description: k.description,
      price,
      originalPrice: sum,
      category: 'plant-kits',
      subcategory: k.subcategory,
      isPlant: false,
      stock: 25,
      rating: k.rating,
      numReviews: k.numReviews,
      popularity: k.popularity,
      tags: k.tags,
      featured: k.featured,
      difficulty: k.difficulty,
      placement: k.placement,
      rooms: k.rooms,
      spaces: k.spaces,
      petSafe: allSafe ? 'safe' : anyToxic ? 'toxic' : 'unknown',
      petNote: allSafe ? 'All plants in this kit are listed as non-toxic to cats and dogs.' : anyToxic ? 'Contains plants that are listed as toxic to pets – see the plant list for details.' : '',
      supply: { role: 'kit' },
      compatibility: { pairsWith: [], notes: `Includes: ${comps.map((c) => `${c.qty > 1 ? `${c.qty} × ` : ''}${c.p.name}`).join(', ')}.` },
      care: { tips: [`Plants included: ${plantNames.join(', ')}.`, 'Every kit ships with a care card; add the plants to My Garden for automatic reminders.'] },
      kitSlugs: k.items.map(([slug, quantity]) => ({ slug, quantity })),
    };
  });

  return [...base, ...kits].map((p, i) => ({
    ...p,
    tags: [...new Set(p.tags || [])],
    ...imagePaths(p.slug),
    // Spread "created" dates over the last ~3 months so the "Newest" sort is meaningful.
    createdAt: new Date(now - (((i * 37) % 90) + 1) * 86400000),
  }));
}

export { categories };

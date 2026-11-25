import { buildCatalogue } from '../../src/seed/catalogue.js';

/** Catalogue as plain objects with `id` = slug, the shape services expect. */
export const catalogue = buildCatalogue().map((p) => ({ ...p, id: p.slug }));
export const bySlug = Object.fromEntries(catalogue.map((p) => [p.slug, p]));
export const plantsOnly = catalogue.filter((p) => p.isPlant);

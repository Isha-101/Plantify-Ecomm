// Custom plant-kit builder: prices a bundle and checks that the pieces actually work together.

import { kitDiscountPct, KIT_TIERS, money } from './pricing.js';
import { checkCompatibility } from './compatibility.js';
import { productSummary } from './serialize.js';

export const ROLE_ORDER = ['plant', 'pot', 'soil', 'fertilizer', 'tool', 'accessory'];
export const ROLE_LABEL = { plant: 'Plants', pot: 'Pots & planters', soil: 'Soil', fertilizer: 'Fertiliser', tool: 'Tools', accessory: 'Accessories' };

export const roleOf = (p) => (p.isPlant ? 'plant' : p.supply?.role || null);

export function analyzeKit(entries) {
  // entries: [{ product, quantity }]
  const products = entries.map((e) => e.product);
  const byRole = Object.fromEntries(ROLE_ORDER.map((r) => [r, products.filter((p) => roleOf(p) === r)]));
  const notes = [];
  const add = (level, text) => notes.push({ level, text });

  const plants = byRole.plant;
  const pots = byRole.pot;
  const soils = byRole.soil;

  if (!plants.length) add('info', 'Add at least one plant to build a plant kit.');

  for (const plant of plants) {
    // Pot fit
    if (pots.length) {
      const range = plant.potSizeCm;
      const fitting = pots.filter((pot) => {
        const lo = pot.supply?.diameterMinCm;
        const hi = pot.supply?.diameterMaxCm;
        return !range || lo == null || hi == null ? true : hi >= range.min && lo <= range.max;
      });
      if (!fitting.length) {
        add('warn', `${plant.name} is happiest in a ${plant.potSizeCm.min}–${plant.potSizeCm.max} cm pot – none of your pots fit that size.`);
      } else {
        add('ok', `${fitting[0].name} suits ${plant.name} (recommended pot ${plant.potSizeCm?.min}–${plant.potSizeCm?.max} cm).`);
      }
      // Self-watering vs drought lovers
      if (plant.soilType === 'well-draining' && pots.some((pt) => pt.tags?.includes('self-watering'))) {
        add('warn', `A self-watering planter keeps soil constantly moist – not ideal for ${plant.name}, which prefers to dry out.`);
      }
    }
    // Soil fit
    if (soils.length && plant.soilType && plant.soilType !== 'none') {
      const ok = soils.some((s) => (s.supply?.soilFor || []).includes(plant.soilType));
      if (ok) add('ok', `Your soil mix suits ${plant.name} (${plant.soilType}).`);
      else add('warn', `${plant.name} prefers ${plant.soilType} soil – ${plant.soilType === 'well-draining' ? 'add Cactus & Succulent Mix' : 'use a standard potting mix'}.`);
    }
  }

  for (const pot of pots) {
    if (pot.supply?.hasDrainage === false) add('warn', `${pot.name} has no drainage hole – use it as a decorative cover only.`);
  }

  if (plants.length && !pots.length) add('info', 'Tip: add a pot with drainage so your plants have a home.');
  if (plants.length && !soils.length) add('info', 'Tip: add the right soil mix – the plant’s care sheet tells you which.');
  if (plants.length && !byRole.fertilizer.length) add('info', 'Optional: a fertiliser keeps plants thriving after the first month.');

  if (plants.length >= 2) {
    const compat = checkCompatibility(plants);
    const level = compat.overall >= 70 ? 'ok' : compat.overall >= 50 ? 'warn' : 'warn';
    add(level, `Plant compatibility: ${compat.verdict.label} (${compat.overall}%). ${compat.factors.find((f) => f.status !== 'ok')?.detail || 'They share similar needs.'}`);
  }
  const toxic = plants.filter((p) => p.petSafe === 'toxic');
  if (toxic.length) add('info', `Pet note: ${toxic.map((p) => p.name).join(', ')} ${toxic.length > 1 ? 'are' : 'is'} listed as toxic to cats and dogs.`);

  const distinct = new Set(products.map((p) => p.id)).size;
  const discountPct = kitDiscountPct(distinct);
  const subtotal = money(entries.reduce((s, e) => s + e.product.price * e.quantity, 0));
  const discount = money((subtotal * discountPct) / 100);
  const nextTier = [...KIT_TIERS].reverse().find((t) => distinct < t.min) || null;

  const roles = ROLE_ORDER.filter((r) => ['plant', 'pot', 'soil'].includes(r));
  const complete = roles.filter((r) => byRole[r].length).length;

  return {
    items: entries.map((e) => ({ product: productSummary(e.product), quantity: e.quantity, role: roleOf(e.product) })),
    distinctProducts: distinct,
    discountPct,
    subtotal,
    discount,
    total: money(subtotal - discount),
    nextTier: nextTier ? { itemsNeeded: nextTier.min - distinct, pct: nextTier.pct } : null,
    completeness: { have: complete, of: roles.length, missing: roles.filter((r) => !byRole[r].length) },
    notes,
    tiers: KIT_TIERS.map((t) => ({ min: t.min, pct: t.pct })).reverse(),
  };
}

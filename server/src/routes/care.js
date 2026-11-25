import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { str, isObjectId } from '../utils/validate.js';
import { guides, dailyTips } from '../seed/careContent.js';
import { getAllProducts } from '../services/catalogueService.js';
import { filterProducts } from '../services/catalogueService.js';
import { searchProducts } from '../services/search.js';
import { productCard } from '../services/serialize.js';
import { SYMPTOM_GROUPS, CONTEXT_QUESTIONS, diagnose } from '../services/sos.js';
import { GardenPlant } from '../models/GardenPlant.js';
import { award } from '../services/gardenService.js';

const router = Router();

router.get('/guides', (req, res) => {
  const q = str(req.query.category, 40);
  const list = guides.filter((g) => !q || g.category.toLowerCase() === q.toLowerCase());
  res.json({
    categories: [...new Set(guides.map((g) => g.category))],
    guides: list.map(({ sections, ...g }) => g),
  });
});

router.get('/guides/:slug', (req, res) => {
  const g = guides.find((x) => x.slug === req.params.slug);
  if (!g) throw notFound('Guide not found.');
  const related = guides.filter((x) => x.slug !== g.slug && (x.category === g.category || x.tags.some((t) => g.tags.includes(t)))).slice(0, 3).map(({ sections, ...x }) => x);
  res.json({ guide: g, related });
});

router.get('/tip', (req, res) => {
  const day = Math.floor((Date.now() + (req.tz || 330) * 60000) / 86400000);
  res.json({ tip: dailyTips[day % dailyTips.length] });
});

// Plant care sheets: every plant with its full care information.
router.get(
  '/plants',
  asyncHandler(async (req, res) => {
    let plants = (await getAllProducts()).filter((p) => p.isPlant);
    plants = filterProducts(plants, req.query);
    const text = str(req.query.search, 60);
    if (text) {
      const ids = new Set(searchProducts(plants, text).map((p) => p.id));
      plants = plants.filter((p) => ids.has(p.id));
    }
    plants.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ plants: plants.map((p) => ({ ...productCard(p), botanicalName: p.botanicalName, care: p.care, watering: p.watering, temperature: p.temperature, soilType: p.soilType, potSizeCm: p.potSizeCm, petNote: p.petNote })) });
  })
);

// ───── Plant SOS ─────
router.get('/sos/config', (_req, res) => res.json({ groups: SYMPTOM_GROUPS, context: CONTEXT_QUESTIONS }));

router.post(
  '/sos/diagnose',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { symptoms, context = {}, gardenPlantId, productId } = req.body || {};
    if (!Array.isArray(symptoms)) throw badRequest('Choose at least one symptom.');

    let plant = null;
    let gardenPlant = null;
    const all = await getAllProducts();
    if (gardenPlantId && req.user && isObjectId(String(gardenPlantId))) {
      gardenPlant = await GardenPlant.findOne({ _id: gardenPlantId, user: req.user._id });
      if (gardenPlant?.product) plant = all.find((p) => p.id === String(gardenPlant.product)) || null;
      if (gardenPlant && !plant) plant = { name: gardenPlant.nickname };
    } else if (productId && isObjectId(String(productId))) {
      plant = all.find((p) => p.id === String(productId)) || null;
    }

    const result = diagnose({ symptoms, context: typeof context === 'object' && context ? context : {}, plant });
    if (result.error) throw badRequest(result.error);

    // Recommend products whose tags match each diagnosis.
    for (const d of result.diagnoses) {
      const tags = new Set(d.productTags);
      d.products = all
        .filter((p) => !p.isPlant && (p.tags || []).some((t) => tags.has(t)))
        .map((p) => ({ p, s: (p.tags || []).filter((t) => tags.has(t)).length }))
        .sort((a, b) => b.s - a.s || b.p.popularity - a.p.popularity)
        .slice(0, 3)
        .map((x) => productCard(x.p));
    }

    let rewards = null;
    if (req.user) {
      if (gardenPlant && result.diagnoses[0]) {
        gardenPlant.lastSos = { at: new Date(), problem: result.diagnoses[0].title };
        await gardenPlant.save();
      }
      rewards = await award(req.user, 'sos', { tz: req.tz, counter: 'sos' });
    }
    res.json({ ...result, plant: plant ? { name: plant.name || plant.nickname } : null, rewards });
  })
);

export default router;

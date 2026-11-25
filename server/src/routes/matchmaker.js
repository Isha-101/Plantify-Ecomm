import { Router } from 'express';
import { optionalAuth, protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/httpError.js';
import { getAllProducts } from '../services/catalogueService.js';
import { QUESTIONS, WEIGHTS, WEIGHT_LABELS, buildRecommendation, validateAnswers } from '../services/matchmaker.js';
import { productCard } from '../services/serialize.js';
import { award } from '../services/gardenService.js';
import { publicUser } from '../services/serialize.js';

const router = Router();

router.get('/questions', (_req, res) => {
  res.json({ questions: QUESTIONS, weights: Object.entries(WEIGHTS).map(([key, weight]) => ({ key, label: WEIGHT_LABELS[key], weight })) });
});

const shapeResult = (r) => ({
  product: { ...productCard(r.product), botanicalName: r.product.botanicalName, careNotes: r.product.care?.tips?.[0] || '' },
  score: r.score,
  breakdown: r.breakdown,
  reasons: r.reasons,
  warnings: r.warnings,
  pet: r.pet,
});

router.post(
  '/recommend',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const products = await getAllProducts();
    const rec = buildRecommendation(products, req.body?.answers, { ignorePetFilter: req.body?.ignorePetFilter === true, limit: 9 });
    if (rec.errors) throw badRequest('Please answer every question.', rec.errors);

    let rewards = null;
    if (req.user) {
      req.user.lastMatch = { at: new Date(), personality: rec.personality.title, answers: rec.answers, topProducts: rec.results.slice(0, 5).map((r) => r.product.id) };
      rewards = await award(req.user, 'matchmaker', { tz: req.tz, counter: 'matchmaker' });
    }
    res.json({
      greeting: req.user ? `Hello ${req.user.name.split(' ')[0]}!` : 'Hello, plant friend!',
      answers: rec.answers,
      summary: rec.summary,
      personality: rec.personality,
      weights: rec.weights,
      method: rec.method,
      totalConsidered: rec.totalConsidered,
      results: rec.results.map(shapeResult),
      excluded: rec.excluded.map((e) => ({ id: e.product.id, name: e.product.name, slug: e.product.slug, reason: e.reason })),
      rewards,
    });
  })
);

router.get(
  '/last',
  protect,
  asyncHandler(async (req, res) => res.json({ lastMatch: req.user.lastMatch?.at ? req.user.lastMatch : null }))
);

// "Save to my profile": turns questionnaire answers into stored preferences.
router.post(
  '/save-preferences',
  protect,
  asyncHandler(async (req, res) => {
    const { answers, errors } = validateAnswers(req.body?.answers);
    if (Object.keys(errors).length) throw badRequest('Please answer every question.', errors);
    const pref = req.user.preferences;
    pref.experience = answers.experience;
    pref.preferredTypes = answers.types.filter((t) => t !== 'any');
    pref.lightConditions = answers.light;
    pref.pets = answers.pets;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  })
);

export default router;

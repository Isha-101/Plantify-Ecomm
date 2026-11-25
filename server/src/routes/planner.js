import { Router } from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { RoomPlan } from '../models/misc.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { assertObjectId, isObjectId, oneOf, str } from '../utils/validate.js';
import { getAllProducts } from '../services/catalogueService.js';
import { ROOM_SIZES, WINDOW_SIDES, evaluatePlan, lightMap, suggestPlan } from '../services/planner.js';
import { LIGHT_ORDER, LIGHT_LABEL } from '../services/matchmaker.js';
import { productCard } from '../services/serialize.js';
import { award } from '../services/gardenService.js';

const router = Router();
const ROOMS = ['bedroom', 'living-room', 'study', 'bathroom', 'balcony', 'office', 'other'];

function parseConfig(body = {}) {
  return {
    room: oneOf(body.room, ROOMS, 'living-room'),
    size: oneOf(body.size, Object.keys(ROOM_SIZES), 'medium'),
    windowSide: oneOf(body.windowSide, WINDOW_SIDES, 'south'),
    windowLight: oneOf(body.windowLight, LIGHT_ORDER, 'bright-indirect'),
  };
}

const view = (cfg, evaluation, products) => ({
  config: cfg,
  map: evaluation.map,
  score: evaluation.score,
  capacity: evaluation.capacity,
  notes: evaluation.notes,
  placements: evaluation.items,
  plants: products.map(productCard),
});

router.get('/config', (_req, res) =>
  res.json({
    sizes: Object.entries(ROOM_SIZES).map(([value, s]) => ({ value, ...s })),
    windowSides: WINDOW_SIDES,
    lightLevels: LIGHT_ORDER.map((value) => ({ value, label: LIGHT_LABEL[value] })),
    rooms: ROOMS,
  })
);

router.post('/map', (req, res) => res.json({ map: lightMap(parseConfig(req.body)) }));

async function placementsFrom(raw, all) {
  const byId = new Map(all.map((p) => [p.id, p]));
  const list = [];
  const seen = new Set();
  for (const pl of Array.isArray(raw) ? raw : []) {
    const x = Number(pl.x);
    const y = Number(pl.y);
    const product = byId.get(String(pl.productId));
    if (!Number.isInteger(x) || !Number.isInteger(y) || !product) continue;
    if (!product.isPlant) throw badRequest('Only plants can be placed in the planner.');
    const key = `${x},${y}`;
    if (seen.has(key)) throw badRequest('Two plants cannot share the same spot.');
    seen.add(key);
    list.push({ x, y, product });
  }
  return list;
}

router.post(
  '/evaluate',
  asyncHandler(async (req, res) => {
    const cfg = parseConfig(req.body);
    const all = await getAllProducts();
    const placements = await placementsFrom(req.body?.placements, all);
    const map = lightMap(cfg);
    const inGrid = placements.filter((p) => p.y >= 0 && p.y < map.rows && p.x >= 0 && p.x < map.cols);
    res.json(view(cfg, evaluatePlan(cfg, inGrid), inGrid.map((p) => p.product)));
  })
);

router.post(
  '/suggest',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cfg = parseConfig(req.body);
    const all = await getAllProducts();
    const prefs = req.user?.preferences || {};
    const { placements, evaluation } = suggestPlan(
      { ...cfg, pets: oneOf(req.body?.pets, ['yes', 'no', 'unspecified'], prefs.pets || 'unspecified'), experience: oneOf(req.body?.experience, ['beginner', 'intermediate', 'expert'], prefs.experience || 'beginner'), count: Number(req.body?.count) || undefined },
      all
    );
    res.json(view(cfg, evaluation, placements.map((p) => p.product)));
  })
);

// ───── Saved plans ─────
async function planView(plan, all) {
  const p = plan.toJSON();
  const byId = new Map(all.map((x) => [x.id, x]));
  const placements = p.placements.map((pl) => ({ x: pl.x, y: pl.y, product: byId.get(String(pl.product)) })).filter((pl) => pl.product);
  const cfg = { room: p.room, size: p.size, windowSide: p.windowSide, windowLight: p.windowLight };
  const map = lightMap(cfg);
  const valid = placements.filter((pl) => pl.y < map.rows && pl.x < map.cols);
  const ev = evaluatePlan(cfg, valid);
  return { id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, ...view(cfg, ev, valid.map((x) => x.product)) };
}

router.get(
  '/plans',
  protect,
  asyncHandler(async (req, res) => {
    const [plans, all] = await Promise.all([RoomPlan.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(30), getAllProducts()]);
    res.json({ plans: await Promise.all(plans.map((p) => planView(p, all))) });
  })
);

router.post(
  '/plans',
  protect,
  asyncHandler(async (req, res) => {
    const cfg = parseConfig(req.body);
    const name = str(req.body?.name, 60);
    if (name.length < 2) throw badRequest('Give your plan a name.', { name: 'Give your plan a name.' });
    const all = await getAllProducts();
    const placements = await placementsFrom(req.body?.placements, all);
    if (!placements.length) throw badRequest('Place at least one plant before saving.');
    const ev = evaluatePlan(cfg, placements);
    let plan;
    const id = req.body?.id;
    if (id && isObjectId(String(id))) plan = await RoomPlan.findOne({ _id: id, user: req.user._id });
    if (!plan && (await RoomPlan.countDocuments({ user: req.user._id })) >= 30) throw badRequest('You can save up to 30 plans – delete one first.');
    const data = { ...cfg, name, score: ev.score, placements: placements.map((p) => ({ x: p.x, y: p.y, product: p.product.id })) };
    const isNew = !plan;
    if (plan) Object.assign(plan, data);
    else plan = new RoomPlan({ ...data, user: req.user._id });
    await plan.save();
    const rewards = isNew ? await award(req.user, 'planner', { tz: req.tz, counter: 'planner' }) : null;
    res.status(isNew ? 201 : 200).json({ plan: await planView(plan, all), rewards });
  })
);

router.delete(
  '/plans/:id',
  protect,
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id, 'plan id');
    const r = await RoomPlan.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!r.deletedCount) throw notFound('Plan not found.');
    res.json({ ok: true });
  })
);

export default router;

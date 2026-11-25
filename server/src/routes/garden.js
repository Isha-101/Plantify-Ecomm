import { Router } from 'express';
import { GardenPlant, TASK_TYPES, MOODS } from '../models/GardenPlant.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { Validator, assertObjectId, isObjectId, num, oneOf, str } from '../utils/validate.js';
import { dayKey, DAY_MS } from '../utils/dates.js';
import { getProductsByIds } from '../services/catalogueService.js';
import { buildCalendar, defaultTasks, remindersFor, seasonOf, SEASON_NOTE, TASK_META } from '../services/care.js';
import { gamificationSummary } from '../services/gamification.js';
import { award, buildPlantFromProduct, collectStats, serializePlant, weeklyChallenges } from '../services/gardenService.js';
import { productCard } from '../services/serialize.js';
import { dailyTips } from '../seed/careContent.js';

const router = Router();
router.use(protect);

const LOCATIONS = ['bedroom', 'living-room', 'study', 'bathroom', 'balcony', 'office', 'other'];
const LIGHTS = ['low', 'medium', 'bright-indirect', 'bright-direct', 'unsure'];

const ctx = (req) => ({ now: new Date(), tz: req.tz, climate: req.user.preferences?.climate || 'tropical-india' });
const view = (plant, req) => serializePlant(plant, ctx(req));

async function findPlant(req) {
  assertObjectId(req.params.id, 'plant id');
  const plant = await GardenPlant.findOne({ _id: req.params.id, user: req.user._id });
  if (!plant) throw notFound('We could not find that plant in your garden.');
  return plant;
}

const seasonInfo = (req) => {
  const { now, tz, climate } = ctx(req);
  const name = seasonOf(now, climate, tz);
  return { name, note: SEASON_NOTE[name] };
};

function parseDate(v, { allowFuture = false } = {}) {
  if (v === undefined || v === null || v === '') return new Date();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw badRequest('That date is not valid.');
  if (!allowFuture && d.getTime() > Date.now() + 36e5) throw badRequest('That date is in the future.');
  if (d.getTime() < Date.now() - 5 * 365 * DAY_MS) throw badRequest('That date is too far in the past.');
  return d;
}

// ───── List / create ─────
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const docs = await GardenPlant.find({ user: req.user._id }).sort({ createdAt: -1 });
    const c = ctx(req);
    const plants = docs.map((d) => view(d, req));
    res.json({
      plants,
      reminders: remindersFor(docs.map((d) => d.toJSON()), c.now, c.tz, c.climate),
      gamification: gamificationSummary(req.user.gamification, dayKey(c.now, c.tz)),
      season: seasonInfo(req),
      tip: dailyTips[Math.floor(Date.now() / DAY_MS) % dailyTips.length],
    });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if ((await GardenPlant.countDocuments({ user: req.user._id })) >= 100) throw badRequest('Your garden is full (100 plants) – remove one first.');
    let product = null;
    if (b.productId) {
      if (!isObjectId(String(b.productId))) throw badRequest('Invalid product.');
      [product] = await getProductsByIds([b.productId]);
      if (!product || !product.isPlant) throw badRequest('Only plants can be added to My Garden.');
    }
    const nickname = str(b.nickname, 60) || product?.name || '';
    new Validator().check('nickname', nickname.length >= 2, 'Give your plant a name.').done();

    const acquiredOn = parseDate(b.acquiredOn);
    const base = buildPlantFromProduct(product, {
      nickname,
      acquiredOn,
      location: oneOf(b.location, LOCATIONS, 'other'),
      light: oneOf(b.light, LIGHTS, undefined),
      notes: str(b.notes, 500),
      speciesName: str(b.speciesName, 80),
    });
    if (!product) base.tasks = defaultTasks(null).map((t) => ({ ...t, lastDoneAt: acquiredOn }));
    const plant = await GardenPlant.create({ ...base, user: req.user._id });
    const rewards = await award(req.user, 'addPlant', { tz: req.tz, plantId: String(plant._id) });
    res.status(201).json({ plant: view(plant, req), rewards });
  })
);

// ───── Aggregates (must come before /:id) ─────
router.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    const docs = await GardenPlant.find({ user: req.user._id });
    const c = ctx(req);
    res.json(remindersFor(docs.map((d) => d.toJSON()), c.now, c.tz, c.climate));
  })
);

router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const c = ctx(req);
    const today = dayKey(c.now, c.tz);
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.month || '')) ? String(req.query.month) : today.slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const docs = (await GardenPlant.find({ user: req.user._id })).map((d) => d.toJSON());
    const days = buildCalendar(docs, `${month}-01`, `${month}-${String(last).padStart(2, '0')}`, c.now, c.tz, c.climate);

    const weekEnd = new Date(c.now.getTime() + 7 * DAY_MS);
    const weekDays = buildCalendar(docs, today, dayKey(weekEnd, c.tz), c.now, c.tz, c.climate);
    const upcoming = Object.entries(weekDays).sort(([a], [b]) => a.localeCompare(b)).flatMap(([date, events]) => events.map((e) => ({ ...e, date })));

    res.json({
      month,
      today,
      days,
      upcoming,
      reminders: remindersFor(docs, c.now, c.tz, c.climate),
      season: seasonInfo(req),
      taskTypes: Object.fromEntries(Object.entries(TASK_META).map(([k, v]) => [k, v.label])),
    });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const c = ctx(req);
    const docs = await GardenPlant.find({ user: req.user._id });
    const plain = docs.map((d) => d.toJSON());
    const today = dayKey(c.now, c.tz);
    // Care activity for the last 14 days (for the little activity chart).
    const activity = [];
    for (let i = 13; i >= 0; i--) {
      const key = dayKey(new Date(c.now.getTime() - i * DAY_MS), c.tz);
      const count = plain.reduce((n, p) => n + (p.careLog || []).filter((l) => dayKey(l.at, c.tz) === key).length + (p.diary || []).filter((d) => dayKey(d.date, c.tz) === key).length, 0);
      activity.push({ date: key, count });
    }
    res.json({
      gamification: gamificationSummary(req.user.gamification, today),
      challenges: weeklyChallenges(plain, c.now, c.tz),
      totals: await collectStats(req.user),
      activity,
    });
  })
);

// ───── One plant ─────
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    let product = null;
    if (plant.product) {
      const [p] = await getProductsByIds([String(plant.product)]);
      product = p ? { ...productCard(p), care: p.care, watering: p.watering, petNote: p.petNote, botanicalName: p.botanicalName } : null;
    }
    res.json({ plant: view(plant, req), product });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const b = req.body || {};
    if (b.nickname !== undefined) {
      const n = str(b.nickname, 60);
      new Validator().check('nickname', n.length >= 2, 'Give your plant a name.').done();
      plant.nickname = n;
    }
    if (b.location !== undefined) plant.location = oneOf(b.location, LOCATIONS, plant.location);
    if (b.light !== undefined) plant.light = oneOf(b.light, LIGHTS, plant.light);
    if (b.notes !== undefined) plant.notes = str(b.notes, 500);
    if (b.acquiredOn !== undefined) plant.acquiredOn = parseDate(b.acquiredOn);
    if (Array.isArray(b.tasks)) {
      for (const t of b.tasks) {
        if (!TASK_TYPES.includes(t.type)) continue;
        const interval = Math.round(num(t.intervalDays, 0));
        const existing = plant.tasks.find((x) => x.type === t.type);
        if (existing) {
          if (interval >= 1 && interval <= 730) existing.intervalDays = interval;
          if (typeof t.enabled === 'boolean') existing.enabled = t.enabled;
        } else if (interval >= 1 && interval <= 730) {
          plant.tasks.push({ type: t.type, intervalDays: interval, enabled: t.enabled !== false, lastDoneAt: new Date() });
        }
      }
    }
    await plant.save();
    res.json({ plant: view(plant, req) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    await plant.deleteOne();
    res.json({ ok: true });
  })
);

// ───── Care log ─────
router.post(
  '/:id/care',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const type = req.body?.type;
    if (!TASK_TYPES.includes(type)) throw badRequest('Unknown care task.');
    const at = parseDate(req.body?.at);
    const note = str(req.body?.note, 200);

    plant.careLog.push({ type, at, note });
    if (plant.careLog.length > 300) plant.careLog = plant.careLog.slice(-300);
    let task = plant.tasks.find((t) => t.type === type);
    if (!task) {
      const d = defaultTasks(null).find((t) => t.type === type);
      plant.tasks.push({ type, intervalDays: d.intervalDays, enabled: true, lastDoneAt: at });
    } else if (!task.lastDoneAt || at > task.lastDoneAt) task.lastDoneAt = at;
    await plant.save();

    const rewards = await award(req.user, type, { tz: req.tz, plantId: String(plant._id) });
    res.status(201).json({ plant: view(plant, req), rewards });
  })
);

// ───── Diary ─────
router.post(
  '/:id/diary',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const note = str(req.body?.note, 1000);
    const health = Math.round(num(req.body?.health, 4));
    new Validator().check('note', note.length >= 3, 'Write a few words about your plant today.').check('health', health >= 1 && health <= 5, 'Choose a health rating from 1 to 5.').done();
    plant.diary.push({ date: parseDate(req.body?.date), note, mood: oneOf(req.body?.mood, MOODS, 'good'), health });
    await plant.save();
    const rewards = await award(req.user, 'diary', { tz: req.tz, plantId: String(plant._id) });
    res.status(201).json({ plant: view(plant, req), rewards });
  })
);

router.delete(
  '/:id/diary/:entryId',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const entry = plant.diary.id(req.params.entryId);
    if (!entry) throw notFound('Diary entry not found.');
    entry.deleteOne();
    await plant.save();
    res.json({ plant: view(plant, req) });
  })
);

// ───── Growth tracking ─────
router.post(
  '/:id/growth',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const heightCm = num(req.body?.heightCm);
    const leafCount = req.body?.leafCount === '' || req.body?.leafCount === undefined ? undefined : Math.round(num(req.body.leafCount, NaN));
    const v = new Validator();
    v.check('heightCm', heightCm !== undefined && heightCm >= 0 && heightCm <= 1000, 'Enter the height in centimetres.');
    v.check('leafCount', leafCount === undefined || (leafCount >= 0 && leafCount <= 10000), 'Leaf count must be a whole number.');
    v.done();
    plant.growth.push({ date: parseDate(req.body?.date), heightCm, leafCount, note: str(req.body?.note, 200) });
    await plant.save();
    const rewards = await award(req.user, 'growth', { tz: req.tz, plantId: String(plant._id) });
    res.status(201).json({ plant: view(plant, req), rewards });
  })
);

router.delete(
  '/:id/growth/:entryId',
  asyncHandler(async (req, res) => {
    const plant = await findPlant(req);
    const entry = plant.growth.id(req.params.entryId);
    if (!entry) throw notFound('Growth entry not found.');
    entry.deleteOne();
    await plant.save();
    res.json({ plant: view(plant, req) });
  })
);

export default router;

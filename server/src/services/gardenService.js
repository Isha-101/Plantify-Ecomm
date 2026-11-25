// Database-aware helpers for My Garden and gamification.

import { GardenPlant } from '../models/GardenPlant.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { defaultTasks, plantCare, seasonOf, SEASON_NOTE } from './care.js';
import { applyAction, evaluateBadges, gamificationSummary } from './gamification.js';
import { dayKey, startOfLocalDay, DAY_MS } from '../utils/dates.js';
import { toIdString } from './serialize.js';

export function serializePlant(plant, { now = new Date(), tz = 330, climate = 'tropical-india' } = {}) {
  const p = typeof plant.toJSON === 'function' ? plant.toJSON() : plant;
  const care = plantCare(p, now, tz, climate);
  const latestDiary = [...(p.diary || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const latestGrowth = [...(p.growth || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  let health = 'thriving';
  if (care.overdueCount >= 2 || (latestDiary && latestDiary.health <= 2)) health = 'needs-attention';
  else if (care.overdueCount === 1 || (latestDiary && latestDiary.health === 3)) health = 'ok';
  return {
    ...p,
    product: p.product ? toIdString(p.product) : null,
    care,
    health,
    latestHeightCm: latestGrowth?.heightCm ?? null,
    careLog: [...(p.careLog || [])].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 60),
    diary: [...(p.diary || [])].sort((a, b) => new Date(b.date) - new Date(a.date)),
    growth: [...(p.growth || [])].sort((a, b) => new Date(a.date) - new Date(b.date)),
  };
}

export async function collectStats(user) {
  const [plants, orders, reviews] = await Promise.all([
    GardenPlant.find({ user: user._id }).select('careLog diary growth').lean(),
    Order.countDocuments({ user: user._id }),
    Review.countDocuments({ user: user._id }),
  ]);
  const careLogs = plants.reduce((n, p) => n + (p.careLog?.length || 0), 0);
  const waterLogs = plants.reduce((n, p) => n + (p.careLog || []).filter((c) => c.type === 'water').length, 0);
  const c = user.gamification?.counters || {};
  return {
    plants: plants.length,
    careLogs,
    waterLogs,
    diary: plants.reduce((n, p) => n + (p.diary?.length || 0), 0),
    growth: plants.reduce((n, p) => n + (p.growth?.length || 0), 0),
    orders,
    reviews,
    matchmaker: c.matchmaker || 0,
    sos: c.sos || 0,
    kits: c.kits || 0,
    planner: c.planner || 0,
  };
}

/**
 * Awards points for an action, updates the streak, evaluates badges and saves the user.
 * Returns { gained, newBadges, summary }.
 */
export async function award(user, action, { tz = 330, plantId, counter } = {}) {
  user.gamification ||= {};
  if (counter) {
    user.gamification.counters ||= {};
    user.gamification.counters[counter] = (user.gamification.counters[counter] || 0) + 1;
  }
  const today = dayKey(new Date(), tz);
  const g = user.gamification;
  const { gained } = applyAction(g, action, { dayKey: today, plantId });
  const stats = await collectStats(user);
  const newBadges = evaluateBadges(g, stats);
  user.markModified('gamification');
  await user.save();
  return { gained, newBadges, summary: gamificationSummary(g, today) };
}

export function buildPlantFromProduct(product, overrides = {}) {
  const tasks = defaultTasks(product);
  const acquired = overrides.acquiredOn ? new Date(overrides.acquiredOn) : new Date();
  return {
    product: product?.id,
    nickname: overrides.nickname || product?.name || 'My plant',
    speciesName: product?.name || overrides.speciesName || '',
    botanicalName: product?.botanicalName || overrides.botanicalName || '',
    image: product?.image || overrides.image || '',
    location: overrides.location || 'other',
    light: overrides.light || product?.light || 'unsure',
    acquiredOn: acquired,
    notes: overrides.notes || '',
    tasks: tasks.map((t) => ({ ...t, lastDoneAt: acquired })),
  };
}

/** Weekly challenges, computed from the last 7 local days of activity. */
export function weeklyChallenges(plants, now = new Date(), tz = 330) {
  const since = startOfLocalDay(now, tz) - 6 * DAY_MS;
  const inWeek = (d) => new Date(d).getTime() >= since;
  const logs = plants.flatMap((p) => (p.careLog || []).filter((l) => inWeek(l.at)).map((l) => ({ ...l, plant: toIdString(p.id ?? p._id) })));
  const diary = plants.reduce((n, p) => n + (p.diary || []).filter((d) => inWeek(d.date)).length, 0);
  const growth = plants.reduce((n, p) => n + (p.growth || []).filter((g) => inWeek(g.date)).length, 0);
  const waters = logs.filter((l) => l.type === 'water').length;
  const carePlants = new Set(logs.map((l) => l.plant)).size;
  const mk = (key, title, target, progress) => ({ key, title, target, progress: Math.min(progress, target), done: progress >= target });
  return [
    mk('water-5', 'Water your plants 5 times', 5, waters),
    mk('care-3', 'Care for 3 different plants', 3, carePlants),
    mk('diary-2', 'Write 2 diary entries', 2, diary),
    mk('growth-1', 'Record a growth measurement', 1, growth),
  ];
}

export { seasonOf, SEASON_NOTE };

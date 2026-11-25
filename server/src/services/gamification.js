// Points, streaks, levels and badges. Pure functions – persistence is handled by the routes.

import { daysBetweenKeys } from '../utils/dates.js';

export const POINTS = {
  water: 5,
  fertilize: 8,
  mist: 3,
  rotate: 3,
  prune: 5,
  repot: 12,
  clean: 4,
  'pest-check': 5,
  addPlant: 20,
  diary: 5,
  growth: 10,
  review: 10,
  order: 15,
  matchmaker: 10,
  sos: 3,
  kit: 10,
  planner: 5,
};

// Actions that count as "caring for plants today" and so extend the streak.
const CARE_ACTIONS = new Set(['water', 'fertilize', 'mist', 'rotate', 'prune', 'repot', 'clean', 'pest-check', 'diary', 'growth']);

// Actions whose points may only be earned once per plant per day (prevents farming).
const DEDUPED_PER_PLANT = new Set([...CARE_ACTIONS]);
const DEDUPED_PER_DAY = new Set(['matchmaker', 'sos', 'kit', 'planner']);

export const LEVELS = [
  { name: 'Seedling', min: 0 },
  { name: 'Sprout', min: 100 },
  { name: 'Sapling', min: 300 },
  { name: 'Green Thumb', min: 700 },
  { name: 'Plant Master', min: 1500 },
];

export function levelFor(points) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (points >= l.min) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    index: idx,
    name: cur.name,
    min: cur.min,
    next: next ? { name: next.name, min: next.min } : null,
    progressPct: next ? Math.round(((points - cur.min) / (next.min - cur.min)) * 100) : 100,
  };
}

export const BADGES = [
  { key: 'first-sprout', title: 'First Sprout', description: 'Add your first plant to My Garden.', icon: 'sprout', check: (s) => s.plants >= 1 },
  { key: 'mini-jungle', title: 'Mini Jungle', description: 'Grow a garden of 5 plants.', icon: 'trees', check: (s) => s.plants >= 5 },
  { key: 'green-thumb', title: 'Green Thumb', description: 'Log 25 care activities.', icon: 'hand', check: (s) => s.careLogs >= 25 },
  { key: 'watering-pro', title: 'Watering Pro', description: 'Water your plants 20 times.', icon: 'droplets', check: (s) => s.waterLogs >= 20 },
  { key: 'streak-3', title: 'On a Roll', description: 'Care for plants 3 days in a row.', icon: 'flame', check: (s) => s.longestStreak >= 3 },
  { key: 'streak-7', title: 'Week of Care', description: 'Keep a 7-day care streak.', icon: 'flame', check: (s) => s.longestStreak >= 7 },
  { key: 'streak-30', title: 'Devoted Gardener', description: 'Keep a 30-day care streak.', icon: 'award', check: (s) => s.longestStreak >= 30 },
  { key: 'diary-keeper', title: 'Diary Keeper', description: 'Write 5 plant diary entries.', icon: 'notebook-pen', check: (s) => s.diary >= 5 },
  { key: 'growth-tracker', title: 'Growth Tracker', description: 'Record 3 growth measurements.', icon: 'ruler', check: (s) => s.growth >= 3 },
  { key: 'plant-matchmaker', title: 'Plant Matched', description: 'Complete the Plant Matchmaker.', icon: 'heart', check: (s) => s.matchmaker >= 1 },
  { key: 'plant-doctor', title: 'Plant Doctor', description: 'Use Plant SOS to diagnose a problem.', icon: 'stethoscope', check: (s) => s.sos >= 1 },
  { key: 'kit-creator', title: 'Kit Creator', description: 'Build and add a custom plant kit.', icon: 'package', check: (s) => s.kits >= 1 },
  { key: 'room-designer', title: 'Room Designer', description: 'Save a room arrangement plan.', icon: 'layout-grid', check: (s) => s.planner >= 1 },
  { key: 'first-order', title: 'First Order', description: 'Place your first order.', icon: 'shopping-bag', check: (s) => s.orders >= 1 },
  { key: 'reviewer', title: 'Helpful Reviewer', description: 'Review a product you have grown.', icon: 'star', check: (s) => s.reviews >= 1 },
];

/** Streak as it should be displayed today (a missed day resets it). */
export function effectiveStreak(g, today) {
  const s = g?.streak || {};
  if (!s.lastDay) return { current: 0, longest: s.longest || 0, lastDay: '', activeToday: false };
  const gap = daysBetweenKeys(s.lastDay, today);
  return {
    current: gap <= 1 ? s.current || 0 : 0,
    longest: s.longest || 0,
    lastDay: s.lastDay,
    activeToday: gap === 0,
  };
}

/**
 * Applies an action to the gamification state (mutates `g`, a plain object or Mongoose subdoc).
 * Returns { gained, streakChanged }. Badges are evaluated separately with `evaluateBadges`.
 */
export function applyAction(g, action, { dayKey, plantId } = {}) {
  const base = POINTS[action];
  if (base == null) return { gained: 0 };
  g.recentActions ||= [];

  let key = null;
  if (DEDUPED_PER_PLANT.has(action)) key = `${action}:${plantId || '-'}:${dayKey}`;
  else if (DEDUPED_PER_DAY.has(action)) key = `${action}:-:${dayKey}`;

  let gained = base;
  if (key) {
    if (g.recentActions.includes(key)) gained = 0;
    else g.recentActions.push(key);
  }
  // Keep the dedupe list small (only the last two days are relevant).
  if (g.recentActions.length > 400) g.recentActions = g.recentActions.slice(-300);

  g.points = (g.points || 0) + gained;

  if (CARE_ACTIONS.has(action) && dayKey) {
    g.streak ||= { current: 0, longest: 0, lastDay: '' };
    const last = g.streak.lastDay;
    if (last !== dayKey) {
      const gap = last ? daysBetweenKeys(last, dayKey) : null;
      g.streak.current = gap === 1 ? (g.streak.current || 0) + 1 : 1;
      g.streak.lastDay = dayKey;
      g.streak.longest = Math.max(g.streak.longest || 0, g.streak.current);
    }
  }
  return { gained };
}

/** Returns newly earned badges and records them on `g.badges`. */
export function evaluateBadges(g, stats) {
  g.badges ||= [];
  const have = new Set(g.badges.map((b) => b.key));
  const fresh = [];
  for (const b of BADGES) {
    if (!have.has(b.key) && b.check({ ...stats, longestStreak: Math.max(stats.longestStreak || 0, g.streak?.longest || 0) })) {
      g.badges.push({ key: b.key, earnedAt: new Date() });
      fresh.push({ key: b.key, title: b.title, description: b.description, icon: b.icon });
    }
  }
  return fresh;
}

export function gamificationSummary(g, today) {
  const points = g?.points || 0;
  const earned = new Map((g?.badges || []).map((b) => [b.key, b.earnedAt]));
  return {
    points,
    level: levelFor(points),
    streak: effectiveStreak(g, today),
    badges: BADGES.map((b) => ({ key: b.key, title: b.title, description: b.description, icon: b.icon, earned: earned.has(b.key), earnedAt: earned.get(b.key) || null })),
  };
}

// Smart care schedules: default tasks per plant, season-aware intervals, due dates and a calendar.

import { dayKey, daysBetweenKeys } from '../utils/dates.js';

export const TASK_META = {
  water: { label: 'Water', verb: 'Watered', icon: 'droplets' },
  fertilize: { label: 'Fertilise', verb: 'Fertilised', icon: 'sprout' },
  mist: { label: 'Mist', verb: 'Misted', icon: 'cloud-drizzle' },
  rotate: { label: 'Rotate', verb: 'Rotated', icon: 'refresh-cw' },
  prune: { label: 'Prune / deadhead', verb: 'Pruned', icon: 'scissors' },
  repot: { label: 'Repot', verb: 'Repotted', icon: 'package-open' },
  clean: { label: 'Clean leaves', verb: 'Cleaned leaves of', icon: 'sparkles' },
  'pest-check': { label: 'Pest check', verb: 'Checked for pests on', icon: 'bug' },
};

/** Default tasks derived from the product's attributes. */
export function defaultTasks(product) {
  const p = product || {};
  const tasks = [];
  const water = p.watering?.intervalDays || 7;
  tasks.push({ type: 'water', intervalDays: water, enabled: true });
  tasks.push({ type: 'fertilize', intervalDays: p.plantType === 'succulent' ? 60 : p.plantType === 'flowering' || p.plantType === 'herb' ? 21 : 30, enabled: true });
  tasks.push({ type: 'mist', intervalDays: 3, enabled: p.humidity === 'high' });
  tasks.push({ type: 'rotate', intervalDays: 14, enabled: p.placement !== 'outdoor' });
  tasks.push({ type: 'pest-check', intervalDays: 21, enabled: true });
  tasks.push({ type: 'prune', intervalDays: p.plantType === 'flowering' || p.plantType === 'herb' ? 30 : 60, enabled: false });
  tasks.push({ type: 'clean', intervalDays: 30, enabled: false });
  tasks.push({ type: 'repot', intervalDays: 365, enabled: false });
  return tasks;
}

// ───────── Seasons ─────────

export function seasonOf(date, climate = 'tropical-india', tz = 330) {
  const month = Number(dayKey(date, tz).slice(5, 7)); // 1–12
  if (climate === 'tropical-india') {
    if (month === 12 || month <= 2) return 'winter';
    if (month <= 6) return 'summer';
    if (month <= 9) return 'monsoon';
    return 'autumn';
  }
  const north = climate !== 'temperate-south';
  const m = north ? month : ((month + 5) % 12) + 1; // shift six months for the southern hemisphere
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

const WATER_FACTOR = { summer: 0.85, monsoon: 1.2, autumn: 1.0, spring: 1.0, winter: 1.35 };
const FEED_FACTOR = { winter: 2.5, monsoon: 1.0, summer: 1.0, spring: 1.0, autumn: 1.2 };

export const SEASON_NOTE = {
  summer: 'Summer: plants dry out faster, so watering is a little more frequent.',
  monsoon: 'Monsoon: humid air slows drying, so watering is spaced out. Watch for fungal spots.',
  autumn: 'Autumn: steady growth – normal schedule.',
  spring: 'Spring: growth picks up – normal schedule.',
  winter: 'Winter: growth slows, so watering and feeding are spaced out.',
};

export function effectiveInterval(task, season) {
  let f = 1;
  if (task.type === 'water') f = WATER_FACTOR[season] ?? 1;
  else if (task.type === 'fertilize') f = FEED_FACTOR[season] ?? 1;
  else if (task.type === 'mist') f = season === 'summer' ? 0.7 : season === 'monsoon' ? 2 : 1;
  return Math.max(1, Math.round(task.intervalDays * f));
}

// ───────── Day-key arithmetic ─────────

export function addDaysKey(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Computes the status of one task for a plant. `now` and `lastDoneAt` are Dates / ISO strings. */
export function taskStatus(plant, task, now = new Date(), tz = 330, climate = 'tropical-india') {
  const today = dayKey(now, tz);
  const baseline = task.lastDoneAt || plant.acquiredOn || plant.createdAt || now;
  const lastKey = dayKey(baseline, tz);
  const season = seasonOf(now, climate, tz);
  const interval = effectiveInterval(task, season);
  const nextKey = addDaysKey(lastKey, interval);
  const daysUntil = daysBetweenKeys(today, nextKey);
  return {
    type: task.type,
    label: TASK_META[task.type]?.label || task.type,
    enabled: task.enabled !== false,
    intervalDays: task.intervalDays,
    effectiveIntervalDays: interval,
    lastDoneAt: task.lastDoneAt || null,
    nextDueDay: nextKey,
    daysUntil,
    status: daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : 'upcoming',
  };
}

export function plantCare(plant, now = new Date(), tz = 330, climate = 'tropical-india') {
  const tasks = (plant.tasks || []).map((t) => taskStatus(plant, t, now, tz, climate));
  const active = tasks.filter((t) => t.enabled);
  return {
    tasks,
    overdueCount: active.filter((t) => t.status === 'overdue').length,
    dueTodayCount: active.filter((t) => t.status === 'today').length,
    nextTask: [...active].sort((a, b) => a.daysUntil - b.daysUntil)[0] || null,
  };
}

/** Builds { 'YYYY-MM-DD': [events] } for a date range (inclusive day keys). */
export function buildCalendar(plants, fromKey, toKey, now = new Date(), tz = 330, climate = 'tropical-india') {
  const today = dayKey(now, tz);
  const days = {};
  const push = (key, ev) => {
    (days[key] ||= []).push(ev);
  };
  for (const plant of plants) {
    for (const task of plant.tasks || []) {
      if (task.enabled === false) continue;
      const st = taskStatus(plant, task, now, tz, climate);
      let key = st.nextDueDay;
      let first = true;
      let guard = 0;
      while (key <= toKey && guard++ < 80) {
        const overdue = first && key < today;
        const eventKey = overdue ? today : key;
        if (eventKey >= fromKey && eventKey <= toKey) {
          push(eventKey, {
            plantId: String(plant.id),
            plantName: plant.nickname,
            image: plant.image,
            type: task.type,
            label: TASK_META[task.type]?.label || task.type,
            status: overdue ? 'overdue' : key === today ? 'today' : 'upcoming',
            daysOverdue: overdue ? daysBetweenKeys(key, today) : 0,
            projected: !first,
          });
        }
        // Project the next occurrence assuming this one gets done on its day.
        const doneKey = overdue ? today : key;
        const season = seasonOf(new Date(`${doneKey}T12:00:00Z`), climate, 0);
        key = addDaysKey(doneKey, effectiveInterval(task, season));
        first = false;
      }
    }
  }
  return days;
}

export function remindersFor(plants, now = new Date(), tz = 330, climate = 'tropical-india') {
  const today = dayKey(now, tz);
  const list = [];
  for (const plant of plants) {
    for (const task of plant.tasks || []) {
      if (task.enabled === false) continue;
      const st = taskStatus(plant, task, now, tz, climate);
      if (st.daysUntil <= 0) {
        list.push({
          plantId: String(plant.id),
          plantName: plant.nickname,
          image: plant.image,
          type: task.type,
          label: st.label,
          status: st.status,
          daysOverdue: st.daysUntil < 0 ? -st.daysUntil : 0,
        });
      }
    }
  }
  list.sort((a, b) => (a.status === b.status ? b.daysOverdue - a.daysOverdue : a.status === 'overdue' ? -1 : 1));
  return { today, items: list, overdue: list.filter((r) => r.status === 'overdue').length, dueToday: list.filter((r) => r.status === 'today').length };
}

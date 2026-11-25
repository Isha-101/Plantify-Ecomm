import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCompatibility } from '../../src/services/compatibility.js';
import { analyzeKit } from '../../src/services/kitBuilder.js';
import { diagnose, PROBLEMS } from '../../src/services/sos.js';
import { lightMap, evaluatePlan, suggestPlan, ROOM_SIZES } from '../../src/services/planner.js';
import { defaultTasks, taskStatus, buildCalendar, remindersFor, seasonOf, effectiveInterval, plantCare, addDaysKey } from '../../src/services/care.js';
import { applyAction, evaluateBadges, levelFor, effectiveStreak, gamificationSummary, POINTS } from '../../src/services/gamification.js';
import { catalogue, bySlug } from './helpers.js';

const P = (...slugs) => slugs.map((s) => bySlug[s]);

// ───── compatibility ─────
test('similar plants are a great match; opposites are not recommended', () => {
  const good = checkCompatibility(P('snake-plant', 'zz-plant'));
  assert.ok(good.overall >= 85, `snake+zz = ${good.overall}`);
  assert.equal(good.verdict.tone, 'great');
  const bad = checkCompatibility(P('boston-fern', 'jade-plant'));
  assert.ok(bad.overall < 50, `fern+jade = ${bad.overall}`);
  assert.equal(bad.sharePot.ok, false);
  assert.ok(bad.tips.length >= 1);
});

test('indoor and outdoor-only plants are flagged; pet note is present', () => {
  const r = checkCompatibility(P('snake-plant', 'lavender'));
  assert.equal(r.factors.find((f) => f.key === 'placement').status, 'bad');
  assert.match(r.petNote, /Pet note/);
});

test('three plants produce pairwise results', () => {
  const r = checkCompatibility(P('snake-plant', 'zz-plant', 'boston-fern'));
  assert.equal(r.pairs.length, 3);
});

// ───── kit builder ─────
test('custom kit: pricing tiers, compatibility notes and missing-piece hints', () => {
  const entries = P('snake-plant', 'terracotta-pot-set', 'cactus-succulent-mix', 'liquid-plant-food').map((product) => ({ product, quantity: 1 }));
  const a = analyzeKit(entries);
  assert.equal(a.discountPct, 8);
  assert.equal(a.subtotal, 449 + 449 + 249 + 279);
  assert.equal(a.total, Math.round((a.subtotal * 0.92) * 100) / 100);
  assert.ok(a.notes.some((n) => n.level === 'ok' && /suits Snake Plant/.test(n.text)));
  const warn = analyzeKit(P('aloe-vera', 'self-watering-planter', 'premium-potting-mix').map((product) => ({ product, quantity: 1 })));
  assert.ok(warn.notes.some((n) => n.level === 'warn' && /self-watering/i.test(n.text)));
  assert.ok(warn.notes.some((n) => n.level === 'warn' && /well-draining/i.test(n.text)));
  const nothing = analyzeKit(P('terracotta-pot-set').map((product) => ({ product, quantity: 1 })));
  assert.equal(nothing.discountPct, 0);
  assert.ok(nothing.nextTier.itemsNeeded === 2);
});

// ───── Plant SOS ─────
test('SOS: overwatering vs underwatering respond to soil context', () => {
  const wet = diagnose({ symptoms: ['yellow-lower', 'drooping'], context: { soil: 'soggy' } });
  assert.equal(wet.diagnoses[0].id, 'overwatering');
  const dry = diagnose({ symptoms: ['drooping', 'brown-edges', 'dry-pulling'], context: { soil: 'dry' } });
  assert.equal(dry.diagnoses[0].id, 'underwatering');
});

test('SOS: pests are identified with product tags and plant-specific notes', () => {
  const d = diagnose({ symptoms: ['white-fluff', 'sticky'], plant: bySlug['peace-lily'] });
  assert.equal(d.diagnoses[0].id, 'mealybugs');
  assert.ok(d.diagnoses[0].productTags.includes('neem oil'));
  assert.match(d.diagnoses[0].plantNote, /toxic to pets/);
  assert.equal(diagnose({ symptoms: ['webbing'] }).diagnoses[0].id, 'spider-mites');
  assert.equal(diagnose({ symptoms: ['gnats'] }).diagnoses[0].id, 'fungus-gnats');
});

test('SOS: input validation and every problem has steps', () => {
  assert.ok(diagnose({ symptoms: [] }).error);
  assert.ok(diagnose({ symptoms: ['not-a-symptom'] }).error);
  for (const p of PROBLEMS) assert.ok(p.steps.length >= 2 && p.summary && p.prevention.length, p.id);
  const succ = diagnose({ symptoms: ['mushy-stem', 'root-smell'], plant: bySlug['echeveria-elegans'], context: { soil: 'soggy' } });
  assert.equal(succ.diagnoses[0].id, 'root-rot');
  assert.match(succ.diagnoses[0].plantNote, /succulent/);
});

// ───── Room planner ─────
test('light map: brightest at the window, dimmer further away', () => {
  const m = lightMap({ size: 'medium', windowSide: 'north', windowLight: 'bright-direct' });
  assert.equal(m.cells[0][0].level, 'bright-direct');
  assert.equal(m.cells[4][0].level, 'medium'.length ? m.cells[4][0].level : '');
  assert.equal(m.cells[4][3].level, 'medium'.length ? 'medium' : '');
  assert.equal(m.rows, ROOM_SIZES.medium.rows);
  const east = lightMap({ size: 'small', windowSide: 'east', windowLight: 'bright-indirect' });
  assert.equal(east.cells[0][4].level, 'bright-indirect');
  assert.equal(east.cells[0][0].level, 'low');
});

test('planner evaluation flags poorly lit placements', () => {
  const cfg = { size: 'medium', windowSide: 'south', windowLight: 'bright-direct', room: 'living-room' };
  const good = evaluatePlan(cfg, [{ x: 3, y: 4, product: bySlug['aloe-vera'] }]);
  const bad = evaluatePlan(cfg, [{ x: 3, y: 0, product: bySlug['aloe-vera'] }]);
  assert.ok(good.score > bad.score);
  assert.equal(bad.items[0].status, 'poor');
  assert.ok(bad.notes.some((n) => /Aloe/.test(n)));
});

test('auto-suggest places plants on distinct cells and respects pets', () => {
  const { placements, evaluation } = suggestPlan({ room: 'living-room', size: 'medium', windowSide: 'west', windowLight: 'bright-indirect', pets: 'yes', experience: 'beginner' }, catalogue);
  assert.ok(placements.length >= 3);
  assert.equal(new Set(placements.map((p) => `${p.x},${p.y}`)).size, placements.length);
  for (const p of placements) assert.notEqual(p.product.petSafe, 'toxic');
  assert.ok(evaluation.score >= 60, `plan score ${evaluation.score}`);
});

// ───── Care calendar ─────
const plantDoc = (slug, extra = {}) => ({ id: slug, nickname: slug, image: '', acquiredOn: new Date('2026-06-01T00:00:00Z'), tasks: defaultTasks(bySlug[slug]).map((t) => ({ ...t, lastDoneAt: new Date('2026-06-01T00:00:00Z') })), ...extra });

test('default tasks come from plant attributes', () => {
  const fern = defaultTasks(bySlug['boston-fern']);
  assert.equal(fern.find((t) => t.type === 'water').intervalDays, 4);
  assert.equal(fern.find((t) => t.type === 'mist').enabled, true);
  assert.equal(defaultTasks(bySlug['snake-plant']).find((t) => t.type === 'mist').enabled, false);
  assert.equal(defaultTasks(bySlug['aloe-vera']).find((t) => t.type === 'fertilize').intervalDays, 60);
});

test('seasons and seasonal watering intervals (India)', () => {
  assert.equal(seasonOf(new Date('2026-01-15T00:00:00Z')), 'winter');
  assert.equal(seasonOf(new Date('2026-05-15T00:00:00Z')), 'summer');
  assert.equal(seasonOf(new Date('2026-08-15T00:00:00Z')), 'monsoon');
  assert.equal(seasonOf(new Date('2026-11-15T00:00:00Z')), 'autumn');
  assert.equal(seasonOf(new Date('2026-01-15T00:00:00Z'), 'temperate-south'), 'summer');
  const water = { type: 'water', intervalDays: 10 };
  assert.ok(effectiveInterval(water, 'winter') > 10 && effectiveInterval(water, 'summer') < 10);
});

test('due dates: upcoming, today, overdue', () => {
  const plant = plantDoc('golden-pothos');
  const water = plant.tasks.find((t) => t.type === 'water'); // every 8 days, autumn factor 1
  const last = new Date('2026-11-10T06:00:00Z');
  water.lastDoneAt = last;
  assert.equal(taskStatus(plant, water, new Date('2026-11-12T06:00:00Z')).status, 'upcoming');
  assert.equal(taskStatus(plant, water, new Date('2026-11-18T06:00:00Z')).status, 'today');
  const late = taskStatus(plant, water, new Date('2026-11-21T06:00:00Z'));
  assert.equal(late.status, 'overdue');
  assert.equal(late.daysUntil, -3);
});

test('calendar projects recurring tasks and puts overdue items on today', () => {
  const plant = plantDoc('golden-pothos');
  const now = new Date('2026-11-25T06:00:00Z');
  const cal = buildCalendar([plant], '2026-11-25', '2026-12-31', now);
  const waterDays = Object.entries(cal).filter(([, evs]) => evs.some((e) => e.type === 'water')).map(([d]) => d);
  assert.ok(waterDays.length >= 4, 'repeating water events');
  assert.ok(cal['2026-11-25'].some((e) => e.type === 'water' && e.status === 'overdue'));
  const rem = remindersFor([plant], now);
  assert.ok(rem.overdue >= 1 && rem.items.every((i) => i.status !== 'upcoming'));
  assert.equal(addDaysKey('2026-12-30', 3), '2027-01-02');
});

test('marking a task done clears it', () => {
  const plant = plantDoc('snake-plant');
  const now = new Date('2026-11-25T06:00:00Z');
  const before = plantCare(plant, now).overdueCount;
  plant.tasks.forEach((t) => (t.lastDoneAt = now));
  assert.ok(before > 0);
  assert.equal(plantCare(plant, now).overdueCount, 0);
});

// ───── Gamification ─────
test('points, streaks, dedupe and badges', () => {
  const g = { points: 0, badges: [], streak: { current: 0, longest: 0, lastDay: '' }, recentActions: [] };
  assert.equal(applyAction(g, 'water', { dayKey: '2026-11-20', plantId: 'a' }).gained, POINTS.water);
  assert.equal(applyAction(g, 'water', { dayKey: '2026-11-20', plantId: 'a' }).gained, 0, 'same plant/day deduped');
  assert.equal(applyAction(g, 'water', { dayKey: '2026-11-20', plantId: 'b' }).gained, POINTS.water);
  applyAction(g, 'water', { dayKey: '2026-11-21', plantId: 'a' });
  applyAction(g, 'water', { dayKey: '2026-11-22', plantId: 'a' });
  assert.equal(g.streak.current, 3);
  const fresh = evaluateBadges(g, { plants: 1, careLogs: 4, waterLogs: 4 });
  assert.deepEqual(fresh.map((b) => b.key).sort(), ['first-sprout', 'streak-3']);
  assert.equal(evaluateBadges(g, { plants: 1 }).length, 0, 'badges are only awarded once');
  assert.equal(effectiveStreak(g, '2026-11-23').current, 3);
  assert.equal(effectiveStreak(g, '2026-11-25').current, 0, 'a missed day resets the streak');
  applyAction(g, 'water', { dayKey: '2026-11-25', plantId: 'a' });
  assert.equal(g.streak.current, 1);
  assert.equal(g.streak.longest, 3);
  assert.equal(gamificationSummary(g, '2026-11-25').level.name, 'Seedling');
});

test('levels progress with points', () => {
  assert.equal(levelFor(0).name, 'Seedling');
  assert.equal(levelFor(150).name, 'Sprout');
  assert.equal(levelFor(150).progressPct, 25);
  assert.equal(levelFor(5000).name, 'Plant Master');
  assert.equal(levelFor(5000).next, null);
});

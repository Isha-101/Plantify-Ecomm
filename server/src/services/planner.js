// Room arrangement planner: turns window position + light into a grid of light zones,
// scores where plants sit, and can auto-suggest a layout.

import { lightScore, LIGHT_ORDER, LIGHT_LABEL } from './matchmaker.js';

export const ROOM_SIZES = {
  small: { cols: 5, rows: 4, label: 'Small (≈ 3 × 2.5 m)', capacity: 5 },
  medium: { cols: 7, rows: 5, label: 'Medium (≈ 4 × 3.5 m)', capacity: 8 },
  large: { cols: 9, rows: 6, label: 'Large (≈ 5 × 4 m)', capacity: 12 },
};
export const WINDOW_SIDES = ['north', 'east', 'south', 'west'];

const distanceFromWindow = (x, y, cols, rows, side) => ({ north: y, south: rows - 1 - y, west: x, east: cols - 1 - x })[side];

/** Grid of light levels: brightest next to the window, one level dimmer every two cells. */
export function lightMap({ size = 'medium', windowSide = 'south', windowLight = 'bright-indirect' }) {
  const { cols, rows } = ROOM_SIZES[size] || ROOM_SIZES.medium;
  const base = Math.max(0, LIGHT_ORDER.indexOf(windowLight));
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const dist = distanceFromWindow(x, y, cols, rows, windowSide);
      row.push({ x, y, dist, level: LIGHT_ORDER[Math.max(0, base - Math.floor(dist / 2))] });
    }
    cells.push(row);
  }
  return { cols, rows, cells };
}

export function evaluatePlan({ size, windowSide, windowLight, room }, placements) {
  const map = lightMap({ size, windowSide, windowLight });
  const cap = (ROOM_SIZES[size] || ROOM_SIZES.medium).capacity;
  const items = [];
  const notes = [];
  for (const pl of placements) {
    const cell = map.cells[pl.y]?.[pl.x];
    if (!cell) continue;
    const ls = lightScore(pl.product, cell.level);
    const roomOk = !room || room === 'other' || (pl.product.rooms || []).includes(room);
    const fit = ls.score;
    items.push({
      x: pl.x,
      y: pl.y,
      productId: pl.product.id,
      name: pl.product.name,
      image: pl.product.image,
      level: cell.level,
      levelLabel: LIGHT_LABEL[cell.level],
      fit: Math.round(fit * 100),
      status: fit >= 0.75 ? 'great' : fit >= 0.4 ? 'ok' : 'poor',
      detail: ls.detail,
      roomOk,
      heightCm: pl.product.matureSize?.heightCm || 0,
    });
  }
  // Tall plants right at the window shade the ones behind them.
  const tallAtWindow = items.filter((i) => i.heightCm >= 100 && map.cells[i.y][i.x].dist <= 1);
  if (tallAtWindow.length && items.some((i) => map.cells[i.y][i.x].dist > 2)) {
    notes.push(`${tallAtWindow.map((i) => i.name).join(', ')} is tall and next to the window – it may shade smaller plants behind it. Consider placing tall plants at the sides.`);
  }
  for (const i of items.filter((x) => x.status === 'poor')) notes.push(`${i.name}: ${i.detail} Move it to a ${i.level === 'low' ? 'brighter' : 'dimmer'} spot.`);
  for (const i of items.filter((x) => !x.roomOk)) notes.push(`${i.name} is not typically grown in a ${room.replace('-', ' ')}.`);
  if (items.length > cap) notes.push(`${items.length} plants is crowded for this room size – airflow and light matter. Aim for about ${cap}.`);
  const pets = items.length ? placements.filter((p) => p.product.petSafe === 'toxic').map((p) => p.product.name) : [];
  if (pets.length) notes.push(`Pet note: ${[...new Set(pets)].join(', ')} ${new Set(pets).size > 1 ? 'are' : 'is'} listed as toxic to pets – keep out of reach.`);

  const score = items.length ? Math.round(items.reduce((s, i) => s + i.fit, 0) / items.length) : 0;
  return { score, items, notes, map, capacity: cap };
}

/** Greedy auto-arrangement of the best-suited plants onto the best-matching light cells. */
export function suggestPlan({ room, size, windowSide, windowLight, pets = 'unspecified', experience = 'beginner', count }, products) {
  const map = lightMap({ size, windowSide, windowLight });
  const cap = (ROOM_SIZES[size] || ROOM_SIZES.medium).capacity;
  const target = Math.min(count || Math.ceil(cap * 0.6), cap);
  const expIdx = ['beginner', 'intermediate', 'expert'].indexOf(experience);
  const diffIdx = { easy: 0, moderate: 1, hard: 2 };

  const candidates = products
    .filter((p) => p.isPlant)
    .filter((p) => (room === 'balcony' ? p.placement !== 'indoor' : p.placement !== 'outdoor'))
    .filter((p) => !(pets === 'yes' && p.petSafe === 'toxic'))
    .filter((p) => (diffIdx[p.difficulty] ?? 0) <= Math.max(0, expIdx) + 1)
    .map((p) => {
      const roomBonus = room === 'other' || (p.rooms || []).includes(room) ? 1 : 0.5;
      const light = lightScore(p, windowLight).score;
      const easy = 1 - 0.15 * (diffIdx[p.difficulty] ?? 0);
      return { p, s: roomBonus * 0.4 + light * 0.4 + easy * 0.2 + (p.rating || 0) / 100 };
    })
    .sort((a, b) => b.s - a.s);

  // Pick a varied set: at most two plants per plant type until the list is full.
  const picked = [];
  const perType = {};
  for (const c of candidates) {
    const t = c.p.plantType || 'other';
    if ((perType[t] || 0) >= 2 && picked.length < target - 1) continue;
    picked.push(c.p);
    perType[t] = (perType[t] || 0) + 1;
    if (picked.length >= target) break;
  }
  for (const c of candidates) {
    if (picked.length >= target) break;
    if (!picked.includes(c.p)) picked.push(c.p);
  }

  // Place plants that need the most light first.
  picked.sort((a, b) => LIGHT_ORDER.indexOf(b.light) - LIGHT_ORDER.indexOf(a.light));
  const taken = [];
  const placements = [];
  const allCells = map.cells.flat();
  const isEdge = (c) => c.x === 0 || c.y === 0 || c.x === map.cols - 1 || c.y === map.rows - 1;
  const isCorner = (c) => (c.x === 0 || c.x === map.cols - 1) && (c.y === 0 || c.y === map.rows - 1);

  for (const p of picked) {
    let best = null;
    for (const c of allCells) {
      if (taken.some((t) => t.x === c.x && t.y === c.y)) continue;
      const fit = lightScore(p, c.level).score;
      const crowd = taken.filter((t) => Math.max(Math.abs(t.x - c.x), Math.abs(t.y - c.y)) <= 1).length;
      const tall = (p.matureSize?.heightCm || 0) >= 100;
      const nearWindowPenalty = tall && c.dist <= 1 ? 0.25 : 0;
      const s = fit * 10 - crowd * 1.5 + (isEdge(c) ? 0.6 : 0) + (tall && isCorner(c) ? 0.8 : 0) - nearWindowPenalty * 10 - c.dist * 0.01;
      if (!best || s > best.s) best = { c, s };
    }
    if (best) {
      taken.push({ x: best.c.x, y: best.c.y });
      placements.push({ x: best.c.x, y: best.c.y, product: p });
    }
  }
  return { placements, evaluation: evaluatePlan({ size, windowSide, windowLight, room }, placements) };
}

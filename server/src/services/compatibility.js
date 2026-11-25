// Plant compatibility checker: can these plants share a shelf, a room or a pot?

import { LIGHT_ORDER, LIGHT_LABEL } from './matchmaker.js';

const HUMIDITY = ['low', 'medium', 'high'];

const WEIGHTS = { light: 30, water: 25, humidity: 15, soil: 15, temperature: 5, placement: 10 };

const statusOf = (s) => (s >= 0.75 ? 'ok' : s >= 0.4 ? 'warn' : 'bad');

function lightFactor(plants) {
  const sets = plants.map((p) => new Set(p.lightTolerance?.length ? p.lightTolerance : p.light ? [p.light] : []));
  if (sets.some((s) => !s.size)) return null;
  const common = LIGHT_ORDER.filter((l) => sets.every((s) => s.has(l)));
  if (common.length) {
    const idealsOk = plants.every((p) => common.includes(p.light));
    // Recommend the common level closest to the group's ideals.
    const avgIdeal = plants.reduce((s, p) => s + LIGHT_ORDER.indexOf(p.light), 0) / plants.length;
    const best = common.reduce((b, l) => (Math.abs(LIGHT_ORDER.indexOf(l) - avgIdeal) < Math.abs(LIGHT_ORDER.indexOf(b) - avgIdeal) ? l : b), common[0]);
    return {
      score: idealsOk ? 1 : 0.8,
      detail: idealsOk ? `Everyone is happiest in ${LIGHT_LABEL[best]}.` : `All can live in ${LIGHT_LABEL[best]}, although some would prefer a different spot.`,
      recommended: best,
    };
  }
  const mins = sets.map((s) => Math.min(...[...s].map((l) => LIGHT_ORDER.indexOf(l))));
  const maxs = sets.map((s) => Math.max(...[...s].map((l) => LIGHT_ORDER.indexOf(l))));
  const gap = Math.max(...mins) - Math.min(...maxs);
  return {
    score: gap <= 1 ? 0.4 : 0,
    detail: `Light needs do not overlap – some want ${LIGHT_LABEL[LIGHT_ORDER[Math.max(...mins)]]} while others need ${LIGHT_LABEL[LIGHT_ORDER[Math.min(...maxs)]]} or dimmer.`,
    recommended: null,
  };
}

function waterFactor(plants) {
  const days = plants.map((p) => p.watering?.intervalDays).filter(Boolean);
  if (days.length < plants.length) return null;
  const min = Math.min(...days);
  const max = Math.max(...days);
  const ratio = max / min;
  const score = ratio <= 1.4 ? 1 : ratio <= 2 ? 0.8 : ratio <= 3 ? 0.5 : ratio <= 5 ? 0.25 : 0;
  const thirsty = plants.find((p) => p.watering.intervalDays === min)?.name;
  const dry = plants.find((p) => p.watering.intervalDays === max)?.name;
  return {
    score,
    detail:
      ratio <= 1.4
        ? `Similar watering rhythm (about every ${min}–${max} days).`
        : `Watering gaps differ: ${thirsty} wants water about every ${min} days but ${dry} prefers every ${max}.`,
  };
}

function humidityFactor(plants) {
  const idx = plants.map((p) => HUMIDITY.indexOf(p.humidity)).filter((i) => i >= 0);
  if (idx.length < plants.length) return null;
  const range = Math.max(...idx) - Math.min(...idx);
  return {
    score: range === 0 ? 1 : range === 1 ? 0.7 : 0.2,
    detail: range === 0 ? `Same humidity preference (${HUMIDITY[idx[0]]}).` : range === 1 ? 'Slightly different humidity preferences – manageable with grouping or a pebble tray.' : 'One wants dry air while another needs a humid spot – keep them in different areas.',
  };
}

function soilFactor(plants) {
  const types = plants.map((p) => p.soilType).filter((t) => t && t !== 'none');
  if (types.length < 2) return null;
  const set = new Set(types);
  if (set.size === 1) return { score: 1, detail: `All prefer ${types[0].replace('-', ' ')} soil.` };
  if (set.has('well-draining') && set.has('moisture-retentive')) return { score: 0.1, detail: 'One needs gritty, fast-draining soil and another needs soil that holds moisture – use separate pots.' };
  return { score: 0.6, detail: 'Soil needs differ a little – a blend can work, but separate pots are safer.' };
}

function temperatureFactor(plants) {
  const ranges = plants.map((p) => p.temperature).filter((t) => t && t.minC != null && t.maxC != null);
  if (ranges.length < plants.length) return null;
  const lo = Math.max(...ranges.map((r) => r.minC));
  const hi = Math.min(...ranges.map((r) => r.maxC));
  const overlap = hi - lo;
  return { score: overlap >= 8 ? 1 : overlap >= 4 ? 0.7 : overlap > 0 ? 0.4 : 0, detail: overlap > 0 ? `Comfortable temperatures overlap between ${lo} °C and ${hi} °C.` : 'Their comfortable temperature ranges do not overlap.' };
}

function placementFactor(plants) {
  const indoorOnly = plants.some((p) => p.placement === 'indoor');
  const outdoorOnly = plants.some((p) => p.placement === 'outdoor');
  if (indoorOnly && outdoorOnly) return { score: 0, detail: 'Some are indoor plants and some are outdoor plants – they live in different places.' };
  return { score: 1, detail: indoorOnly ? 'All can live indoors.' : outdoorOnly ? 'All prefer the outdoors.' : 'All can live in the same environment.' };
}

export function scoreGroup(plants) {
  const raw = {
    light: lightFactor(plants),
    water: waterFactor(plants),
    humidity: humidityFactor(plants),
    soil: soilFactor(plants),
    temperature: temperatureFactor(plants),
    placement: placementFactor(plants),
  };
  const LABELS = { light: 'Light', water: 'Watering', humidity: 'Humidity', soil: 'Soil', temperature: 'Temperature', placement: 'Indoor / outdoor' };
  const factors = [];
  let weighted = 0;
  let weightSum = 0;
  for (const [key, f] of Object.entries(raw)) {
    if (!f) continue;
    factors.push({ key, label: LABELS[key], weight: WEIGHTS[key], score: Math.round(f.score * 100) / 100, status: statusOf(f.score), detail: f.detail, recommended: f.recommended });
    weighted += f.score * WEIGHTS[key];
    weightSum += WEIGHTS[key];
  }
  let overall = weightSum ? Math.round((weighted / weightSum) * 100) : 0;

  // Deal-breakers: a plant that needs very different light, water, humidity or soil will struggle
  // however well the other factors line up, so they cap the overall score.
  const dealBreakers = factors.filter((f) => ['light', 'water', 'humidity', 'soil'].includes(f.key) && f.score < 0.4);
  let cap = null;
  if (dealBreakers.length >= 2) cap = 40;
  else if (dealBreakers.length === 1) cap = 65;
  if (cap !== null && overall > cap) overall = cap;
  return { factors, overall, dealBreakers: dealBreakers.map((f) => f.label), capped: cap !== null && overall === cap };
}

export function verdictFor(score) {
  if (score >= 85) return { label: 'Great match', tone: 'great' };
  if (score >= 70) return { label: 'Good match', tone: 'good' };
  if (score >= 50) return { label: 'Workable with care', tone: 'warn' };
  return { label: 'Not recommended together', tone: 'bad' };
}

export function checkCompatibility(plants) {
  const { factors, overall, dealBreakers } = scoreGroup(plants);
  const verdict = verdictFor(overall);

  const pairs = [];
  if (plants.length > 2) {
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const s = scoreGroup([plants[i], plants[j]]);
        pairs.push({
          a: plants[i].name,
          b: plants[j].name,
          score: s.overall,
          verdict: verdictFor(s.overall),
          issues: s.factors.filter((f) => f.status !== 'ok').map((f) => f.detail),
        });
      }
    }
  }

  const get = (k) => factors.find((f) => f.key === k);
  const sharePot = overall >= 80 && (get('soil')?.score ?? 1) >= 0.9 && (get('water')?.score ?? 1) >= 0.8 && (get('light')?.score ?? 1) >= 0.8;
  const sameShelf = overall >= 60 && (get('light')?.score ?? 1) >= 0.4;

  const tips = [];
  const water = get('water');
  if (water && water.status !== 'ok') tips.push('Keep them in separate pots and water each on its own schedule – My Garden’s Care Calendar can track both.');
  const light = get('light');
  if (light?.status === 'bad') tips.push('Place them in different spots: the sun-lover near the window and the shade-tolerant plant further back.');
  const hum = get('humidity');
  if (hum && hum.status !== 'ok') tips.push('Put the humidity-lover on a pebble tray or in a bright bathroom, away from the dry-air plant.');
  const soil = get('soil');
  if (soil && soil.status !== 'ok') tips.push('Use a gritty mix for the drought-tolerant plant and a moisture-retentive mix for the thirsty one.');
  if (get('placement')?.status === 'bad') tips.push('Keep the outdoor plant on the balcony or terrace and the indoor plant inside.');

  const petMix = new Set(plants.map((p) => p.petSafe));
  const petNote = petMix.has('toxic')
    ? `Pet note: ${plants.filter((p) => p.petSafe === 'toxic').map((p) => p.name).join(', ')} ${plants.filter((p) => p.petSafe === 'toxic').length > 1 ? 'are' : 'is'} listed as toxic to pets – keep out of reach.`
    : petMix.has('unknown')
      ? `Pet note: pet safety is unverified for ${plants.filter((p) => p.petSafe === 'unknown').map((p) => p.name).join(', ')}.`
      : 'Pet note: all of these are listed as non-toxic to cats and dogs.';

  const crowding = plants.reduce((s, p) => s + (p.matureSize?.spreadCm || 0), 0);

  return {
    plants: plants.map((p) => ({ id: p.id, name: p.name, slug: p.slug, image: p.image, light: p.light, petSafe: p.petSafe })),
    overall,
    verdict,
    dealBreakers,
    factors,
    pairs,
    sharePot: {
      ok: sharePot,
      advice: sharePot
        ? `These can share a large planter (at least ${Math.max(30, Math.round(crowding * 0.6))} cm wide), but separate pots are still easier to manage as they grow.`
        : 'Keep them in separate pots – their needs differ enough that sharing a pot would stress at least one of them.',
    },
    sameShelf: {
      ok: sameShelf,
      advice: sameShelf ? 'They can sit side by side on the same shelf or windowsill.' : 'Better placed in different spots of the room.',
    },
    tips,
    petNote,
  };
}

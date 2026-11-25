// Plant Matchmaker: a transparent, rule-based, weighted scoring model.
// Every score is computed from real product attributes in the database – nothing is hard-coded per plant.

export const LIGHT_ORDER = ['low', 'medium', 'bright-indirect', 'bright-direct'];
export const LIGHT_LABEL = {
  'bright-direct': 'bright direct sunlight',
  'bright-indirect': 'bright indirect light',
  medium: 'medium light',
  low: 'low light',
};
const SPACE_ORDER = ['small-desk', 'small-shelf', 'medium-room', 'large-floor'];
const TIME_ORDER = ['minimal', 'moderate', 'high'];
const DIFFICULTY_ORDER = ['easy', 'moderate', 'hard'];
const EXPERIENCE_ORDER = ['beginner', 'intermediate', 'expert'];

export const WEIGHTS = {
  light: 30,
  care: 20,
  experience: 15,
  room: 15,
  preference: 10,
  space: 10,
};

export const WEIGHT_LABELS = {
  light: 'Light compatibility',
  care: 'Care-time fit',
  experience: 'Experience fit',
  room: 'Room suitability',
  preference: 'Plant preference',
  space: 'Space fit',
};

export const QUESTIONS = [
  {
    id: 'space',
    title: 'What type of space do you have?',
    type: 'single',
    options: [
      { value: 'bedroom', label: 'Bedroom', icon: 'bed-double' },
      { value: 'living-room', label: 'Living Room', icon: 'sofa' },
      { value: 'study', label: 'Study', icon: 'book-open' },
      { value: 'bathroom', label: 'Bathroom', icon: 'bath' },
      { value: 'balcony', label: 'Balcony', icon: 'sun-medium' },
      { value: 'office', label: 'Office', icon: 'briefcase' },
      { value: 'other', label: 'Other', icon: 'layout-grid' },
    ],
  },
  {
    id: 'light',
    title: 'How much natural light does your space receive?',
    type: 'single',
    options: [
      { value: 'bright-direct', label: 'Bright direct sunlight', hint: 'Sun falls on the spot for 4+ hours', icon: 'sun' },
      { value: 'bright-indirect', label: 'Bright indirect sunlight', hint: 'Near a bright window, out of the sun’s beam', icon: 'cloud-sun' },
      { value: 'medium', label: 'Medium light', hint: 'A few metres from a window', icon: 'sunset' },
      { value: 'low', label: 'Low light', hint: 'Far from windows or a north-facing room', icon: 'moon' },
      { value: 'unsure', label: 'Not sure', hint: 'We’ll favour adaptable plants', icon: 'circle-help' },
    ],
  },
  {
    id: 'time',
    title: 'How much time can you spend caring for plants?',
    type: 'single',
    options: [
      { value: 'minimal', label: 'A few minutes per week', icon: 'timer' },
      { value: 'moderate', label: 'A little time every few days', icon: 'calendar-clock' },
      { value: 'high', label: 'I enjoy regular plant care', icon: 'heart-handshake' },
    ],
  },
  {
    id: 'experience',
    title: 'What is your plant experience?',
    type: 'single',
    options: [
      { value: 'beginner', label: 'Complete beginner', icon: 'sprout' },
      { value: 'intermediate', label: 'Some experience', icon: 'leaf' },
      { value: 'expert', label: 'Experienced plant owner', icon: 'trees' },
    ],
  },
  {
    id: 'types',
    title: 'What types of plants do you prefer?',
    subtitle: 'Choose as many as you like.',
    type: 'multi',
    options: [
      { value: 'foliage', label: 'Foliage plants', icon: 'leaf' },
      { value: 'flowering', label: 'Flowering plants', icon: 'flower-2' },
      { value: 'succulent', label: 'Succulents', icon: 'cherry' },
      { value: 'herb', label: 'Herbs', icon: 'chef-hat' },
      { value: 'any', label: 'Any type', icon: 'shuffle' },
    ],
  },
  {
    id: 'size',
    title: 'How much space do you have?',
    type: 'single',
    options: [
      { value: 'small-desk', label: 'Small desk', icon: 'monitor' },
      { value: 'small-shelf', label: 'Small shelf', icon: 'library' },
      { value: 'medium-room', label: 'Medium room space', icon: 'square' },
      { value: 'large-floor', label: 'Large floor space', icon: 'maximize' },
      { value: 'balcony', label: 'Balcony', icon: 'fence' },
    ],
  },
  {
    id: 'pets',
    title: 'Do you have pets?',
    subtitle: 'We only use this to filter plant safety – it is never assumed.',
    type: 'single',
    options: [
      { value: 'yes', label: 'Yes', icon: 'paw-print' },
      { value: 'no', label: 'No', icon: 'ban' },
      { value: 'unspecified', label: 'Prefer not to say', icon: 'eye-off' },
    ],
  },
];

const optionLabel = (qid, value) => QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.value === value)?.label ?? value;

/** Validates raw answers. Returns { answers, errors }. */
export function validateAnswers(raw) {
  const errors = {};
  const answers = {};
  for (const q of QUESTIONS) {
    const allowed = q.options.map((o) => o.value);
    const v = raw?.[q.id];
    if (q.type === 'multi') {
      const arr = Array.isArray(v) ? [...new Set(v.filter((x) => allowed.includes(x)))] : [];
      if (!arr.length) errors[q.id] = 'Please choose at least one option.';
      answers[q.id] = arr;
    } else if (!allowed.includes(v)) {
      errors[q.id] = 'Please choose an option.';
    } else answers[q.id] = v;
  }
  return { answers, errors };
}

export function summarizeAnswers(a) {
  return QUESTIONS.map((q) => ({
    id: q.id,
    question: q.title,
    answer: q.type === 'multi' ? a[q.id].map((v) => optionLabel(q.id, v)).join(', ') : optionLabel(q.id, a[q.id]),
  }));
}

// ───────── Individual factor scores (each returns { score: 0..1, detail, warn? }) ─────────

/** Exported because the room planner reuses it to judge a plant against a specific spot. */
export function lightScore(p, userLight) {
  const tol = (p.lightTolerance || []).filter((l) => LIGHT_ORDER.includes(l));
  const ideal = p.light;
  if (!tol.length || !ideal) return { score: 0.5, detail: 'No light data for this plant.' };
  if (userLight === 'unsure') {
    const s = Math.min(0.85, 0.5 + 0.1 * Math.min(tol.length, 3.5));
    return {
      score: s,
      detail: tol.length >= 3 ? `Adaptable – tolerates ${tol.length} light levels, so it is a safe pick when you are unsure about your light.` : `Needs ${LIGHT_LABEL[ideal]}; check your spot before buying.`,
    };
  }
  const u = LIGHT_ORDER.indexOf(userLight);
  const i = LIGHT_ORDER.indexOf(ideal);
  if (tol.includes(userLight)) {
    const dist = Math.abs(u - i);
    return {
      score: Math.max(0.6, 1 - 0.1 * dist),
      detail: dist === 0 ? `Thrives in ${LIGHT_LABEL[userLight]} – exactly what your space offers.` : `Tolerates ${LIGHT_LABEL[userLight]} (it prefers ${LIGHT_LABEL[ideal]}).`,
    };
  }
  const nearest = Math.min(...tol.map((l) => Math.abs(LIGHT_ORDER.indexOf(l) - u)));
  const score = nearest === 1 ? 0.35 : nearest === 2 ? 0.12 : 0;
  const tooDark = u < Math.min(...tol.map((l) => LIGHT_ORDER.indexOf(l)));
  return {
    score,
    detail: `Prefers ${LIGHT_LABEL[ideal]}; ${LIGHT_LABEL[userLight]} is ${tooDark ? 'too dim' : 'too intense'} for it.`,
    warn: tooDark ? `Needs more light than your space offers${p.supply?.role === 'plant' ? ' – a grow light could help' : ''}.` : 'May scorch in that much sun – filter the light with a curtain.',
  };
}

function careScore(p, userTime) {
  const need = TIME_ORDER.indexOf(p.careTime);
  const have = TIME_ORDER.indexOf(userTime);
  if (need < 0) return { score: 0.6, detail: 'Care time not specified.' };
  const water = p.watering?.label ? ` (${p.watering.label.toLowerCase()})` : '';
  if (need <= have) {
    return {
      score: need === have || have === 0 ? 1 : 0.9,
      detail: need === have ? `Care needs${water} match the time you have.` : `Needs little care${water}, comfortably within your routine.`,
    };
  }
  const diff = need - have;
  return {
    score: diff === 1 ? 0.4 : 0,
    detail: `Needs ${p.careTime} care${water} – more than you plan to give.`,
    warn: 'Needs more attention than you plan to give it.',
  };
}

function experienceScore(p, exp) {
  const need = DIFFICULTY_ORDER.indexOf(p.difficulty);
  const have = EXPERIENCE_ORDER.indexOf(exp);
  if (need < 0) return { score: 0.6, detail: 'Difficulty not specified.' };
  const label = { easy: 'Easy', moderate: 'Moderate', hard: 'Challenging' }[p.difficulty];
  if (need <= have) {
    return { score: have - need >= 2 ? 0.8 : need === have || have === 0 ? 1 : 0.9, detail: `${label} to grow – suits your experience level.` };
  }
  const diff = need - have;
  return { score: diff === 1 ? 0.45 : 0.1, detail: `${label} to grow – a stretch for your experience.`, warn: 'Likely to be tricky for your experience level.' };
}

function roomScore(p, space) {
  if (space === 'other') return { score: 0.7, detail: 'Works in most spaces; check light and size.' };
  const label = optionLabel('space', space).toLowerCase();
  if ((p.rooms || []).includes(space)) return { score: 1, detail: `Well suited to a ${label}.` };
  return { score: 0.4, detail: `Not usually grown in a ${label}.` };
}

function preferenceScore(p, types) {
  if (types.includes('any')) return { score: 0.9, detail: 'You are open to any type of plant.' };
  if (types.includes(p.plantType)) return { score: 1, detail: `A ${optionLabel('types', p.plantType).toLowerCase()} pick – matches what you love.` };
  const secondary = types.find((t) => (p.tags || []).some((tag) => tag.includes(t === 'succulent' ? 'succulent' : t)));
  if (secondary) return { score: 0.6, detail: `Also offers ${optionLabel('types', secondary).toLowerCase()} appeal.` };
  return { score: 0.25, detail: 'Outside the plant types you picked.' };
}

function spaceScore(p, size) {
  const sizeLabel = optionLabel('size', size).toLowerCase();
  const matureLabel = p.matureSize?.label || 'size not specified';
  if (size === 'balcony') {
    if (p.placement === 'outdoor' || p.placement === 'both') return { score: 1, detail: `Happy on a balcony – grows to ${matureLabel}.` };
    return { score: 0.4, detail: 'An indoor plant – keep it sheltered if used on a balcony.' };
  }
  if (p.placement === 'outdoor') return { score: 0.2, detail: 'An outdoor plant – it will need a balcony or garden.', warn: 'Grows outdoors; not ideal indoors.' };
  const spaces = (p.spaces || []).filter((s) => SPACE_ORDER.includes(s));
  if (!spaces.length) return { score: 0.5, detail: 'Space needs not specified.' };
  if (spaces.includes(size)) return { score: 1, detail: `Fits a ${sizeLabel} – grows to ${matureLabel}.` };
  const u = SPACE_ORDER.indexOf(size);
  const nearest = spaces.reduce((best, s) => (Math.abs(SPACE_ORDER.indexOf(s) - u) < Math.abs(SPACE_ORDER.indexOf(best) - u) ? s : best), spaces[0]);
  const diff = SPACE_ORDER.indexOf(nearest) - u;
  if (diff > 0) {
    return { score: diff === 1 ? 0.4 : 0.1, detail: `Grows to ${matureLabel} – bigger than a ${sizeLabel} suits.`, warn: 'May outgrow your space.' };
  }
  return { score: Math.abs(diff) === 1 ? 0.75 : 0.55, detail: `A smaller plant than your ${sizeLabel} could hold – it will look modest.` };
}

function petStatus(p) {
  if (p.petSafe === 'safe') return { status: 'safe', text: p.petNote || 'Listed as non-toxic to cats and dogs.' };
  if (p.petSafe === 'toxic') return { status: 'toxic', text: p.petNote || 'Listed as toxic to pets.' };
  return { status: 'unknown', text: p.petNote || 'Pet safety has not been verified for this plant – treat it as unsafe until your vet says otherwise.' };
}

// ───────── Scoring ─────────

export function scorePlant(p, a) {
  const factors = {
    light: lightScore(p, a.light),
    care: careScore(p, a.time),
    experience: experienceScore(p, a.experience),
    room: roomScore(p, a.space),
    preference: preferenceScore(p, a.types),
    space: spaceScore(p, a.size),
  };
  const breakdown = Object.entries(factors).map(([key, f]) => ({
    key,
    label: WEIGHT_LABELS[key],
    weight: WEIGHTS[key],
    score: Math.round(f.score * 100) / 100,
    points: Math.round(f.score * WEIGHTS[key] * 10) / 10,
    detail: f.detail,
  }));
  let total = breakdown.reduce((s, b) => s + b.points, 0);

  const pet = petStatus(p);
  const warnings = Object.values(factors).map((f) => f.warn).filter(Boolean);
  if (a.pets === 'yes' && pet.status === 'unknown') {
    total *= 0.85;
    warnings.push('Pet safety is unverified – we ranked it lower because you have pets.');
  } else if (a.pets === 'yes' && pet.status === 'toxic') {
    total *= 0.5;
    warnings.push('Toxic to pets – only choose it if it can be kept completely out of reach.');
  } else if (a.pets === 'unspecified' && pet.status === 'toxic') {
    warnings.push('Toxic to pets – keep it out of reach if you have cats or dogs.');
  }

  // Reasons: the strongest positive factors, in plain language.
  const reasons = [...breakdown]
    .filter((b) => b.score >= 0.75)
    .sort((x, y) => y.weight * y.score - x.weight * x.score)
    .slice(0, 4)
    .map((b) => b.detail);
  if (a.pets === 'yes' && pet.status === 'safe') reasons.push('Listed as pet-safe – great with your pets.');

  return {
    product: p,
    score: Math.max(0, Math.min(100, Math.round(total))),
    breakdown,
    reasons,
    warnings: [...new Set(warnings)],
    pet,
  };
}

export function recommend(products, answers, { limit = 9, ignorePetFilter = false, minScore = 40 } = {}) {
  const plants = products.filter((p) => p.isPlant);
  const excluded = [];
  const scored = [];
  for (const p of plants) {
    if (answers.pets === 'yes' && p.petSafe === 'toxic' && !ignorePetFilter) {
      excluded.push({ product: p, reason: 'Toxic to pets' });
      continue;
    }
    scored.push(scorePlant(p, answers));
  }
  scored.sort((x, y) => y.score - x.score || (y.product.rating || 0) - (x.product.rating || 0));
  let results = scored.filter((r) => r.score >= minScore).slice(0, limit);
  if (results.length < 3) results = scored.slice(0, Math.min(3, scored.length));
  return { results, excluded, totalConsidered: plants.length };
}

// ───────── Plant personality ─────────

export const PERSONALITIES = [
  { id: 'botanist', title: 'The Dedicated Botanist', icon: 'microscope', blurb: 'You enjoy the craft of plant care and can give demanding plants what they need.', test: (a) => a.experience === 'expert' && a.time === 'high' },
  { id: 'kitchen-gardener', title: 'The Kitchen Gardener', icon: 'chef-hat', blurb: 'You want plants that earn their keep – fragrant herbs you can snip into dinner.', test: (a) => a.types.includes('herb') && !a.types.includes('any') },
  { id: 'bloom-chaser', title: 'The Bloom Chaser', icon: 'flower-2', blurb: 'Colour and fragrance make your day – you love a plant that rewards you with flowers.', test: (a) => a.types.includes('flowering') && !a.types.includes('any') },
  { id: 'sun-minimalist', title: 'The Sun-Loving Minimalist', icon: 'sun', blurb: 'Bright light and sculptural, low-fuss plants suit your style.', test: (a) => a.types.includes('succulent') || (a.light === 'bright-direct' && a.time === 'minimal') },
  { id: 'balcony-gardener', title: 'The Balcony Gardener', icon: 'fence', blurb: 'Your outdoor nook is your green retreat – sun, air and room to grow.', test: (a) => a.space === 'balcony' || a.size === 'balcony' },
  { id: 'shade-explorer', title: 'The Shade Explorer', icon: 'moon', blurb: 'You are making the most of a dim space with tough, shade-tolerant plants.', test: (a) => a.light === 'low' },
  { id: 'easygoing-starter', title: 'The Easygoing Starter', icon: 'sprout', blurb: 'New to plants and short on time – you will love forgiving, low-maintenance greenery.', test: (a) => a.experience === 'beginner' && a.time === 'minimal' },
  { id: 'steady-nurturer', title: 'The Steady Nurturer', icon: 'heart-handshake', blurb: 'You enjoy a regular routine and plants that reward your attention.', test: (a) => a.time === 'high' },
  { id: 'balanced-grower', title: 'The Balanced Grower', icon: 'leaf', blurb: 'A flexible, curious plant parent – ready for a nice mix of easy wins and a little challenge.', test: () => true },
];

export function getPersonality(a) {
  const { test, ...rest } = PERSONALITIES.find((p) => p.test(a));
  return rest;
}

export function buildRecommendation(products, rawAnswers, opts = {}) {
  const { answers, errors } = validateAnswers(rawAnswers);
  if (Object.keys(errors).length) return { errors };
  const { results, excluded, totalConsidered } = recommend(products, answers, opts);
  return {
    answers,
    summary: summarizeAnswers(answers),
    personality: getPersonality(answers),
    weights: Object.entries(WEIGHTS).map(([key, weight]) => ({ key, label: WEIGHT_LABELS[key], weight })),
    method:
      'Each plant gets a 0–100 compatibility score: light 30 %, care time 20 %, experience 15 %, room 15 %, plant preference 10 %, space 10 %. Pet safety then adjusts the score or filters plants out. All inputs come from the plant’s database attributes.',
    results,
    excluded,
    totalConsidered,
  };
}

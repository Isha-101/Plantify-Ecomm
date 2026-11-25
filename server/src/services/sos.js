// Plant SOS: a transparent, rule-based symptom checker.
// Each problem lists the symptoms that point to it (with weights). Context answers add extra weight.
// This is guidance, not a guarantee – always look at the plant itself.

export const SYMPTOM_GROUPS = [
  {
    id: 'leaves',
    label: 'Leaves',
    symptoms: [
      { id: 'yellow-lower', label: 'Yellow lower or older leaves' },
      { id: 'yellow-all', label: 'Pale or yellow leaves everywhere, including new growth' },
      { id: 'brown-tips', label: 'Brown, dry leaf tips' },
      { id: 'brown-edges', label: 'Crispy brown leaf edges' },
      { id: 'soft-brown', label: 'Soft, dark brown patches' },
      { id: 'spots', label: 'Dark or black spots (maybe with a yellow ring)' },
      { id: 'scorched', label: 'Bleached or scorched patches' },
      { id: 'curling', label: 'Curling or cupping leaves' },
      { id: 'drooping', label: 'Drooping or limp leaves' },
      { id: 'leaf-drop', label: 'Leaves dropping off' },
      { id: 'pale-faded', label: 'Washed-out or faded colour' },
      { id: 'holes', label: 'Holes or chewed edges' },
    ],
  },
  {
    id: 'roots',
    label: 'Stem, roots & soil',
    symptoms: [
      { id: 'mushy-stem', label: 'Mushy or blackened stem base' },
      { id: 'root-smell', label: 'Rotten smell from the soil' },
      { id: 'roots-out', label: 'Roots growing out of the drainage holes' },
      { id: 'dry-pulling', label: 'Soil dry and pulling away from the pot' },
      { id: 'moldy-soil', label: 'Mould or white crust on the soil' },
    ],
  },
  {
    id: 'pests',
    label: 'Pests & residue',
    symptoms: [
      { id: 'tiny-bugs', label: 'Tiny insects on leaves or stems' },
      { id: 'webbing', label: 'Fine webbing on leaves' },
      { id: 'white-fluff', label: 'White cottony fluff on stems or leaf joints' },
      { id: 'white-powder', label: 'White powdery coating on leaves' },
      { id: 'sticky', label: 'Sticky residue on leaves or nearby surfaces' },
      { id: 'gnats', label: 'Small flies hovering around the soil' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth & flowers',
    symptoms: [
      { id: 'leggy', label: 'Long, leggy, stretched growth' },
      { id: 'stunted', label: 'Slow or stunted growth' },
      { id: 'no-flowers', label: 'Not flowering' },
    ],
  },
];

export const CONTEXT_QUESTIONS = [
  { id: 'soil', label: 'How does the soil feel (3–4 cm down)?', options: [['dry', 'Dry'], ['moist', 'Slightly moist'], ['soggy', 'Wet or soggy']] },
  { id: 'lastWatered', label: 'When did you last water?', options: [['recent', 'In the last 3 days'], ['week', 'About a week ago'], ['weeks', '2+ weeks ago']] },
  { id: 'light', label: 'How much light does it get?', options: [['low', 'Low'], ['medium', 'Medium'], ['bright', 'Bright indirect'], ['direct', 'Direct sun']] },
  { id: 'change', label: 'Anything changed recently?', options: [['none', 'No change'], ['moved', 'Moved or new place'], ['repotted', 'Just repotted']] },
  { id: 'lastFed', label: 'When was it last fertilised?', options: [['recent', 'This month'], ['months', 'A few months ago'], ['never', 'Never']] },
];

// ctx: [contextKey, value, bonus]
export const PROBLEMS = [
  {
    id: 'overwatering',
    title: 'Overwatering',
    urgency: 'medium',
    summary: 'The soil stays wet for too long, so roots cannot breathe and start to suffer.',
    symptoms: { 'yellow-lower': 3, drooping: 2, 'soft-brown': 2, 'leaf-drop': 1, 'moldy-soil': 2, gnats: 2, 'mushy-stem': 2, 'root-smell': 2, spots: 1 },
    ctx: [['soil', 'soggy', 4], ['lastWatered', 'recent', 1], ['change', 'repotted', 1]],
    steps: [
      'Stop watering and check that the pot has drainage holes; empty any water in the saucer.',
      'Move the plant to bright indirect light with good airflow so the soil can dry.',
      'If the soil stays soggy, slide the plant out and check the roots: healthy roots are firm and pale; trim any brown, mushy ones.',
      'Repot into fresh, well-draining mix if the soil is waterlogged, then wait until the top 3–5 cm is dry before watering again.',
    ],
    prevention: ['Water only when the top few centimetres are dry.', 'Use a moisture meter if you are unsure.', 'Match the pot and soil to the plant – terracotta and gritty mix for drought lovers.'],
    products: ['moisture meter', 'drainage'],
  },
  {
    id: 'root-rot',
    title: 'Root rot',
    urgency: 'high',
    summary: 'Roots have started to decay, usually after a long period of wet soil. Act quickly.',
    symptoms: { 'mushy-stem': 4, 'root-smell': 4, drooping: 2, 'leaf-drop': 1, 'yellow-lower': 1, 'soft-brown': 1 },
    ctx: [['soil', 'soggy', 2]],
    steps: [
      'Take the plant out of the pot and shake off the wet soil.',
      'Cut away every black, brown or mushy root with clean, sharp scissors; keep the healthy white or tan roots.',
      'Let the roots air-dry for an hour, then repot in a clean pot with fresh, gritty, well-draining mix.',
      'Water lightly once, then let the soil dry between waterings. Keep out of strong sun while it recovers.',
      'If the stem base is mushy, take a healthy stem cutting and propagate it in water or mix.',
    ],
    prevention: ['Always use pots with drainage.', 'Never leave the pot standing in water.', 'Reduce watering in winter and the monsoon.'],
    products: ['drainage', 'well-draining'],
  },
  {
    id: 'underwatering',
    title: 'Underwatering',
    urgency: 'medium',
    summary: 'The plant is not getting enough water, so leaves dry out and curl.',
    symptoms: { 'brown-edges': 2, 'brown-tips': 1, curling: 2, drooping: 2, 'dry-pulling': 3, 'leaf-drop': 1, stunted: 1 },
    ctx: [['soil', 'dry', 4], ['lastWatered', 'weeks', 2]],
    steps: [
      'Water slowly and thoroughly until water flows from the drainage holes.',
      'If the soil is hard and water runs straight off, soak the pot in a basin of water for 20–30 minutes.',
      'Trim fully dry leaves; the rest will recover over a week or two.',
      'Set a reminder in the Care Calendar so it does not happen again.',
    ],
    prevention: ['Check the soil weekly.', 'Group thirsty plants together for easy routines.', 'Consider a self-watering planter for busy periods.'],
    products: ['watering', 'moisture meter'],
  },
  {
    id: 'low-humidity',
    title: 'Dry air (low humidity)',
    urgency: 'low',
    summary: 'Tropical plants lose moisture faster than they absorb it in dry air, so leaf tips and edges crisp.',
    symptoms: { 'brown-tips': 3, 'brown-edges': 2, curling: 1 },
    ctx: [],
    steps: [
      'Move the plant away from AC vents, heaters and fans.',
      'Group it with other plants or place it on a pebble tray with water below the pebbles.',
      'Mist leaves lightly in the morning (not for fuzzy-leaved plants) or run a humidifier nearby.',
      'Use filtered or settled water if the tips keep browning – minerals in tap water can cause the same symptom.',
      'Trim brown tips with clean scissors, following the natural leaf shape.',
    ],
    prevention: ['Place humidity lovers in a bright bathroom.', 'Avoid cold or hot drafts.'],
    products: ['mist', 'humidity'],
  },
  {
    id: 'low-light',
    title: 'Not enough light',
    urgency: 'low',
    summary: 'The plant is stretching toward light and cannot make enough energy.',
    symptoms: { leggy: 4, 'pale-faded': 2, stunted: 2, 'yellow-lower': 1, 'no-flowers': 2 },
    ctx: [['light', 'low', 3]],
    steps: [
      'Move it closer to a window – bright indirect light suits most houseplants.',
      'If your room is dim, add a clip-on LED grow light for 8–12 hours a day.',
      'Rotate the pot weekly so all sides get light.',
      'Prune leggy stems back to encourage bushier growth.',
    ],
    prevention: ['Choose plants that match your light – try the Plant Matchmaker.', 'Wipe dust off the leaves.'],
    products: ['grow light'],
  },
  {
    id: 'sunburn',
    title: 'Too much direct sun (sunburn)',
    urgency: 'medium',
    summary: 'Strong, direct light has scorched the leaf surface.',
    symptoms: { scorched: 4, 'brown-edges': 1, 'pale-faded': 1, curling: 1 },
    ctx: [['light', 'direct', 3], ['change', 'moved', 1]],
    steps: [
      'Move the plant out of direct sun, especially hot afternoon light.',
      'Filter the light with a sheer curtain or move it a metre back from the window.',
      'Leave burnt leaves in place for a few days, then trim them – they will not heal.',
      'Acclimatise gradually if you want to move it into brighter light.',
    ],
    prevention: ['Check whether the plant is a sun-lover before placing it on a west-facing balcony.'],
    products: [],
  },
  {
    id: 'spider-mites',
    title: 'Spider mites',
    urgency: 'high',
    summary: 'Tiny sap-sucking mites thrive in warm, dry conditions and spin fine webs.',
    symptoms: { webbing: 4, 'tiny-bugs': 1, 'pale-faded': 1, curling: 1 },
    ctx: [],
    steps: [
      'Isolate the plant from your others.',
      'Rinse the whole plant (especially leaf undersides) with lukewarm water.',
      'Spray with diluted neem oil in the evening, covering both sides of all leaves; repeat every 5–7 days for three weeks.',
      'Raise humidity – mites dislike moist air.',
    ],
    prevention: ['Inspect leaf undersides weekly.', 'Avoid hot, dry airflow around plants.'],
    products: ['neem oil', 'pest control'],
  },
  {
    id: 'mealybugs',
    title: 'Mealybugs',
    urgency: 'high',
    summary: 'Soft, white, cottony insects that cluster at leaf joints and under leaves.',
    symptoms: { 'white-fluff': 4, sticky: 2, 'tiny-bugs': 1, stunted: 1, 'yellow-all': 1 },
    ctx: [],
    steps: [
      'Isolate the plant straight away.',
      'Dab each visible bug with a cotton swab dipped in diluted rubbing alcohol.',
      'Spray with diluted neem oil and repeat weekly for at least three weeks.',
      'Check the soil surface and the roots for mealybugs; repot if the roots are affected.',
    ],
    prevention: ['Quarantine new plants for two weeks.', 'Avoid over-fertilising, which attracts them.'],
    products: ['neem oil', 'pest control'],
  },
  {
    id: 'aphids-scale',
    title: 'Aphids or scale insects',
    urgency: 'medium',
    summary: 'Small insects that suck sap and leave sticky honeydew on leaves.',
    symptoms: { sticky: 3, 'tiny-bugs': 3, curling: 1, stunted: 1 },
    ctx: [],
    steps: [
      'Wipe visible insects away with a damp cloth or rinse with water.',
      'Spray leaves with diluted neem oil or mild soapy water in the evening.',
      'Scale shows as hard brown bumps – scrape them off gently with a soft toothbrush.',
      'Repeat weekly until clear; wash sticky residue off leaves.',
    ],
    prevention: ['Check new growth regularly, where aphids prefer to feed.'],
    products: ['neem oil', 'pest control'],
  },
  {
    id: 'fungal-leaf-spot',
    title: 'Fungal or bacterial leaf spot',
    urgency: 'medium',
    summary: 'Wet leaves and poor airflow allow fungi to create dark spots with yellow halos.',
    symptoms: { spots: 4, 'soft-brown': 1, 'yellow-lower': 1 },
    ctx: [],
    steps: [
      'Remove badly affected leaves and dispose of them (not in compost).',
      'Water at the soil level and keep leaves dry.',
      'Improve airflow around the plant; avoid misting until it recovers.',
      'A neem oil spray in the evening can help prevent spread.',
    ],
    prevention: ['Water in the morning.', 'Space plants out in humid monsoon months.'],
    products: ['neem oil'],
  },
  {
    id: 'powdery-mildew',
    title: 'Powdery mildew',
    urgency: 'medium',
    summary: 'A white, flour-like fungal coating that appears in humid air with poor circulation.',
    symptoms: { 'white-powder': 5, curling: 1 },
    ctx: [],
    steps: [
      'Isolate the plant and remove heavily coated leaves.',
      'Wipe remaining leaves with a damp cloth or spray with diluted neem oil.',
      'Increase airflow and reduce humidity around the plant.',
      'Avoid overhead watering.',
    ],
    prevention: ['Give plants space and good air circulation.'],
    products: ['neem oil'],
  },
  {
    id: 'fungus-gnats',
    title: 'Fungus gnats',
    urgency: 'low',
    summary: 'Small flies that breed in constantly damp soil. The larvae can nibble delicate roots.',
    symptoms: { gnats: 5, 'moldy-soil': 1, 'tiny-bugs': 1 },
    ctx: [['soil', 'soggy', 2]],
    steps: [
      'Let the top 3–4 cm of soil dry between waterings – gnat larvae need damp soil.',
      'Place yellow sticky traps near the pot to catch adults.',
      'Water once with a diluted neem solution to target larvae.',
      'Replace the top 2 cm of soil if it is mouldy.',
    ],
    prevention: ['Do not overwater and do not leave water in the saucer.'],
    products: ['neem oil', 'moisture meter'],
  },
  {
    id: 'nutrient-deficiency',
    title: 'Nutrient deficiency',
    urgency: 'low',
    summary: 'The plant has used up the nutrients in its soil and needs feeding.',
    symptoms: { 'yellow-all': 3, stunted: 2, 'pale-faded': 2, 'no-flowers': 1, 'yellow-lower': 1 },
    ctx: [['lastFed', 'never', 2], ['lastFed', 'months', 2]],
    steps: [
      'Water first, then feed with a balanced liquid fertiliser at half strength.',
      'Repeat every 4 weeks during spring and summer (every 2–3 weeks for flowering plants and herbs).',
      'Refresh the top few centimetres of soil with compost or vermicompost.',
      'Do not feed in winter or when the plant is stressed or dry.',
    ],
    prevention: ['Set a feeding reminder in the Care Calendar.'],
    products: ['fertilizer'],
  },
  {
    id: 'root-bound',
    title: 'Root-bound (needs repotting)',
    urgency: 'low',
    summary: 'Roots have filled the pot, leaving little room for soil and water.',
    symptoms: { 'roots-out': 5, stunted: 2, 'dry-pulling': 2, drooping: 1 },
    ctx: [['soil', 'dry', 1]],
    steps: [
      'Water the plant the day before repotting.',
      'Choose a pot 2–4 cm wider with drainage holes.',
      'Loosen the circling roots gently, place the plant at the same depth and fill with fresh mix.',
      'Water lightly and keep in indirect light for a week.',
    ],
    prevention: ['Check the roots every 1–2 years in spring.'],
    products: ['pot', 'potting mix'],
  },
  {
    id: 'temperature-stress',
    title: 'Temperature or drafts, plus relocation shock',
    urgency: 'low',
    summary: 'Sudden changes in light, temperature or position cause many plants to drop leaves.',
    symptoms: { 'leaf-drop': 2, drooping: 1, 'brown-tips': 1, curling: 1 },
    ctx: [['change', 'moved', 3]],
    steps: [
      'Keep the plant in one place and avoid moving it again for a few weeks.',
      'Move it away from cold or hot drafts, AC outlets and heaters.',
      'Keep watering steady – do not overcompensate.',
      'New growth usually appears within 4–6 weeks.',
    ],
    prevention: ['Introduce plants to new light gradually.'],
    products: [],
  },
  {
    id: 'natural-aging',
    title: 'Natural leaf ageing',
    urgency: 'low',
    summary: 'It is normal for the oldest leaves to yellow and drop occasionally as the plant grows.',
    symptoms: { 'yellow-lower': 2, 'leaf-drop': 1 },
    ctx: [],
    steps: ['Remove the yellow leaf at its base.', 'Keep your normal care routine and monitor for more than one or two leaves at a time.'],
    prevention: ['Nothing to fix – just keep an eye on it.'],
    products: [],
  },
];

const ALL_SYMPTOM_IDS = new Set(SYMPTOM_GROUPS.flatMap((g) => g.symptoms.map((s) => s.id)));
const SYMPTOM_LABEL = Object.fromEntries(SYMPTOM_GROUPS.flatMap((g) => g.symptoms.map((s) => [s.id, s.label])));

function plantNote(problemId, plant) {
  if (!plant) return null;
  const name = plant.name || plant.nickname || 'your plant';
  const notes = [];
  if (plant.plantType === 'succulent' && ['overwatering', 'root-rot'].includes(problemId)) notes.push(`${name} is a succulent that stores water in its leaves – it rots faster than most plants, so let it dry out completely between waterings.`);
  if (plant.humidity === 'high' && ['low-humidity', 'underwatering'].includes(problemId)) notes.push(`${name} prefers high humidity (60 %+), so dry air affects it more than most plants.`);
  if (plant.watering?.intervalDays) notes.push(`${name} normally needs water about every ${plant.watering.intervalDays} days in average conditions.`);
  if (plant.light && ['low-light', 'sunburn'].includes(problemId)) notes.push(`${name} is happiest in ${plant.light.replace('-', ' ')} light.`);
  if (plant.petSafe === 'toxic' && ['aphids-scale', 'mealybugs', 'spider-mites'].includes(problemId)) notes.push('This plant is toxic to pets – keep it out of reach while it is being treated.');
  return notes.length ? notes.join(' ') : null;
}

export function diagnose({ symptoms = [], context = {}, plant = null }) {
  const chosen = [...new Set(symptoms.filter((s) => ALL_SYMPTOM_IDS.has(s)))];
  if (!chosen.length) return { error: 'Choose at least one symptom.' };

  const scored = PROBLEMS.map((prob) => {
    let score = 0;
    const matched = [];
    for (const s of chosen) {
      const w = prob.symptoms[s];
      if (w) {
        score += w;
        matched.push(SYMPTOM_LABEL[s]);
      }
    }
    if (!matched.length) return null;
    const contextHits = [];
    for (const [key, val, bonus] of prob.ctx) {
      if (context[key] === val) {
        score += bonus;
        contextHits.push({ key, value: val });
      }
    }
    const symptomSum = Object.values(prob.symptoms).reduce((a, b) => a + b, 0);
    const reference = Math.max(5, Math.min(symptomSum, 8));
    const confidence = Math.min(1, score / reference);
    return { prob, score, matched, contextHits, confidence };
  })
    .filter(Boolean)
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.confidence - a.confidence || b.score - a.score);

  // Natural ageing is only a sensible answer when it is the only thing going on.
  const diagnoses = scored
    .filter((r) => r.prob.id !== 'natural-aging' || (chosen.length === 1 && chosen[0] === 'yellow-lower'))
    .slice(0, 3)
    .map((r) => ({
      id: r.prob.id,
      title: r.prob.title,
      summary: r.prob.summary,
      urgency: r.prob.urgency,
      confidence: Math.round(r.confidence * 100),
      likelihood: r.confidence >= 0.7 ? 'Very likely' : r.confidence >= 0.45 ? 'Likely' : 'Possible',
      why: r.matched,
      contextHits: r.contextHits,
      steps: r.prob.steps,
      prevention: r.prob.prevention,
      productTags: r.prob.products,
      plantNote: plantNote(r.prob.id, plant),
    }));

  return {
    selectedSymptoms: chosen.map((id) => ({ id, label: SYMPTOM_LABEL[id] })),
    diagnoses,
    disclaimer: 'Plant SOS is a rule-based guide to common causes. If the plant keeps declining, check the roots and consider asking a local nursery.',
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendation, validateAnswers, WEIGHTS, QUESTIONS, getPersonality, lightScore } from '../../src/services/matchmaker.js';
import { catalogue, bySlug } from './helpers.js';

const base = { space: 'bedroom', light: 'low', time: 'minimal', experience: 'beginner', types: ['any'], size: 'small-shelf', pets: 'no' };
const top = (answers, n = 5, opts) => buildRecommendation(catalogue, answers, opts).results.slice(0, n).map((r) => r.product.slug);

test('weights follow the specified model and total 100', () => {
  assert.deepEqual(WEIGHTS, { light: 30, care: 20, experience: 15, room: 15, preference: 10, space: 10 });
  assert.equal(Object.values(WEIGHTS).reduce((a, b) => a + b), 100);
});

test('all seven questions are defined with the specified options', () => {
  assert.equal(QUESTIONS.length, 7);
  assert.deepEqual(QUESTIONS.map((q) => q.options.length), [7, 5, 3, 3, 5, 5, 3]);
  assert.equal(QUESTIONS.find((q) => q.id === 'types').type, 'multi');
});

test('validation rejects incomplete or invalid answers', () => {
  assert.ok(validateAnswers({}).errors.space);
  assert.ok(validateAnswers({ ...base, types: [] }).errors.types);
  assert.ok(validateAnswers({ ...base, light: 'purple' }).errors.light);
  assert.deepEqual(validateAnswers(base).errors, {});
});

test('different answers give different recommendations', () => {
  const lowLightBeginner = top(base);
  const sunnyBalcony = top({ space: 'balcony', light: 'bright-direct', time: 'moderate', experience: 'intermediate', types: ['herb', 'flowering'], size: 'balcony', pets: 'no' });
  const expertLiving = top({ space: 'living-room', light: 'bright-indirect', time: 'high', experience: 'expert', types: ['foliage'], size: 'large-floor', pets: 'no' });
  assert.notDeepEqual(lowLightBeginner, sunnyBalcony);
  assert.notDeepEqual(lowLightBeginner, expertLiving);
  assert.ok(lowLightBeginner.some((s) => ['snake-plant', 'zz-plant', 'golden-pothos', 'chinese-evergreen'].includes(s)));
  assert.ok(sunnyBalcony.some((s) => ['tulsi-holy-basil', 'jasmine-mogra', 'basil-sweet', 'bougainvillea', 'hibiscus', 'curry-leaf-plant'].includes(s)));
  assert.ok(expertLiving.some((s) => ['monstera-deliciosa', 'fiddle-leaf-fig', 'rubber-plant', 'areca-palm'].includes(s)));
});

test('scores are 0-100, sorted, and each has a transparent breakdown', () => {
  const { results } = buildRecommendation(catalogue, base);
  assert.ok(results.length >= 3);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.equal(r.breakdown.length, 6);
    assert.ok(r.reasons.length >= 1);
    if (i) assert.ok(results[i - 1].score >= r.score);
  }
});

test('a tough plant in the wrong light is penalised on the light factor', () => {
  const dim = lightScore(bySlug['jade-plant'], 'low');
  const sunny = lightScore(bySlug['jade-plant'], 'bright-direct');
  assert.ok(dim.score <= 0.35 && sunny.score === 1);
  assert.ok(dim.warn);
});

test('pets = yes filters out toxic plants and never treats unknown as safe', () => {
  const answers = { ...base, pets: 'yes', light: 'bright-direct', space: 'balcony', size: 'balcony', types: ['any'] };
  const rec = buildRecommendation(catalogue, answers, { limit: 40, minScore: 0 });
  assert.ok(rec.excluded.length > 5);
  for (const r of rec.results) assert.notEqual(r.product.petSafe, 'toxic');
  const unknown = rec.results.find((r) => r.product.petSafe === 'unknown');
  assert.ok(unknown.warnings.some((w) => /unverified/i.test(w)));
  const spider = buildRecommendation(catalogue, { ...answers, light: 'medium', space: 'living-room', size: 'small-shelf' }, { limit: 40, minScore: 0 }).results.find((r) => r.product.slug === 'spider-plant');
  assert.equal(spider.pet.status, 'safe');
});

test('pets = no keeps toxic plants; unspecified keeps them with a warning', () => {
  assert.ok(top(base, 40).includes('snake-plant'));
  const unspec = buildRecommendation(catalogue, { ...base, pets: 'unspecified' }, { limit: 40 }).results.find((r) => r.product.slug === 'snake-plant');
  assert.ok(unspec.warnings.some((w) => /toxic/i.test(w)));
});

test('light = unsure favours adaptable plants', () => {
  const t = top({ ...base, light: 'unsure' }, 6);
  assert.ok(t.includes('snake-plant') || t.includes('golden-pothos') || t.includes('zz-plant'));
});

test('plant personality reflects answers', () => {
  assert.equal(getPersonality({ ...base, types: ['herb'] }).id, 'kitchen-gardener');
  assert.equal(getPersonality({ ...base, experience: 'expert', time: 'high' }).id, 'botanist');
  assert.equal(getPersonality({ ...base, space: 'balcony', types: ['any'], light: 'medium', time: 'moderate', experience: 'intermediate' }).id, 'balcony-gardener');
  assert.equal(getPersonality(base).id, 'shade-explorer');
});

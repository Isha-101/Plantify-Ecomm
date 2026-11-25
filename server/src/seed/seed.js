// Seeds categories, products (30+ plants/supplies + kits) and sample reviews.
//   npm run seed                 – upsert the catalogue (keeps users, orders and carts valid)
//   npm run seed -- --demo       – also create demo@plantify.test (password: Plantify123) with a small sample garden
//   npm run seed -- --reset-all  – drop users, orders, reviews and gardens first (fresh start)
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { GardenPlant } from '../models/GardenPlant.js';
import { RoomPlan } from '../models/misc.js';
import { buildCatalogue, categories } from './catalogue.js';
import { buildPlantFromProduct, award } from '../services/gardenService.js';

const REVIEW_TEMPLATES = {
  plant: [
    { rating: 5, title: 'Arrived healthy', comment: 'Packed well and arrived fresh. It settled in within a week and already has new growth.' },
    { rating: 4, title: 'Lovely and easy', comment: 'Exactly as described. The care sheet made it simple to look after.' },
    { rating: 5, title: 'Great for my space', comment: 'Fits my room perfectly and looks healthy. Would order again.' },
    { rating: 4, title: 'Good value', comment: 'Good size for the price. A couple of lower leaves were yellow but it recovered quickly.' },
  ],
  supply: [
    { rating: 5, title: 'Does the job', comment: 'Good quality and exactly what I needed. Arrived well packed.' },
    { rating: 4, title: 'Solid purchase', comment: 'Works as described and feels well made for the price.' },
    { rating: 5, title: 'Would buy again', comment: 'Makes plant care easier – happy with it.' },
  ],
  kit: [
    { rating: 5, title: 'Perfect starter set', comment: 'Everything arrived together and worked well. A great way to start without guessing what to buy.' },
    { rating: 4, title: 'Nice bundle', comment: 'Saves effort and money compared to buying separately.' },
  ],
};

export function sampleReviewsFor(product, idx) {
  const set = product.category === 'plant-kits' ? REVIEW_TEMPLATES.kit : product.isPlant ? REVIEW_TEMPLATES.plant : REVIEW_TEMPLATES.supply;
  const picks = [set[idx % set.length], set[(idx + 1) % set.length]];
  return picks.map((r, i) => ({ product: product._id, name: 'Demo reviewer', isSample: true, verifiedPurchase: false, createdAt: new Date(Date.now() - (idx * 3 + i * 9 + 2) * 86400000), ...r }));
}

export async function seedCatalogue({ log = console.log } = {}) {
  const catalogue = buildCatalogue();

  // Categories
  for (const c of categories) {
    await Category.findOneAndUpdate({ slug: c.slug }, { ...c, image: `/images/categories/${c.slug}.svg` }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  // Products (upsert by slug so ids – and therefore carts, wishlists and orders – stay stable)
  const idBySlug = new Map();
  for (const { kitSlugs, ...doc } of catalogue) {
    const saved = await Product.findOneAndUpdate({ slug: doc.slug }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, timestamps: false });
    idBySlug.set(doc.slug, saved._id);
  }

  // Kits: resolve component slugs to product ids
  for (const k of catalogue.filter((p) => p.kitSlugs)) {
    const kitItems = k.kitSlugs.map(({ slug, quantity }) => ({ product: idBySlug.get(slug), quantity }));
    await Product.updateOne({ slug: k.slug }, { $set: { kitItems } });
  }

  // Remove products that are no longer in the catalogue
  const removed = await Product.deleteMany({ slug: { $nin: [...idBySlug.keys()] } });

  // Sample reviews are replaced each time; real user reviews are kept.
  await Review.deleteMany({ isSample: true });
  const docs = await Product.find().select('_id slug category isPlant').lean();
  const reviews = docs.flatMap((p, i) => sampleReviewsFor(p, i));
  if (reviews.length) await Review.insertMany(reviews);

  log(`Seeded ${categories.length} categories, ${catalogue.length} products (${removed.deletedCount} removed), ${reviews.length} sample reviews.`);
  return { products: catalogue.length, categories: categories.length };
}

export async function seedDemoUser({ log = console.log } = {}) {
  const email = 'demo@plantify.test';
  await User.deleteOne({ email });
  const user = await User.create({
    name: 'Demo Gardener',
    email,
    password: 'Plantify123',
    preferences: { experience: 'beginner', preferredTypes: ['foliage'], lightConditions: 'medium', pets: 'no' },
  });
  await GardenPlant.deleteMany({ user: user._id });
  const specs = [
    ['golden-pothos', 'Penny the Pothos', 'study', 24],
    ['snake-plant', 'Sir Snakes-a-lot', 'bedroom', 40],
    ['aloe-vera', 'Alo', 'balcony', 16],
  ];
  const DAY = 86400000;
  for (const [slug, nickname, location, ageDays] of specs) {
    const product = (await Product.findOne({ slug })).toJSON();
    const base = buildPlantFromProduct(product, { nickname, location, acquiredOn: new Date(Date.now() - ageDays * DAY) });
    const plant = await GardenPlant.create({ ...base, user: user._id });
    // A little history so the calendar, diary and charts have something to show.
    const water = plant.tasks.find((t) => t.type === 'water');
    water.lastDoneAt = new Date(Date.now() - Math.min(water.intervalDays + 2, 12) * DAY);
    for (let i = 0; i < 4; i++) plant.careLog.push({ type: 'water', at: new Date(Date.now() - (i * water.intervalDays + 3) * DAY), note: '' });
    plant.diary.push({ date: new Date(Date.now() - 6 * DAY), note: 'New leaf unfurling today – so exciting!', mood: 'great', health: 5 });
    plant.diary.push({ date: new Date(Date.now() - 2 * DAY), note: 'Moved closer to the window. Looks perky.', mood: 'good', health: 4 });
    plant.growth.push({ date: new Date(Date.now() - 14 * DAY), heightCm: 18, leafCount: 9, note: 'Baseline' });
    plant.growth.push({ date: new Date(Date.now() - 1 * DAY), heightCm: 22, leafCount: 12, note: 'Growing well' });
    await plant.save();
  }
  await award(user, 'addPlant');
  log('Demo user created: demo@plantify.test / Plantify123');
}

async function main() {
  const resetAll = process.argv.includes('--reset-all');
  const demo = process.argv.includes('--demo');
  await connectDB();
  if (resetAll) {
    await Promise.all([User.deleteMany({}), Order.deleteMany({}), Review.deleteMany({}), GardenPlant.deleteMany({}), RoomPlan.deleteMany({})]);
    console.log('Cleared users, orders, reviews, gardens and room plans.');
  }
  await seedCatalogue();
  if (demo) await seedDemoUser();
  await disconnectDB();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
}

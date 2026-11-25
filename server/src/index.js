import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { Product } from './models/Product.js';
import { seedCatalogue } from './seed/seed.js';

async function start() {
  await connectDB();
  console.log(`MongoDB connected: ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}`);

  // First run convenience: an empty database gets the sample catalogue automatically.
  if (process.env.AUTO_SEED !== 'false' && (await Product.estimatedDocumentCount()) === 0) {
    console.log('Empty catalogue detected – seeding sample data…');
    await seedCatalogue();
  }

  const app = createApp();
  app.listen(config.port, () => console.log(`Plantify API listening on http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error('Failed to start Plantify API:', err.message);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { clampOffset } from './utils/dates.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import searchRoutes from './routes/search.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import orderRoutes from './routes/orders.js';
import matchmakerRoutes from './routes/matchmaker.js';
import careRoutes from './routes/care.js';
import gardenRoutes from './routes/garden.js';
import kitRoutes from './routes/kits.js';
import compatibilityRoutes from './routes/compatibility.js';
import plannerRoutes from './routes/planner.js';
import miscRoutes from './routes/misc.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, cb) {
        // Allowed origins get CORS headers. Anything else simply gets none – the browser then blocks cross-origin
        // reads by itself, while same-origin requests (the built client served by this app sends an Origin header
        // for its module scripts) keep working. Never answer with an error here: it would turn into a 500.
        cb(null, !origin || config.clientOrigins.includes(origin) || config.clientOrigins.includes('*'));
      },
      allowedHeaders: ['Content-Type', 'Authorization', 'X-TZ-Offset'],
    })
  );
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  // The browser tells us its UTC offset (minutes east of UTC) so "today" means the user's today.
  app.use((req, _res, next) => {
    req.tz = clampOffset(req.headers['x-tz-offset']);
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'plantify-api', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/matchmaker', matchmakerRoutes);
  app.use('/api/care', careRoutes);
  app.use('/api/garden', gardenRoutes);
  app.use('/api/kits', kitRoutes);
  app.use('/api/compatibility', compatibilityRoutes);
  app.use('/api/planner', plannerRoutes);
  app.use('/api', miscRoutes);

  app.use('/api', notFoundHandler);

  // Optional: serve the built React app from the same server (npm run build in /client).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { maxAge: config.isProd ? '1h' : 0 }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

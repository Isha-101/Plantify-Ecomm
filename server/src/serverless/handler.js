// Runs the Express API inside a serverless function (Netlify Functions).
//
// The function receives a web `Request`. Instead of re-implementing Express' request/response objects, the
// real Express app is started once per function instance on a loopback port and each request is forwarded to
// it – so routing, middleware and error handling behave exactly as they do under `npm start`.
//
// Responsibilities here:
//   * check the required environment variables and answer with a clear 503 if they are missing
//   * reuse one MongoDB connection and one Express server across invocations (warm instances)
//   * seed an empty database once, safely, even when several cold instances start at the same moment
import http from 'node:http';
import mongoose from 'mongoose';

const FUNCTION_PREFIX = '/.netlify/functions/api';
const META_ID = 'catalogue-seed';
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];

// Headers that must not be copied between the function and the loopback server.
const HOP_BY_HOP = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'content-length', 'accept-encoding']);
const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);

export class SetupError extends Error {
  constructor(message, { status = 503, missing = [] } = {}) {
    super(message);
    this.name = 'SetupError';
    this.status = status;
    this.missing = missing;
  }
}

/** Names of required environment variables that are not set. */
export function missingEnv(env = process.env) {
  return REQUIRED_ENV.filter((k) => !String(env[k] || '').trim());
}

/**
 * Express routes live under /api. Depending on how Netlify forwards the request (rewrite from /api/*, or a
 * direct call to /.netlify/functions/api/*) the function can see either form – accept both.
 */
export function normaliseApiPath(pathname) {
  let p = pathname || '/';
  if (p === FUNCTION_PREFIX || p.startsWith(`${FUNCTION_PREFIX}/`)) p = p.slice(FUNCTION_PREFIX.length) || '/';
  if (p !== '/api' && !p.startsWith('/api/')) p = `/api${p === '/' ? '' : p}`;
  return p;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5, socketTimeoutMS: 45000 });
  return mongoose.connection;
}

/**
 * Seeds the catalogue exactly once. The first request on a brand-new database fires many parallel API calls,
 * each of which may land on its own cold instance, so a small lock document in the database decides who seeds
 * while the others wait for it to finish. A seeder that crashed is taken over after `staleMs`.
 */
async function countProducts() {
  const { Product } = await import('../models/Product.js');
  return Product.estimatedDocumentCount();
}

export async function ensureCatalogue({ seed, log = console.log, pollMs = 500, maxWaitMs = 45000, staleMs = 60000, db = mongoose.connection.db, count = countProducts } = {}) {
  if (String(process.env.AUTO_SEED).toLowerCase() === 'false') return 'disabled';
  const meta = db.collection('_plantify_meta');

  const existing = await meta.findOne({ _id: META_ID });
  if (existing?.status === 'done') return 'done';

  if (!existing) {
    // A database seeded earlier with `npm run seed` has products but no lock document.
    if ((await count()) > 0) {
      await meta.updateOne({ _id: META_ID }, { $setOnInsert: { status: 'done', finishedAt: new Date(), by: 'existing-data' } }, { upsert: true });
      return 'done';
    }
  }

  let mine = false;
  try {
    await meta.insertOne({ _id: META_ID, status: 'running', startedAt: new Date() });
    mine = true;
  } catch (err) {
    if (err?.code !== 11000) throw err; // duplicate key: another instance is already seeding
  }

  const deadline = Date.now() + maxWaitMs;
  while (!mine) {
    const doc = await meta.findOne({ _id: META_ID });
    if (doc?.status === 'done') return 'done';
    if (!doc) {
      // The other seeder failed and released the lock: try to claim it.
      try {
        await meta.insertOne({ _id: META_ID, status: 'running', startedAt: new Date() });
        mine = true;
        break;
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
    } else if (doc.status === 'running' && Date.now() - new Date(doc.startedAt).getTime() > staleMs) {
      const taken = await meta.findOneAndUpdate({ _id: META_ID, status: 'running', startedAt: doc.startedAt }, { $set: { startedAt: new Date() } });
      if (taken) {
        mine = true;
        break;
      }
    }
    if (Date.now() > deadline) throw new SetupError('The store catalogue is still being prepared. Please try again in a moment.');
    await sleep(pollMs);
  }

  try {
    await seed({ log });
    await meta.updateOne({ _id: META_ID }, { $set: { status: 'done', finishedAt: new Date() } });
    return 'seeded';
  } catch (err) {
    await meta.deleteOne({ _id: META_ID, status: 'running' }).catch(() => {});
    throw err;
  }
}

async function startRealServer() {
  const missing = missingEnv();
  if (missing.length) {
    throw new SetupError(`The Plantify API is not configured yet. Set ${missing.join(' and ')} in the Netlify environment variables, then redeploy.`, { missing });
  }
  await connectDatabase();
  const { seedCatalogue } = await import('../seed/seed.js');
  await ensureCatalogue({ seed: seedCatalogue });
  // Imported only now: the config module refuses to load in production without a JWT secret.
  const { createApp } = await import('../app.js');
  const server = http.createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { port: server.address().port, server };
}

function describeFailure(err) {
  if (err instanceof SetupError) return { status: err.status, body: { message: err.message, missing: err.missing.length ? err.missing : undefined } };
  const name = err?.name || '';
  if (name.startsWith('Mongo') || name === 'MongooseServerSelectionError') {
    return {
      status: 503,
      body: {
        message: 'The Plantify API could not connect to its database. Check the MONGODB_URI value, the database user, and that the Atlas network access list allows connections from anywhere (0.0.0.0/0).',
      },
    };
  }
  return { status: 500, body: { message: 'Something went wrong starting the Plantify API.' } };
}

/**
 * Creates the request handler. `start` resolves to `{ port }` of a running HTTP server; it is called lazily on
 * the first request and again after a failure, never twice concurrently.
 */
export function createBridge(start = startRealServer) {
  let starting = null;
  const getServer = () => {
    if (!starting) {
      starting = start().catch((err) => {
        starting = null;
        console.error('Plantify API failed to start:', err?.message || err);
        throw err;
      });
    }
    return starting;
  };

  return async function handleRequest(request, context = {}) {
    let target;
    try {
      target = await getServer();
      if (mongoose.connection.readyState === 0 && !missingEnv().length && target.server) await connectDatabase();
    } catch (err) {
      const { status, body } = describeFailure(err);
      return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    }

    const url = new URL(request.url);
    const headers = new Headers();
    for (const [k, v] of request.headers) if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
    // Rate limiting keys on the client address: use the one Netlify saw, never a value the client sent.
    const ip = context?.ip || request.headers.get('x-nf-client-connection-ip');
    if (ip) headers.set('x-forwarded-for', ip);
    else headers.delete('x-forwarded-for');

    const init = { method: request.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(request.method)) init.body = Buffer.from(await request.arrayBuffer());

    let upstream;
    try {
      upstream = await fetch(`http://127.0.0.1:${target.port}${normaliseApiPath(url.pathname)}${url.search}`, init);
    } catch (err) {
      starting = null; // the loopback server is gone – start a fresh one on the next request
      target.server?.close();
      console.error('Plantify API loopback request failed:', err?.message || err);
      return Response.json({ message: 'The Plantify API is restarting. Please try again.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }

    const out = new Headers();
    for (const [k, v] of upstream.headers) if (!HOP_BY_HOP.has(k.toLowerCase())) out.set(k, v);
    out.set('Cache-Control', out.get('cache-control') || 'no-store');
    return new Response(NULL_BODY_STATUS.has(upstream.status) ? null : upstream.body, { status: upstream.status, headers: out });
  };
}

export const handleRequest = createBridge();

// The serverless wrapper: path handling, request forwarding, start-up failures and the first-run seed lock.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createBridge, ensureCatalogue, missingEnv, normaliseApiPath, SetupError } from '../../src/serverless/handler.js';

// ---- helpers ---------------------------------------------------------------------------------------------

async function startStub() {
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/products', (req, res) => res.json({ query: req.query }));
  app.post('/api/echo', (req, res) => res.status(201).json({ body: req.body, auth: req.get('authorization') || null, ip: req.ip, ct: req.get('content-type') }));
  app.get('/api/empty', (_req, res) => res.status(204).end());
  app.get('/api/redirect', (_req, res) => res.redirect(302, '/api/health'));
  app.get('/api/cache', (_req, res) => res.set('Cache-Control', 'public, max-age=60').json({ ok: true }));
  app.set('trust proxy', 1);
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, server };
}

const call = (handle, path, init = {}, context = {}) => handle(new Request(`https://plantify.test${path}`, init), context);

// In-memory stand-in for the one collection the seed lock uses.
function fakeMeta() {
  const docs = new Map();
  const dup = () => Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
  const collection = {
    async findOne({ _id }) { return docs.has(_id) ? { ...docs.get(_id) } : null; },
    async insertOne(doc) { if (docs.has(doc._id)) throw dup(); docs.set(doc._id, { ...doc }); },
    async updateOne({ _id }, update, { upsert } = {}) {
      if (!docs.has(_id)) { if (!upsert) return; docs.set(_id, { _id, ...(update.$setOnInsert || {}) }); }
      if (update.$set) Object.assign(docs.get(_id), update.$set);
    },
    async findOneAndUpdate(filter, update) {
      const d = docs.get(filter._id);
      if (!d || d.status !== filter.status || String(d.startedAt) !== String(filter.startedAt)) return null;
      Object.assign(d, update.$set);
      return { ...d };
    },
    async deleteOne({ _id, status }) { if (docs.get(_id)?.status === status) docs.delete(_id); },
  };
  return { db: { collection: () => collection }, docs };
}

// ---- paths and environment -------------------------------------------------------------------------------

test('normaliseApiPath accepts both the public /api path and the raw function path', () => {
  assert.equal(normaliseApiPath('/api/products'), '/api/products');
  assert.equal(normaliseApiPath('/api'), '/api');
  assert.equal(normaliseApiPath('/.netlify/functions/api/products'), '/api/products');
  assert.equal(normaliseApiPath('/.netlify/functions/api'), '/api');
  assert.equal(normaliseApiPath('/.netlify/functions/api/'), '/api');
  assert.equal(normaliseApiPath('/products'), '/api/products');
  assert.equal(normaliseApiPath('/'), '/api');
  assert.equal(normaliseApiPath('/api-docs'), '/api/api-docs'); // not the /api prefix
});

test('missingEnv reports unset or blank variables', () => {
  assert.deepEqual(missingEnv({}), ['MONGODB_URI', 'JWT_SECRET']);
  assert.deepEqual(missingEnv({ MONGODB_URI: 'mongodb://x', JWT_SECRET: '   ' }), ['JWT_SECRET']);
  assert.deepEqual(missingEnv({ MONGODB_URI: 'mongodb://x', JWT_SECRET: 's' }), []);
});

// ---- request forwarding ----------------------------------------------------------------------------------

test('bridge forwards requests to the Express app (query string, JSON body, headers, status)', async () => {
  const stub = await startStub();
  const handle = createBridge(async () => ({ port: stub.port }));
  try {
    let res = await call(handle, '/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });

    res = await call(handle, '/.netlify/functions/api/products?featured=true&limit=8');
    assert.deepEqual((await res.json()).query, { featured: 'true', limit: '8' });

    res = await call(handle, '/api/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer abc', 'x-forwarded-for': '6.6.6.6' },
      body: JSON.stringify({ hello: 'world' }),
    }, { ip: '203.0.113.7' });
    assert.equal(res.status, 201);
    const echo = await res.json();
    assert.deepEqual(echo.body, { hello: 'world' });
    assert.equal(echo.auth, 'Bearer abc');
    assert.equal(echo.ip, '203.0.113.7', 'the client address comes from Netlify, not from a client-supplied header');
    assert.match(res.headers.get('content-type'), /application\/json/);

    res = await call(handle, '/api/empty');
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');

    res = await call(handle, '/api/redirect');
    assert.equal(res.status, 302, 'redirects are passed through, not followed');
    assert.equal(res.headers.get('location'), '/api/health');

    res = await call(handle, '/api/nope');
    assert.equal(res.status, 404, 'unknown routes keep the Express 404');
    assert.equal(res.headers.get('cache-control'), 'no-store');

    res = await call(handle, '/api/cache');
    assert.equal(res.headers.get('cache-control'), 'public, max-age=60', 'an explicit Cache-Control from the app is kept');
  } finally {
    stub.server.close();
  }
});

test('a client-sent X-Forwarded-For is dropped when Netlify supplied no address', async () => {
  const stub = await startStub();
  const handle = createBridge(async () => ({ port: stub.port }));
  try {
    const res = await call(handle, '/api/echo', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '6.6.6.6' }, body: '{}' });
    assert.notEqual((await res.json()).ip, '6.6.6.6');
  } finally {
    stub.server.close();
  }
});

// ---- start-up failures -----------------------------------------------------------------------------------

test('missing configuration answers 503 with the variable names and recovers once fixed', async () => {
  let configured = false;
  const stub = await startStub();
  const handle = createBridge(async () => {
    if (!configured) throw new SetupError('The Plantify API is not configured yet. Set MONGODB_URI and JWT_SECRET.', { missing: ['MONGODB_URI', 'JWT_SECRET'] });
    return { port: stub.port };
  });
  const log = console.error;
  console.error = () => {};
  try {
    let res = await call(handle, '/api/health');
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.message, /not configured/);
    assert.deepEqual(body.missing, ['MONGODB_URI', 'JWT_SECRET']);
    configured = true;
    res = await call(handle, '/api/health');
    assert.equal(res.status, 200);
  } finally {
    console.error = log;
    stub.server.close();
  }
});

test('a database connection failure is reported as 503 without leaking details', async () => {
  const handle = createBridge(async () => {
    throw Object.assign(new Error('connection <secret> failed'), { name: 'MongooseServerSelectionError' });
  });
  const log = console.error;
  console.error = () => {};
  try {
    const res = await call(handle, '/api/products');
    assert.equal(res.status, 503);
    const text = JSON.stringify(await res.json());
    assert.match(text, /could not connect to its database/);
    assert.doesNotMatch(text, /secret/);
  } finally {
    console.error = log;
  }
});

test('concurrent first requests start the server only once', async () => {
  const stub = await startStub();
  let starts = 0;
  const handle = createBridge(async () => {
    starts += 1;
    await new Promise((r) => setTimeout(r, 30));
    return { port: stub.port };
  });
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () => call(handle, '/api/health')));
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(starts, 1);
  } finally {
    stub.server.close();
  }
});

// ---- first-run seeding -----------------------------------------------------------------------------------

test('eight cold instances on an empty database seed exactly once and all wait for it', async () => {
  const { db, docs } = fakeMeta();
  let seeds = 0;
  const seed = async () => { seeds += 1; await new Promise((r) => setTimeout(r, 60)); };
  const run = () => ensureCatalogue({ db, seed, count: async () => 0, pollMs: 5, log: () => {} });
  const results = await Promise.all(Array.from({ length: 8 }, run));
  assert.equal(seeds, 1);
  assert.equal(results.filter((r) => r === 'seeded').length, 1);
  assert.equal(results.filter((r) => r === 'done').length, 7);
  assert.equal(docs.get('catalogue-seed').status, 'done');
  assert.equal(await run(), 'done');
  assert.equal(seeds, 1, 'a finished seed is never repeated');
});

test('a database that already has products (npm run seed) is adopted without seeding', async () => {
  const { db, docs } = fakeMeta();
  let seeds = 0;
  const out = await ensureCatalogue({ db, seed: async () => { seeds += 1; }, count: async () => 59, pollMs: 5, log: () => {} });
  assert.equal(out, 'done');
  assert.equal(seeds, 0);
  assert.equal(docs.get('catalogue-seed').status, 'done');
});

test('a failed seed releases the lock so the next request can try again', async () => {
  const { db, docs } = fakeMeta();
  await assert.rejects(ensureCatalogue({ db, seed: async () => { throw new Error('boom'); }, count: async () => 0, pollMs: 5, log: () => {} }), /boom/);
  assert.equal(docs.has('catalogue-seed'), false);
  let seeds = 0;
  assert.equal(await ensureCatalogue({ db, seed: async () => { seeds += 1; }, count: async () => 0, pollMs: 5, log: () => {} }), 'seeded');
  assert.equal(seeds, 1);
});

test('a seeder that died is taken over once its lock is stale', async () => {
  const { db, docs } = fakeMeta();
  docs.set('catalogue-seed', { _id: 'catalogue-seed', status: 'running', startedAt: new Date(Date.now() - 120000) });
  let seeds = 0;
  const out = await ensureCatalogue({ db, seed: async () => { seeds += 1; }, count: async () => 0, pollMs: 5, staleMs: 60000, log: () => {} });
  assert.equal(out, 'seeded');
  assert.equal(seeds, 1);
});

test('AUTO_SEED=false skips seeding entirely', async () => {
  const prev = process.env.AUTO_SEED;
  process.env.AUTO_SEED = 'false';
  try {
    assert.equal(await ensureCatalogue({ db: fakeMeta().db, seed: async () => { throw new Error('should not run'); }, count: async () => 0 }), 'disabled');
  } finally {
    if (prev === undefined) delete process.env.AUTO_SEED; else process.env.AUTO_SEED = prev;
  }
});

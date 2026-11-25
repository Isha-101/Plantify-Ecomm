// Portable test runner (works on Node 18/20/22): node scripts/run-tests.js unit|api
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const dir = resolve('test', process.argv[2] || 'unit');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.js')).map((f) => join(dir, f));
const res = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(res.status ?? 1);

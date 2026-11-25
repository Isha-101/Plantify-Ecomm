// Netlify Function that serves the whole Plantify REST API (everything under /api/*).
// netlify.toml rewrites /api/* to this function; the Express app itself lives in server/src.
// The function sits inside server/ on purpose: its npm dependencies (express, mongoose …) are installed in
// server/node_modules, and Netlify packages a function's dependencies by resolving them from its own folder.
import { handleRequest } from '../../src/serverless/handler.js';

export default (request, context) => handleRequest(request, context);

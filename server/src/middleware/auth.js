import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { unauthorized } from '../utils/httpError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }
  const user = await User.findById(payload.id);
  if (!user) throw unauthorized('Account not found. Please sign in again.');
  return user;
}

/** Requires a valid JWT. Attaches `req.user` (a Mongoose document, password excluded). */
export const protect = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
});

/** Attaches `req.user` when a valid token is present, otherwise continues as a guest. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = await loadUser(req);
  } catch {
    req.user = null;
  }
  next();
});

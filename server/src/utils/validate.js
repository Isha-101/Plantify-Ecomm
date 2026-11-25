import mongoose from 'mongoose';
import { badRequest } from './httpError.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
export const isObjectId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) && String(new mongoose.Types.ObjectId(v)) === v;

export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const num = (v, fallback = undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const oneOf = (v, allowed, fallback = undefined) => (allowed.includes(v) ? v : fallback);

export const arrayOf = (v, allowed) => (Array.isArray(v) ? v.filter((x) => allowed.includes(x)) : []);

export function assertObjectId(v, label = 'id') {
  if (!isObjectId(v)) throw badRequest(`Invalid ${label}.`);
  return v;
}

/** Collects field errors and throws a single 400 with details. */
export class Validator {
  constructor() {
    this.errors = {};
  }
  check(field, ok, message) {
    if (!ok && !this.errors[field]) this.errors[field] = message;
    return this;
  }
  done(message = 'Please correct the highlighted fields.') {
    if (Object.keys(this.errors).length) throw badRequest(message, this.errors);
  }
}

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must include at least one letter and one number.';
  return null;
}

/** Luhn checksum for the mock card form (never stored, only used to catch typos). */
export function luhn(numStr) {
  const digits = String(numStr).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

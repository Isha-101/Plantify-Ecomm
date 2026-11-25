import { readString, writeString } from '../utils/storage.js';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'plantify_token';

let token = readString(TOKEN_KEY, '');
let onUnauthorized = null;

export const getToken = () => token;
export const setToken = (t) => {
  token = t || '';
  writeString(TOKEN_KEY, token);
};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || null; // { field: message }
  }
}

function buildUrl(path, params) {
  const url = `${BASE}${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

async function request(method, path, { body, params, signal } = {}) {
  const headers = { Accept: 'application/json', 'X-TZ-Offset': String(-new Date().getTimezoneOffset()) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('We could not reach the Plantify server. Check your connection and that the API is running, then try again.', 0);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    const fallback = res.status >= 500 ? 'Something went wrong on our side. Please try again.' : `Request failed (${res.status}).`;
    throw new ApiError(data?.message || fallback, res.status, data?.errors);
  }
  return data;
}

export const api = {
  get: (path, params, opts) => request('GET', path, { params, ...opts }),
  post: (path, body = {}, opts) => request('POST', path, { body, ...opts }),
  put: (path, body = {}, opts) => request('PUT', path, { body, ...opts }),
  patch: (path, body = {}, opts) => request('PATCH', path, { body, ...opts }),
  del: (path, params, opts) => request('DELETE', path, { params, ...opts }),
};

export const errorMessage = (e, fallback = 'Something went wrong. Please try again.') => (e instanceof ApiError ? e.message : e?.message || fallback);

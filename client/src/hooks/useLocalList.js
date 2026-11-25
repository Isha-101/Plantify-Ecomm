import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../utils/storage.js';

/** A small, de-duplicated, most-recent-first list persisted in localStorage and synced between components. */
export function useLocalList(key, max = 8) {
  const [list, setList] = useState(() => readJSON(key, []));
  useEffect(() => {
    const handler = (e) => (e.detail?.key === key ? setList(readJSON(key, [])) : null);
    window.addEventListener('plantify:list', handler);
    return () => window.removeEventListener('plantify:list', handler);
  }, [key]);
  const push = useCallback((value) => pushToList(key, value, max), [key, max]);
  const remove = useCallback((value) => {
    writeJSON(key, readJSON(key, []).filter((v) => v !== value));
    window.dispatchEvent(new CustomEvent('plantify:list', { detail: { key } }));
  }, [key]);
  const clear = useCallback(() => {
    writeJSON(key, []);
    window.dispatchEvent(new CustomEvent('plantify:list', { detail: { key } }));
  }, [key]);
  return { list, push, remove, clear };
}

export function pushToList(key, value, max = 8) {
  if (!value) return;
  const next = [value, ...readJSON(key, []).filter((v) => v !== value)].slice(0, max);
  writeJSON(key, next);
  window.dispatchEvent(new CustomEvent('plantify:list', { detail: { key } }));
}

export const RECENT_SEARCHES = 'plantify_recent_searches';
export const RECENT_VIEWED = 'plantify_recently_viewed';

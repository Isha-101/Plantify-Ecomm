import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client.js';

/** Runs `fetcher(signal)` whenever `deps` change; exposes { data, loading, error, reload, setData }. */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetcherRef
      .current(ctrl.signal)
      .then((data) => !ctrl.signal.aborted && setState({ data, loading: false, error: '' }))
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

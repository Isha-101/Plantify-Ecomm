import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  const logout = useCallback((silent) => {
    setToken('');
    setUser(null);
    if (silent === 'expired') toast.info('Your session has expired – please sign in again.');
  }, [toast]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout('expired'));
  }, [logout]);

  // Restore the session on load.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    api.get('/auth/me')
      .then((r) => !cancelled && setUser(r.user))
      .catch(() => !cancelled && setToken(''))
      .finally(() => !cancelled && setReady(true));
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (payload) => {
    const r = await api.post('/auth/register', payload);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await api.get('/auth/me');
    setUser(r.user);
    return r.user;
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser, refreshUser }), [user, ready, login, register, logout, refreshUser]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

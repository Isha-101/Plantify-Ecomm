import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { readJSON, writeJSON } from '../utils/storage.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const WishCtx = createContext(null);
export const useWishlist = () => useContext(WishCtx);
const LS = 'plantify_wishlist';

/** Guests keep product ids in localStorage; signed-in users use the server list (guest ids are merged on login). */
export function WishlistProvider({ children }) {
  const { user, ready } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState(() => readJSON(LS, []));
  const userId = user?.id || null;
  const synced = useRef(null);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      synced.current = null;
      setIds(readJSON(LS, []));
      return;
    }
    if (synced.current === userId) return;
    synced.current = userId;
    const guest = readJSON(LS, []);
    const req = guest.length ? api.post('/wishlist/merge', { ids: guest }) : api.get('/wishlist');
    req.then((r) => {
      setIds(r.ids);
      if (guest.length) { writeJSON(LS, []); toast.success('Your saved plants were added to your wishlist.'); }
    }).catch(() => {});
  }, [ready, userId, toast]);

  const has = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback(async (product) => {
    const id = product.id;
    const wasIn = ids.includes(id);
    // optimistic
    const next = wasIn ? ids.filter((x) => x !== id) : [...ids, id];
    setIds(next);
    try {
      if (userId) {
        const r = wasIn ? await api.del(`/wishlist/${id}`) : await api.post(`/wishlist/${id}`);
        setIds(r.ids);
      } else writeJSON(LS, next);
      if (wasIn) toast.info(`${product.name} removed from your wishlist.`);
      else toast.success(`${product.name} saved to your wishlist.`, { action: { to: '/wishlist', label: 'View wishlist' } });
    } catch (e) {
      setIds(ids);
      toast.error(errorMessage(e));
    }
  }, [ids, userId, toast]);

  const remove = useCallback(async (id) => {
    const next = ids.filter((x) => x !== id);
    setIds(next);
    try {
      if (userId) setIds((await api.del(`/wishlist/${id}`)).ids);
      else writeJSON(LS, next);
    } catch (e) {
      setIds(ids);
      toast.error(errorMessage(e));
    }
  }, [ids, userId, toast]);

  const value = useMemo(() => ({ ids, count: ids.length, has, toggle, remove }), [ids, has, toggle, remove]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

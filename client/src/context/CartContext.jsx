import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { readJSON, readString, writeJSON, writeString } from '../utils/storage.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const LS_CART = 'plantify_cart';
const LS_COUPON = 'plantify_coupon';
export const EMPTY_PRICING = { itemCount: 0, mrpTotal: 0, subtotal: 0, productSavings: 0, kitDiscount: 0, coupon: null, couponError: null, couponDiscount: 0, shipping: 0, freeShippingThreshold: 999, freeShippingRemaining: 0, total: 0, totalSavings: 0, hasStockIssues: false };
export const lineKey = (l) => `${l.productId}|${l.kitId || ''}`;

/**
 * Cart state. Guests keep [{productId, quantity, kitId?, kitName?}] in localStorage and are priced by POST /cart/quote.
 * Signed-in users use the server cart; on login the guest lines are merged into it.
 */
export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const toast = useToast();
  const [guestLines, setGuestLines] = useState(() => readJSON(LS_CART, []));
  const [cart, setCart] = useState({ items: [], pricing: EMPTY_PRICING });
  const [coupon, setCoupon] = useState(() => readString(LS_COUPON, ''));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const userId = user?.id || null;

  useEffect(() => writeJSON(LS_CART, guestLines), [guestLines]);
  useEffect(() => writeString(LS_COUPON, coupon), [coupon]);

  const apply = useCallback((payload) => {
    setCart({ items: payload.items || [], pricing: { ...EMPTY_PRICING, ...(payload.pricing || {}) } });
    setError('');
  }, []);

  const refresh = useCallback(async () => {
    const id = ++reqId.current;
    try {
      let data;
      if (userId) data = await api.get('/cart', { coupon });
      else if (guestLines.length) data = await api.post('/cart/quote', { items: guestLines, coupon });
      else data = { items: [], pricing: EMPTY_PRICING };
      if (id === reqId.current) apply(data);
    } catch (e) {
      if (id === reqId.current) setError(errorMessage(e));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [userId, guestLines, coupon, apply]);

  // Merge the guest cart into the stored cart right after sign-in.
  const mergedFor = useRef(null);
  useEffect(() => {
    if (!ready || !userId || mergedFor.current === userId) return;
    mergedFor.current = userId;
    if (!guestLines.length) return;
    const id = ++reqId.current;
    api.post('/cart/merge', { items: guestLines, coupon })
      .then((data) => {
        if (id === reqId.current) apply(data);
        setGuestLines([]);
        toast.success(data.skipped ? 'We added your saved items to your cart (some were limited by stock).' : 'Your guest cart was added to your account.');
      })
      .catch((e) => toast.error(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId]);
  useEffect(() => { if (!userId) mergedFor.current = null; }, [userId]);

  useEffect(() => {
    if (!ready) return;
    if (userId && mergedFor.current === userId && guestLines.length) return; // wait for merge
    setLoading(true);
    refresh();
  }, [ready, userId, guestLines, coupon]); // eslint-disable-line react-hooks/exhaustive-deps

  const inCart = useCallback((productId) => cart.items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0), [cart.items]);

  const add = useCallback(async (product, quantity = 1, { kitId, kitName, silent } = {}) => {
    const id = product.id;
    if (product.stock <= 0) { toast.error(`${product.name} is out of stock.`); return false; }
    try {
      if (userId) {
        const data = await api.post('/cart/items', { productId: id, quantity, kitId, kitName, coupon });
        apply(data);
      } else {
        const have = guestLines.filter((l) => l.productId === id).reduce((s, l) => s + l.quantity, 0);
        if (have + quantity > product.stock) {
          toast.error(have >= product.stock ? `You already have all ${product.stock} available in your cart.` : `Only ${product.stock} of ${product.name} in stock${have ? ` (you have ${have} in your cart)` : ''}.`);
          return false;
        }
        setGuestLines((lines) => {
          const next = [...lines];
          const idx = next.findIndex((l) => l.productId === id && (l.kitId || '') === (kitId || ''));
          if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
          else next.push({ productId: id, quantity, ...(kitId ? { kitId, kitName } : {}) });
          return next;
        });
      }
      if (!silent) toast.success(`${product.name} added to your cart.`, { action: { to: '/cart', label: 'View cart' } });
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }, [userId, guestLines, coupon, apply, toast]);

  const setQty = useCallback(async (item, quantity) => {
    const q = Math.max(0, Math.min(99, Math.floor(quantity)));
    try {
      if (userId) {
        apply(await api.patch(`/cart/items/${item.productId}`, { quantity: q, kitId: item.kitId, coupon }));
      } else {
        if (q > item.product.stock) { toast.error(`Only ${item.product.stock} of ${item.product.name} in stock.`); return; }
        setGuestLines((lines) => lines.flatMap((l) => (lineKey(l) === lineKey(item) ? (q === 0 ? [] : [{ ...l, quantity: q }]) : [l])));
      }
    } catch (e) {
      toast.error(errorMessage(e));
      refresh();
    }
  }, [userId, coupon, apply, toast, refresh]);

  const remove = useCallback(async (item) => {
    try {
      if (userId) apply(await api.del(`/cart/items/${item.productId}`, { kitId: item.kitId, coupon }));
      else setGuestLines((lines) => lines.filter((l) => lineKey(l) !== lineKey(item)));
    } catch (e) {
      toast.error(errorMessage(e));
      refresh();
    }
  }, [userId, coupon, apply, toast, refresh]);

  const clear = useCallback(async () => {
    try {
      if (userId) apply(await api.del('/cart'));
      else setGuestLines([]);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, [userId, apply, toast]);

  /** Adds a custom kit (all lines share a kitId so the bundle discount applies). */
  const addKit = useCallback(async (entries, name) => {
    if (userId) {
      const data = await api.post('/kits/custom/add-to-cart', { items: entries.map((e) => ({ productId: e.productId, quantity: e.quantity })), name });
      apply(data.cart);
      return data;
    }
    const kitId = `kit-${Math.random().toString(36).slice(2, 10)}`;
    setGuestLines((lines) => [...lines, ...entries.map((e) => ({ productId: e.productId, quantity: e.quantity, kitId, kitName: name || 'My custom kit' }))]);
    return { kitId };
  }, [userId, apply]);

  const applyCoupon = useCallback(async (code) => {
    const c = String(code || '').trim().toUpperCase();
    if (!c) { setCoupon(''); return { ok: true }; }
    try {
      const data = userId ? await api.get('/cart', { coupon: c }) : await api.post('/cart/quote', { items: guestLines, coupon: c });
      if (data.pricing.couponError) return { ok: false, error: data.pricing.couponError };
      setCoupon(c);
      apply(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  }, [userId, guestLines, apply]);

  const value = useMemo(() => ({
    items: cart.items, pricing: cart.pricing, count: cart.pricing.itemCount, loading, error, coupon,
    add, setQty, remove, clear, addKit, applyCoupon, removeCoupon: () => setCoupon(''), refresh, inCart,
  }), [cart, loading, error, coupon, add, setQty, remove, clear, addKit, applyCoupon, refresh, inCart]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

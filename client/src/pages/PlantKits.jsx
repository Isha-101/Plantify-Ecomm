import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CircleCheck, Info, Minus, Package, Plus, ShoppingBag, Trash2, Wand2 } from 'lucide-react';
import { EmptyState, ErrorState, PageHead, SmartImage } from '../components/ui.jsx';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatINR } from '../utils/format.js';

function PremadeKits() {
  const cart = useCart();
  const { data, loading, error, reload } = useApi((signal) => api.get('/kits', null, { signal }), []);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="kit-showcase">
      {(loading ? [...Array(3)] : data.kits).map((k, i) => k ? (
        <article key={k.id} className="card kit-wide">
          <Link to={`/product/${k.slug}`} className="kit-wide-media"><SmartImage src={k.image} alt={k.name} width="420" height="420" /></Link>
          <div className="kit-wide-body">
            <div className="row wrap"><span className="chip beige">{k.subcategory || 'Plant kit'}</span>{k.discountPercent > 0 && <span className="chip ok">Save {k.discountPercent}%</span>}</div>
            <h3><Link to={`/product/${k.slug}`}>{k.name}</Link></h3>
            <p className="small muted">{k.shortDescription}</p>
            <h4 className="small" style={{ margin: '10px 0 6px' }}>What’s inside</h4>
            <ul className="kit-contents">{k.contents.map((c) => <li key={c.product.id}><SmartImage src={c.product.image} alt="" width="36" height="36" /><Link to={`/product/${c.product.slug}`}>{c.product.name}</Link><span className="muted">× {c.quantity}</span></li>)}</ul>
            <div className="row between wrap" style={{ marginTop: 'auto', paddingTop: 14 }}>
              <div className="pc-price"><strong>{formatINR(k.price)}</strong>{k.originalPrice > k.price && <s>{formatINR(k.originalPrice)}</s>}</div>
              <div className="row"><Link to={`/product/${k.slug}`} className="btn btn-ghost btn-sm">Details</Link><button className="btn btn-primary btn-sm" onClick={() => cart.add(k, 1)} disabled={k.stock <= 0}><ShoppingBag size={15} /> {k.stock <= 0 ? 'Sold out' : 'Add kit'}</button></div>
            </div>
          </div>
        </article>
      ) : <div key={i} className="skeleton" style={{ height: 260 }} />)}
    </div>
  );
}

const NOTE_ICON = { ok: CircleCheck, warn: AlertTriangle, info: Info };

function Builder() {
  const cart = useCart();
  const toast = useToast();
  const builder = useApi((signal) => api.get('/kits/builder', null, { signal }), []);
  const [role, setRole] = useState('plant');
  const [picked, setPicked] = useState([]); // [{ product, quantity }]
  const [name, setName] = useState('');
  const [quote, setQuote] = useState(null);
  const [qErr, setQErr] = useState('');
  const [qBusy, setQBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const key = JSON.stringify(picked.map((p) => [p.product.id, p.quantity]));
  const dKey = useDebounced(key, 250);
  const seq = useRef(0);
  useEffect(() => {
    const items = JSON.parse(dKey).map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length) { setQuote(null); setQErr(''); return; }
    const n = ++seq.current;
    setQBusy(true);
    api.post('/kits/custom/quote', { items })
      .then((r) => { if (n === seq.current) { setQuote(r.kit); setQErr(''); } })
      .catch((e) => { if (n === seq.current) setQErr(errorMessage(e)); })
      .finally(() => { if (n === seq.current) setQBusy(false); });
  }, [dKey]);

  const roles = builder.data?.roles || [];
  const current = roles.find((r) => r.role === role) || roles[0];
  const has = (id) => picked.some((p) => p.product.id === id);
  const toggle = (product) => setPicked((l) => (l.some((p) => p.product.id === product.id) ? l.filter((p) => p.product.id !== product.id) : l.length >= 12 ? (toast.error('A custom kit can hold up to 12 different products.'), l) : [...l, { product, quantity: 1 }]));
  const setQty = (id, q) => setPicked((l) => l.map((p) => (p.product.id === id ? { ...p, quantity: Math.max(1, Math.min(10, q, p.product.stock)) } : p)));

  const stale = key !== dKey || qBusy;
  const tiers = builder.data?.tiers || [];
  const distinct = picked.length;

  const addToCart = async () => {
    setAdding(true);
    try {
      const r = await cart.addKit(picked.map((p) => ({ productId: p.product.id, quantity: p.quantity })), name.trim() || 'My custom kit');
      toast.success(`${name.trim() || 'Your custom kit'} is in your cart.`, { action: { to: '/cart', label: 'View cart' } });
      toast.rewards(r?.rewards);
      setPicked([]); setName('');
    } catch (e) { toast.error(errorMessage(e)); } finally { setAdding(false); }
  };

  if (builder.error) return <ErrorState message={builder.error} onRetry={builder.reload} />;
  if (!builder.data) return <div className="skeleton" style={{ height: 420 }} />;

  return (
    <div className="builder">
      <div className="card pad">
        <div className="tabs" role="tablist" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {roles.map((r) => <button key={r.role} role="tab" aria-selected={role === r.role} className={`tab${role === r.role ? ' is-on' : ''}`} onClick={() => setRole(r.role)}>{r.label}{picked.filter((p) => roles.find((x) => x.role === r.role)?.products.some((q) => q.id === p.product.id)).length > 0 && <span className="count">{picked.filter((p) => r.products.some((q) => q.id === p.product.id)).length}</span>}</button>)}
        </div>
        <ul className="pick-list">
          {current?.products.map((p) => (
            <li key={p.id} className={has(p.id) ? 'is-on' : ''}>
              <SmartImage src={p.image} alt="" width="56" height="56" />
              <div className="pick-info"><b>{p.name}</b><span className="xs muted">{[p.isPlant && p.potSizeCm ? `Pot ${p.potSizeCm.min}–${p.potSizeCm.max} cm` : null, p.diameterMinCm ? `Fits ${p.diameterMinCm}–${p.diameterMaxCm} cm plants` : null, p.hasDrainage === false ? 'No drainage hole' : null].filter(Boolean).join(' · ')}</span></div>
              <b className="pick-price">{formatINR(p.price)}</b>
              <button className={`btn btn-sm ${has(p.id) ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(p)} aria-pressed={has(p.id)} aria-label={`${has(p.id) ? 'Remove' : 'Add'} ${p.name} ${has(p.id) ? 'from' : 'to'} kit`}>{has(p.id) ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add</>}</button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="card pad builder-sum" aria-label="Your kit" aria-live="polite">
        <h3 style={{ fontSize: '1.3rem' }}>Your custom kit</h3>
        <div className="tier-row" aria-label="Bundle discounts">
          {[...tiers].reverse().map((t) => <span key={t.min} className={`tier${distinct >= t.min ? ' on' : ''}`}>{t.min}+ items<b>{t.pct}% off</b></span>)}
        </div>
        {picked.length === 0 ? <EmptyState icon={Package} title="Nothing yet" text="Pick a plant, a pot and some soil. Add 3 or more different products for a bundle discount." /> : (
          <>
            <ul className="kit-lines">
              {picked.map((p) => (
                <li key={p.product.id}>
                  <SmartImage src={p.product.image} alt="" width="40" height="40" />
                  <span className="kl-name small"><b>{p.product.name}</b><span className="muted">{formatINR(p.product.price)}</span></span>
                  <span className="qty qty-sm"><button onClick={() => setQty(p.product.id, p.quantity - 1)} disabled={p.quantity <= 1} aria-label={`Decrease ${p.product.name}`}><Minus size={13} /></button><span aria-live="off">{p.quantity}</span><button onClick={() => setQty(p.product.id, p.quantity + 1)} disabled={p.quantity >= Math.min(10, p.product.stock)} aria-label={`Increase ${p.product.name}`}><Plus size={13} /></button></span>
                  <button className="icon-btn" onClick={() => toggle(p.product)} aria-label={`Remove ${p.product.name}`}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
            {qErr && <p className="err-text small" role="alert">{qErr}</p>}
            {quote && (
              <div style={{ opacity: stale ? 0.6 : 1 }}>
                <div className="summary">
                  <div className="row between small"><span>Subtotal ({quote.distinctProducts} products)</span><span>{formatINR(quote.subtotal)}</span></div>
                  {quote.discount > 0 && <div className="row between small save"><span>Bundle discount ({quote.discountPct}%)</span><span>− {formatINR(quote.discount)}</span></div>}
                  <div className="row between total"><span>Kit total</span><b>{formatINR(quote.total)}</b></div>
                </div>
                {quote.nextTier && <p className="save-note small">Add {quote.nextTier.itemsNeeded} more different {quote.nextTier.itemsNeeded === 1 ? 'product' : 'products'} to save {quote.nextTier.pct}%.</p>}
                <p className="xs muted" style={{ margin: '6px 0 10px' }}>Kit complete: {quote.completeness.have}/{quote.completeness.of} essentials {quote.completeness.missing.length > 0 && `(missing: ${quote.completeness.missing.join(', ')})`}</p>
                {quote.notes.length > 0 && (
                  <ul className="kit-notes"><li className="xs muted" style={{ listStyle: 'none', fontWeight: 600 }}><Wand2 size={13} style={{ verticalAlign: '-2px' }} /> Compatibility check</li>
                    {quote.notes.map((n, i) => { const I = NOTE_ICON[n.level] || Info; return <li key={i} className={`note ${n.level}`}><I size={15} /><span>{n.text}</span></li>; })}
                  </ul>
                )}
              </div>
            )}
            <label className="small" htmlFor="kit-name" style={{ display: 'block', margin: '12px 0 4px', fontWeight: 600 }}>Kit name (optional)</label>
            <input id="kit-name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Study-desk starter" />
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 14 }} onClick={addToCart} disabled={adding || !quote || !!qErr || stale}><ShoppingBag size={18} /> {adding ? 'Adding…' : 'Add kit to cart'}</button>
            <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => setPicked([])}>Clear kit</button>
          </>
        )}
      </aside>
    </div>
  );
}

export default function PlantKits() {
  return (
    <>
      <PageHead eyebrow="Plant kits" title="Everything you need, in one box">Hand-picked bundles that include the plant, the right pot and the right soil – or build your own and get a bundle discount.</PageHead>
      <div className="container section tight">
        <h2 style={{ fontSize: '1.7rem' }}>Ready-made kits</h2>
        <PremadeKits />
        <h2 id="builder" style={{ fontSize: '1.7rem', marginTop: 56 }}>Build your own kit</h2>
        <p className="muted" style={{ maxWidth: 620 }}>Pick products below. We check that your pots fit your plants, that the soil suits them, and that the plants get along. Kits of 3+ different products get <b>5% off</b>, 4+ get <b>8%</b>, 5+ get <b>12%</b>.</p>
        <Builder />
      </div>
    </>
  );
}

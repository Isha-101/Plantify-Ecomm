import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Gift, Heart, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { EmptyState, ErrorState, QtyStepper, SmartImage, PageLoading } from '../components/ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { formatINR } from '../utils/format.js';

export function CouponBox() {
  const cart = useCart();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const p = cart.pricing;
  const apply = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setErr('Enter a coupon code.'); return; }
    setBusy(true); setErr('');
    const r = await cart.applyCoupon(code);
    setBusy(false);
    if (!r.ok) setErr(r.error); else setCode('');
  };
  return (
    <div className="coupon">
      {p.coupon ? (
        <div className="alert ok"><Tag size={18} /><div style={{ flex: 1 }}><strong>{p.coupon.code}</strong> applied – {p.coupon.label}</div><button className="btn-link small" onClick={cart.removeCoupon}>Remove</button></div>
      ) : (
        <form onSubmit={apply} noValidate>
          <label htmlFor="coupon" className="label">Have a coupon?</label>
          <div className="row" style={{ marginTop: 6 }}>
            <input id="coupon" className="input" placeholder="e.g. PLANT10" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }} aria-invalid={!!err} autoComplete="off" />
            <button className="btn btn-secondary" disabled={busy}>{busy ? '…' : 'Apply'}</button>
          </div>
          {err && <p className="err small" role="alert" style={{ color: 'var(--danger)', margin: '6px 0 0' }}>{err}</p>}
          <p className="xs muted" style={{ margin: '6px 0 0' }}>Try <b>PLANT10</b> (10% off), <b>WELCOME15</b> (15% off orders over ₹799), <b>GREENGIFT</b> (₹100 off) or <b>FREESHIP</b>.</p>
        </form>
      )}
    </div>
  );
}

export function PriceSummary({ pricing: p, showCoupon = true }) {
  return (
    <dl className="summary">
      <div><dt>Items total (MRP)</dt><dd>{formatINR(p.mrpTotal)}</dd></div>
      {p.productSavings > 0 && <div className="save"><dt>Product discounts</dt><dd>− {formatINR(p.productSavings)}</dd></div>}
      {p.kitDiscount > 0 && <div className="save"><dt>Custom kit bundle discount</dt><dd>− {formatINR(p.kitDiscount)}</dd></div>}
      {p.couponDiscount > 0 && <div className="save"><dt>Coupon {p.coupon?.code}</dt><dd>− {formatINR(p.couponDiscount)}</dd></div>}
      <div><dt>Shipping</dt><dd>{p.shipping > 0 ? formatINR(p.shipping) : <span className="ok-text">Free</span>}</dd></div>
      <div className="total"><dt>Total</dt><dd>{formatINR(p.total)}</dd></div>
      {p.totalSavings > 0 && <p className="save-note">🌿 You’re saving {formatINR(p.totalSavings)} on this order</p>}
    </dl>
  );
}

export default function Cart() {
  const cart = useCart();
  const { user } = useAuth();
  const wish = useWishlist();
  const nav = useNavigate();
  const { items, pricing: p } = cart;

  if (cart.loading && !items.length) return <PageLoading />;
  if (cart.error && !items.length) return <div className="container section"><ErrorState message={cart.error} onRetry={cart.refresh} /></div>;

  if (!items.length) {
    return (
      <div className="container section">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" text="Plants make wonderful roommates. Find one you love and it will wait for you here.">
          <div className="row wrap" style={{ justifyContent: 'center' }}><Link to="/shop" className="btn btn-primary">Shop plants</Link><Link to="/matchmaker" className="btn btn-ghost">Find my plant match</Link></div>
        </EmptyState>
      </div>
    );
  }

  const moveToWishlist = async (it) => { if (!wish.has(it.productId)) await wish.toggle(it.product); await cart.remove(it); };
  const checkout = () => nav(user ? '/checkout' : '/login', { state: { from: '/checkout', notice: 'Sign in to check out – your cart will be kept.' } });
  const kitNames = [...new Set(items.filter((i) => i.kitId).map((i) => i.kitName))];

  return (
    <div className="container section tight">
      <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)' }}>Your cart <span className="muted" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-body)' }}>({p.itemCount} {p.itemCount === 1 ? 'item' : 'items'})</span></h1>
      {p.hasStockIssues && <div className="alert bad" role="alert" style={{ marginBottom: 16 }}><AlertTriangle size={18} /><span>Some items have limited stock. We’ve adjusted the quantities below – please review before checking out.</span></div>}
      <div className="cart-layout">
        <div className="stack" style={{ gap: 14 }}>
          {items.map((it) => (
            <article key={`${it.productId}|${it.kitId || ''}`} className="cart-line card">
              <Link to={`/product/${it.product.slug}`} className="cl-img"><SmartImage src={it.product.image} alt={it.product.name} width="160" height="160" /></Link>
              <div className="cl-main">
                <h3><Link to={`/product/${it.product.slug}`}>{it.product.name}</Link></h3>
                {it.kitId && <span className="chip info"><Gift size={12} /> {it.kitName}{it.kitDiscountPct > 0 ? ` · ${it.kitDiscountPct}% kit discount` : ''}</span>}
                <div className="small muted">{it.product.stock <= 5 && it.product.stock > 0 ? <span className="warn-text">Only {it.product.stock} left</span> : it.product.stock <= 0 ? <span className="err-text">Out of stock</span> : 'In stock'}</div>
                {it.stockIssue && <div className="small err-text" role="alert">{it.stockIssue}</div>}
                <div className="row wrap" style={{ gap: 14, marginTop: 8 }}>
                  <QtyStepper size="sm" value={it.quantity} max={Math.min(99, Math.max(it.quantity, it.product.stock))} onChange={(q) => cart.setQty(it, q)} label={`Quantity for ${it.product.name}`} />
                  <button className="btn-link small" onClick={() => moveToWishlist(it)}><Heart size={13} style={{ verticalAlign: '-2px' }} /> Move to wishlist</button>
                  <button className="btn-link small danger-link" onClick={() => cart.remove(it)}><Trash2 size={13} style={{ verticalAlign: '-2px' }} /> Remove</button>
                </div>
              </div>
              <div className="cl-price"><strong>{formatINR(it.lineTotal)}</strong>{it.unitPrice < it.product.originalPrice && it.quantity > 0 && <s>{formatINR((it.product.originalPrice || it.listUnitPrice) * it.quantity)}</s>}<small>{formatINR(it.unitPrice)} each</small></div>
            </article>
          ))}
          <div className="row between wrap"><Link to="/shop" className="link-arrow">← Continue shopping</Link><button className="btn-link small danger-link" onClick={cart.clear}>Clear cart</button></div>
        </div>

        <aside className="cart-summary card pad" aria-label="Order summary">
          <h2 style={{ fontSize: '1.4rem' }}>Order summary</h2>
          {p.freeShippingRemaining > 0 ? (
            <div className="ship-progress"><div className="row small"><Truck size={16} /> Add <b>{formatINR(p.freeShippingRemaining)}</b> more for free shipping</div><div className="pill-progress"><span style={{ width: `${Math.min(100, (p.subtotal - p.kitDiscount) / p.freeShippingThreshold * 100)}%` }} /></div></div>
          ) : <div className="alert ok" style={{ padding: '10px 14px' }}><Truck size={16} /> You’ve unlocked free shipping!</div>}
          <hr className="soft" />
          <CouponBox />
          <hr className="soft" />
          <PriceSummary pricing={p} />
          <button className="btn btn-primary btn-lg btn-block" onClick={checkout} disabled={p.hasStockIssues && items.every((i) => i.stockIssue)}>{user ? 'Proceed to checkout' : 'Sign in to check out'}</button>
          {!user && <p className="xs muted center" style={{ margin: '10px 0 0' }}>Your cart is saved and will be merged with your account when you sign in.</p>}
          {kitNames.length > 0 && <p className="xs muted" style={{ margin: '12px 0 0' }}>Custom kit discounts apply when a kit has 3+ different products.</p>}
        </aside>
      </div>
    </div>
  );
}

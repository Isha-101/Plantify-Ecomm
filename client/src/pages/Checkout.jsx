import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Check, CreditCard, MapPin, Plus, ShieldCheck, Smartphone, Truck, ClipboardCheck, ShoppingBag, PartyPopper, Lock } from 'lucide-react';
import { Field, PageLoading, SmartImage } from '../components/ui.jsx';
import { CouponBox, PriceSummary } from './Cart.jsx';
import { api, errorMessage } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatINR } from '../utils/format.js';

export const STEPS = [
  ['Cart', ShoppingBag], ['Address', MapPin], ['Delivery', Truck], ['Payment', CreditCard], ['Review', ClipboardCheck], ['Confirmed', PartyPopper],
];

export function Stepper({ current }) {
  return (
    <ol className="stepper" aria-label="Checkout progress">
      {STEPS.map(([label, Icon], i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={label} className={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="st-dot">{state === 'done' ? <Check size={16} /> : <Icon size={16} />}</span>
            <span className="st-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const EMPTY_ADDR = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };
const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

export function validateAddress(a) {
  const e = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the recipient’s full name.';
  if (!/^[0-9]{10}$/.test(a.phone.replace(/\D/g, '').slice(-10)) || a.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number.';
  if (a.line1.trim().length < 3) e.line1 = 'Enter the address (house / street).';
  if (a.city.trim().length < 2) e.city = 'Enter the city.';
  if (a.state.trim().length < 2) e.state = 'Choose or enter the state.';
  if (!/^[0-9]{6}$/.test(a.pincode.trim())) e.pincode = 'Enter a 6-digit PIN code.';
  return e;
}

export function AddressForm({ value, onChange, errors = {} }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div>
      <div className="form-row">
        <Field label="Full name" error={errors.fullName} htmlFor="a-name"><input id="a-name" className="input" autoComplete="name" value={value.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} /></Field>
        <Field label="Mobile number" error={errors.phone} htmlFor="a-phone"><input id="a-phone" className="input" inputMode="tel" autoComplete="tel-national" maxLength={14} value={value.phone} onChange={set('phone')} placeholder="10-digit number" aria-invalid={!!errors.phone} /></Field>
      </div>
      <Field label="Address line 1" error={errors.line1} htmlFor="a-l1"><input id="a-l1" className="input" autoComplete="address-line1" value={value.line1} onChange={set('line1')} placeholder="House / flat, street" aria-invalid={!!errors.line1} /></Field>
      <Field label="Address line 2 (optional)" htmlFor="a-l2"><input id="a-l2" className="input" autoComplete="address-line2" value={value.line2} onChange={set('line2')} placeholder="Landmark, area" /></Field>
      <div className="form-row">
        <Field label="City" error={errors.city} htmlFor="a-city"><input id="a-city" className="input" autoComplete="address-level2" value={value.city} onChange={set('city')} aria-invalid={!!errors.city} /></Field>
        <Field label="State" error={errors.state} htmlFor="a-state"><input id="a-state" className="input" list="states" autoComplete="address-level1" value={value.state} onChange={set('state')} aria-invalid={!!errors.state} /><datalist id="states">{STATES.map((s) => <option key={s} value={s} />)}</datalist></Field>
      </div>
      <div className="form-row">
        <Field label="PIN code" error={errors.pincode} htmlFor="a-pin"><input id="a-pin" className="input" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={value.pincode} onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '') })} aria-invalid={!!errors.pincode} /></Field>
        <Field label="Label" htmlFor="a-label"><select id="a-label" className="select" value={value.label} onChange={set('label')}>{['Home', 'Work', 'Other'].map((l) => <option key={l}>{l}</option>)}</select></Field>
      </div>
    </div>
  );
}

const luhn = (digits) => { let sum = 0; let alt = false; for (let i = digits.length - 1; i >= 0; i--) { let n = +digits[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; } return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0; };
const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

function validatePayment(method, p) {
  const e = {};
  if (method === 'upi' && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(p.upiId.trim())) e.upiId = 'Enter a valid UPI ID, e.g. name@upi.';
  if (method === 'card') {
    if (!luhn(p.cardNumber.replace(/\D/g, ''))) e.cardNumber = 'Enter a valid card number (try 4242 4242 4242 4242).';
    if (p.cardName.trim().length < 2) e.cardName = 'Enter the name on the card.';
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(p.expiry);
    if (!m || new Date(2000 + Number(m[2]), Number(m[1]), 1) <= new Date()) e.expiry = 'Enter a valid future expiry (MM/YY).';
    if (!/^\d{3,4}$/.test(p.cvv)) e.cvv = 'Enter the 3 or 4 digit CVV.';
  }
  return e;
}

export default function Checkout() {
  const nav = useNavigate();
  const cart = useCart();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(2);
  const [addrId, setAddrId] = useState(user.addresses.find((a) => a.isDefault)?.id || user.addresses[0]?.id || 'new');
  const [newAddr, setNewAddr] = useState({ ...EMPTY_ADDR, fullName: user.name, phone: user.profile?.phone || '' });
  const [saveAddr, setSaveAddr] = useState(true);
  const [addrErr, setAddrErr] = useState({});
  const [method, setMethod] = useState('cod');
  const [pay, setPay] = useState({ upiId: '', cardNumber: '', cardName: user.name, expiry: '', cvv: '' });
  const [payErr, setPayErr] = useState({});
  const [placing, setPlacing] = useState(false);
  const [formErr, setFormErr] = useState('');

  const items = cart.items;
  const p = cart.pricing;
  const savedAddr = user.addresses.find((a) => a.id === addrId);
  const address = addrId === 'new' ? newAddr : savedAddr;

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);
  if (cart.loading && !items.length) return <PageLoading />;
  if (!items.length) { return (<div className="container section"><div className="empty"><h3>Your cart is empty</h3><Link to="/shop" className="btn btn-primary">Shop plants</Link></div></div>); }

  const goAddress = async () => {
    if (addrId === 'new') {
      const e = validateAddress(newAddr);
      setAddrErr(e);
      if (Object.keys(e).length) return;
      if (saveAddr) {
        try {
          const r = await api.post('/auth/addresses', { ...newAddr, isDefault: !user.addresses.length });
          setUser(r.user);
          const created = r.user.addresses[r.user.addresses.length - 1];
          if (created) setAddrId(created.id);
        } catch (err) { toast.error(errorMessage(err)); return; }
      }
    }
    setStep(3);
  };

  const goPayment = () => {
    if (p.hasStockIssues) { toast.error('Please review the stock issues in your cart first.'); return; }
    setStep(4);
  };
  const goReview = () => {
    const e = validatePayment(method, pay);
    setPayErr(e);
    if (Object.keys(e).length) return;
    setStep(5);
  };

  const place = async () => {
    setPlacing(true); setFormErr('');
    try {
      const body = {
        shippingAddress: { fullName: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode, label: address.label },
        paymentMethod: method,
        payment: method === 'upi' ? { upiId: pay.upiId.trim() } : method === 'card' ? { cardNumber: pay.cardNumber, cardName: pay.cardName, expiry: pay.expiry, cvv: pay.cvv } : {},
        coupon: cart.coupon,
      };
      const r = await api.post('/orders', body);
      await cart.refresh();
      toast.rewards(r.rewards);
      nav(`/order-confirmation/${r.order.orderNumber}`, { replace: true, state: { order: r.order } });
    } catch (err) {
      setFormErr(errorMessage(err));
      if (err.status === 402) { setPayErr(err.errors || {}); setStep(4); }
      else if (err.status === 400 && err.errors && Object.keys(err.errors).some((k) => ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'].includes(k))) { setAddrErr(err.errors); setAddrId('new'); setStep(2); }
      else if (err.status === 400 && err.errors) { setPayErr(err.errors); setStep(4); }
      else if (err.status === 409) cart.refresh();
    } finally { setPlacing(false); }
  };

  const est = new Date(Date.now() + 5 * 86400000);

  return (
    <div className="container section tight">
      <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)' }}>Checkout</h1>
      <Stepper current={step} />
      <div className="cart-layout">
        <div className="card pad checkout-main">
          {formErr && <div className="form-error" role="alert"><AlertTriangle size={18} /><div>{formErr}{formErr.toLowerCase().includes('stock') || formErr.toLowerCase().includes('sold out') || formErr.toLowerCase().includes('available') ? <> <Link to="/cart"><b>Review cart</b></Link></> : null}</div></div>}

          {step === 2 && (
            <section aria-labelledby="st-addr">
              <h2 id="st-addr" style={{ fontSize: '1.5rem' }}>Where should we deliver?</h2>
              <div className="stack" style={{ marginBottom: 16 }}>
                {user.addresses.map((a) => (
                  <label key={a.id} className={`option-card${addrId === a.id ? ' is-on' : ''}`}>
                    <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                    <div><strong>{a.fullName}</strong> <span className="chip">{a.label}</span>{a.isDefault && <span className="chip dark">Default</span>}<br /><span className="small muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode} · {a.phone}</span></div>
                  </label>
                ))}
                <label className={`option-card${addrId === 'new' ? ' is-on' : ''}`}>
                  <input type="radio" name="addr" checked={addrId === 'new'} onChange={() => setAddrId('new')} />
                  <div><strong><Plus size={15} style={{ verticalAlign: '-2px' }} /> Use a new address</strong></div>
                </label>
              </div>
              {addrId === 'new' && (
                <div className="panel">
                  <AddressForm value={newAddr} onChange={setNewAddr} errors={addrErr} />
                  <label className="check"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /><span>Save this address to my profile</span></label>
                </div>
              )}
              <div className="checkout-nav"><Link to="/cart" className="btn btn-ghost"><ArrowLeft size={16} /> Back to cart</Link><button className="btn btn-primary" onClick={goAddress}>Continue to delivery <ArrowRight size={16} /></button></div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="st-del">
              <h2 id="st-del" style={{ fontSize: '1.5rem' }}>Delivery &amp; offers</h2>
              <label className="option-card is-on"><input type="radio" checked readOnly /><div><strong>Standard delivery</strong> <span className="chip ok">{p.shipping > 0 ? formatINR(p.shipping) : 'Free'}</span><br /><span className="small muted">Estimated arrival by <b>{formatDate(est, { weekday: 'short', day: 'numeric', month: 'short' })}</b>. Plants are packed upright with moisture protection.</span></div></label>
              {p.freeShippingRemaining > 0 && <p className="small muted"><Truck size={14} style={{ verticalAlign: '-2px' }} /> Add {formatINR(p.freeShippingRemaining)} more to get free shipping. <Link to="/shop"><b>Keep shopping</b></Link></p>}
              <h3 style={{ fontSize: '1.15rem', marginTop: 22 }}>Items in this order</h3>
              <ul className="mini-lines">{items.map((it) => <li key={`${it.productId}|${it.kitId || ''}`}><SmartImage src={it.product.image} alt="" width="52" height="52" /><span>{it.product.name}{it.kitName ? <small className="muted"> · {it.kitName}</small> : null}<small className="muted"> × {it.quantity}</small></span><strong>{formatINR(it.lineTotal)}</strong></li>)}</ul>
              <CouponBox />
              <div className="checkout-nav"><button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Address</button><button className="btn btn-primary" onClick={goPayment}>Continue to payment <ArrowRight size={16} /></button></div>
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="st-pay">
              <h2 id="st-pay" style={{ fontSize: '1.5rem' }}>Payment method</h2>
              <div className="alert warn" style={{ marginBottom: 16 }}><ShieldCheck size={18} /><span><b>Demo payments.</b> No real money is charged and card details are never stored. Use <b>4242 4242 4242 4242</b> with any future expiry and CVV for a successful card payment, or a UPI ID like <b>name@upi</b>. (A card ending 0002 or a UPI ID ending in @fail simulates a declined payment.)</span></div>
              <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="sr-only">Choose how to pay</legend>
                {[['cod', 'Cash on Delivery', 'Pay in cash when your order arrives.', Banknote], ['upi', 'UPI (mock)', 'Pay with any UPI ID.', Smartphone], ['card', 'Credit / Debit card (mock)', 'Visa, Mastercard and others.', CreditCard]].map(([v, t, d, Icon]) => (
                  <label key={v} className={`option-card${method === v ? ' is-on' : ''}`}>
                    <input type="radio" name="pay" checked={method === v} onChange={() => { setMethod(v); setPayErr({}); }} />
                    <Icon size={22} /><div><strong>{t}</strong><br /><span className="small muted">{d}</span></div>
                  </label>
                ))}
              </fieldset>
              {method === 'upi' && <div className="panel" style={{ marginTop: 16 }}><Field label="UPI ID" error={payErr.upiId} htmlFor="p-upi" hint="Example: yourname@upi"><input id="p-upi" className="input" autoComplete="off" value={pay.upiId} onChange={(e) => setPay({ ...pay, upiId: e.target.value })} aria-invalid={!!payErr.upiId} /></Field></div>}
              {method === 'card' && (
                <div className="panel" style={{ marginTop: 16 }}>
                  <Field label="Card number" error={payErr.cardNumber} htmlFor="p-num"><input id="p-num" className="input" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={pay.cardNumber} onChange={(e) => setPay({ ...pay, cardNumber: fmtCard(e.target.value) })} aria-invalid={!!payErr.cardNumber} /></Field>
                  <Field label="Name on card" error={payErr.cardName} htmlFor="p-name"><input id="p-name" className="input" autoComplete="cc-name" value={pay.cardName} onChange={(e) => setPay({ ...pay, cardName: e.target.value })} aria-invalid={!!payErr.cardName} /></Field>
                  <div className="form-row">
                    <Field label="Expiry (MM/YY)" error={payErr.expiry} htmlFor="p-exp"><input id="p-exp" className="input" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" value={pay.expiry} onChange={(e) => setPay({ ...pay, expiry: fmtExp(e.target.value) })} aria-invalid={!!payErr.expiry} /></Field>
                    <Field label="CVV" error={payErr.cvv} htmlFor="p-cvv"><input id="p-cvv" className="input" inputMode="numeric" autoComplete="cc-csc" maxLength={4} type="password" value={pay.cvv} onChange={(e) => setPay({ ...pay, cvv: e.target.value.replace(/\D/g, '') })} aria-invalid={!!payErr.cvv} /></Field>
                  </div>
                  <p className="xs muted" style={{ margin: 0 }}><Lock size={12} style={{ verticalAlign: '-1px' }} /> Card details are only used for this mock validation and are not stored.</p>
                </div>
              )}
              <div className="checkout-nav"><button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft size={16} /> Delivery</button><button className="btn btn-primary" onClick={goReview}>Review order <ArrowRight size={16} /></button></div>
            </section>
          )}

          {step === 5 && address && (
            <section aria-labelledby="st-rev">
              <h2 id="st-rev" style={{ fontSize: '1.5rem' }}>Review &amp; place order</h2>
              <div className="review-grid">
                <div className="panel"><h4>Deliver to</h4><p className="small" style={{ margin: 0 }}><b>{address.fullName}</b><br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.state} {address.pincode}<br />{address.phone}</p><button className="btn-link small" onClick={() => setStep(2)}>Change</button></div>
                <div className="panel"><h4>Payment</h4><p className="small" style={{ margin: 0 }}>{method === 'cod' ? 'Cash on Delivery' : method === 'upi' ? `UPI · ${pay.upiId}` : `Card ending ${pay.cardNumber.replace(/\D/g, '').slice(-4)}`}</p><button className="btn-link small" onClick={() => setStep(4)}>Change</button></div>
                <div className="panel"><h4>Delivery</h4><p className="small" style={{ margin: 0 }}>Standard · arrives by {formatDate(est, { weekday: 'short', day: 'numeric', month: 'short' })}</p></div>
              </div>
              <ul className="mini-lines">{items.map((it) => <li key={`${it.productId}|${it.kitId || ''}`}><SmartImage src={it.product.image} alt="" width="52" height="52" /><span>{it.product.name}<small className="muted"> × {it.quantity}</small></span><strong>{formatINR(it.lineTotal)}</strong></li>)}</ul>
              <div className="checkout-nav"><button className="btn btn-ghost" onClick={() => setStep(4)}><ArrowLeft size={16} /> Payment</button><button className="btn btn-primary btn-lg" onClick={place} disabled={placing}>{placing ? 'Placing order…' : `Place order · ${formatINR(p.total)}`}</button></div>
              <p className="xs muted center" style={{ marginTop: 12 }}>By placing your order you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
            </section>
          )}
        </div>
        <aside className="cart-summary card pad" aria-label="Order summary">
          <h2 style={{ fontSize: '1.3rem' }}>Summary</h2>
          <p className="small muted">{p.itemCount} {p.itemCount === 1 ? 'item' : 'items'}</p>
          <PriceSummary pricing={p} />
        </aside>
      </div>
    </div>
  );
}

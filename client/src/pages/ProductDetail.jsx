import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Droplets, Heart, Leaf, Ruler, ShieldCheck, ShoppingBag, Sparkles, Sprout, Sun, Thermometer, Truck, Wind, Zap, Flower2, CircleAlert, Package, Clock } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import AddToGardenModal from '../components/AddToGardenModal.jsx';
import { Breadcrumbs, EmptyState, ErrorState, PageLoading, PetBadge, QtyStepper, SmartImage, StarInput, Stars, Field } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { RECENT_VIEWED, pushToList, useLocalList } from '../hooks/useLocalList.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, LIGHT_LABEL, ROOM_LABEL, TYPE_LABEL, formatDate, formatINR, stockLabel } from '../utils/format.js';

function Gallery({ images, name }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [images]);
  const labels = ['Product view', 'Close-up', 'In a room'];
  const onKey = (e) => { if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length); if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length); };
  return (
    <div className="gallery" onKeyDown={onKey}>
      <div className="gallery-main card"><SmartImage src={images[i]} alt={`${name} – ${labels[i] || 'view ' + (i + 1)}`} width="900" height="900" eager /></div>
      {images.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Product images">
          {images.map((src, n) => (
            <button key={src} role="tab" aria-selected={n === i} className={n === i ? 'is-on' : ''} onClick={() => setI(n)} aria-label={`Show ${labels[n] || 'image ' + (n + 1)}`}><SmartImage src={src} alt="" width="120" height="120" /></button>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  if (!value) return null;
  return <div className="fact"><Icon size={20} /><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Reviews({ product, onRated }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi((signal) => api.get(`/products/${product.slug}/reviews`, null, { signal }), [product.slug]);
  const mine = data?.reviews.find((r) => user && r.user === user.id);
  const [form, setForm] = useState({ rating: 0, title: '', comment: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (mine) setForm({ rating: mine.rating, title: mine.title || '', comment: mine.comment }); }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.rating) er.rating = 'Choose a star rating.';
    if (form.comment.trim().length < 5) er.comment = 'Tell us a little more (at least 5 characters).';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = await api.post(`/products/${product.slug}/reviews`, form);
      setData(r);
      onRated?.(r);
      toast.success(mine ? 'Your review was updated.' : 'Thanks for your review!');
      toast.rewards(r.rewards);
    } catch (err) { setErrs({ ...(err.errors || {}), form: errorMessage(err) }); } finally { setBusy(false); }
  };

  return (
    <div className="reviews">
      <div className="reviews-summary card pad">
        <div className="big-rating"><strong>{product.rating.toFixed(1)}</strong><Stars value={product.rating} showValue={false} size={18} /><small>{product.numReviews} ratings</small></div>
        <p className="small muted" style={{ margin: 0 }}>Ratings and the reviews marked “Sample” are demo data created for this store; they are not from real customers. Reviews you write while signed in are saved to the database.</p>
      </div>
      <div className="reviews-grid">
        <div className="stack">
          {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <div className="skeleton" style={{ height: 120 }} /> : data.reviews.length === 0 ? (
            <EmptyState icon={Sparkles} title="No written reviews yet" text="Be the first to share how this one is doing in your home." />
          ) : data.reviews.map((r) => (
            <article key={r.id} className="card pad-sm review">
              <div className="row between"><Stars value={r.rating} showValue={false} size={15} /><span className="xs muted">{formatDate(r.createdAt)}</span></div>
              {r.title && <h4>{r.title}</h4>}
              <p>{r.comment}</p>
              <div className="row wrap" style={{ gap: 8 }}>
                <strong className="small">{r.isSample ? 'Demo reviewer' : r.name}</strong>
                {r.isSample && <span className="chip beige">Sample review</span>}
                {r.verifiedPurchase && <span className="chip ok"><Check size={12} />Verified purchase</span>}
              </div>
            </article>
          ))}
        </div>
        <form className="card pad review-form" onSubmit={submit} noValidate>
          <h3 style={{ fontSize: '1.2rem' }}>{mine ? 'Edit your review' : 'Write a review'}</h3>
          {!user ? (
            <p className="muted small">Please <Link to="/login" state={{ from: `/product/${product.slug}` }}><b>sign in</b></Link> to review this product.</p>
          ) : (
            <>
              {errs.form && <div className="form-error" role="alert">{errs.form}</div>}
              <Field label="Your rating" error={errs.rating}><StarInput value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} /></Field>
              <Field label="Title (optional)" htmlFor="rv-title"><input id="rv-title" className="input" maxLength={80} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
              <Field label="Your review" error={errs.comment} htmlFor="rv-comment"><textarea id="rv-comment" className="textarea" maxLength={1000} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} aria-invalid={!!errs.comment} /></Field>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : mine ? 'Update review' : 'Submit review'}</button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const wish = useWishlist();
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useApi((signal) => api.get(`/products/${slug}`, null, { signal }), [slug]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('overview');
  const [gardenOpen, setGardenOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const viewed = useLocalList(RECENT_VIEWED, 10);

  const p = data?.product;
  useEffect(() => { setQty(1); setTab('overview'); window.scrollTo({ top: 0 }); }, [slug]);
  useEffect(() => { if (p?.id) pushToList(RECENT_VIEWED, p.id, 10); }, [p?.id]);
  useEffect(() => { if (p) document.title = `${p.name} – Plantify`; return () => { document.title = 'Plantify – Find your plant. Grow your space. Keep it thriving.'; }; }, [p]);

  const recentIds = viewed.list.filter((id) => id !== p?.id).slice(0, 4);
  const recent = useApi((signal) => api.get('/products', { ids: recentIds }, { signal }), [recentIds.join(',')], { enabled: recentIds.length > 0 });

  if (loading && !data) return <PageLoading />;
  if (error) return <div className="container section"><ErrorState title={error.includes('find that product') ? 'Product not found' : 'We hit a snag'} message={error} onRetry={reload} /></div>;
  if (!p) return null;

  const inCart = cart.inCart(p.id);
  const max = Math.max(0, p.stock - inCart);
  const out = p.stock <= 0;
  const liked = wish.has(p.id);
  const isPlant = p.isPlant;
  const isKit = p.category === 'plant-kits';
  const cartProduct = { id: p.id, name: p.name, stock: p.stock };

  const addToCart = async () => { setBusy(true); const ok = await cart.add(cartProduct, qty); setBusy(false); return ok; };
  const buyNow = async () => { setBusy(true); const ok = await cart.add(cartProduct, qty, { silent: true }); setBusy(false); if (ok) nav('/cart'); };
  const tabs = [['overview', 'Overview'], ...(isPlant ? [['care', 'Care guide']] : []), ...(isKit ? [['box', 'What’s inside']] : []), ['compat', isKit ? 'Good to know' : 'Pairs well with'], ['reviews', `Reviews (${p.numReviews})`]];

  return (
    <div className="container pd">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: CATEGORY_LABEL[p.category] || p.category, to: `/shop?category=${p.category}` }, { label: p.name }]} />
      <div className="pd-top">
        <Gallery images={p.gallery?.length ? p.gallery : [p.image]} name={p.name} />
        <div className="pd-info">
          <span className="eyebrow">{p.subcategory || CATEGORY_LABEL[p.category]}</span>
          <h1>{p.name}</h1>
          {p.botanicalName && <p className="botanical">{p.botanicalName}</p>}
          <div className="row wrap" style={{ gap: 14 }}>
            <Stars value={p.rating} count={p.numReviews} />
            <button className="btn-link small" onClick={() => { setTab('reviews'); document.getElementById('pd-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}>Read reviews</button>
          </div>
          <p className="pd-short">{p.shortDescription}</p>
          <div className="pd-price">
            <strong>{formatINR(p.price)}</strong>
            {p.originalPrice > p.price && <><s>{formatINR(p.originalPrice)}</s><span className="chip dark">{p.discountPercent}% off</span></>}
          </div>
          {p.originalPrice > p.price && <p className="small ok-text">You save {formatINR(p.originalPrice - p.price)}</p>}
          <p className={`stock ${out ? 'out' : p.stock <= 5 ? 'low' : 'in'}`}>{out ? <CircleAlert size={16} /> : <Check size={16} />}{stockLabel(p.stock)}{inCart > 0 && !out && <span className="muted"> · {inCart} in your cart</span>}</p>

          <div className="pd-tags">
            {isPlant && <span className="chip"><Sprout size={13} />{DIFFICULTY_LABEL[p.difficulty]} care</span>}
            {isPlant && <span className="chip beige"><Sun size={13} />{LIGHT_LABEL[p.light]}</span>}
            {isPlant && <PetBadge status={p.petSafe} />}
            {isPlant && p.placement !== 'na' && <span className="chip info">{p.placement === 'both' ? 'Indoor / outdoor' : p.placement === 'indoor' ? 'Indoor' : 'Outdoor'}</span>}
            {isPlant && p.plantType && <span className="chip">{TYPE_LABEL[p.plantType]}</span>}
          </div>

          <div className="pd-buy">
            <QtyStepper value={Math.min(qty, Math.max(1, max))} onChange={setQty} max={Math.max(1, max)} />
            <button className="btn btn-primary btn-lg" onClick={addToCart} disabled={out || max <= 0 || busy}><ShoppingBag size={18} />{out ? 'Out of stock' : max <= 0 ? 'Max in cart' : 'Add to cart'}</button>
            <button className={`icon-btn neu${liked ? ' is-on' : ''}`} style={{ width: 52, height: 52, color: liked ? '#c2403d' : undefined }} onClick={() => wish.toggle(p)} aria-pressed={liked} aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={22} fill={liked ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="row wrap">
            <button className="btn btn-secondary" onClick={buyNow} disabled={out || max <= 0 || busy}><Zap size={16} /> Buy now</button>
            {isPlant && (user ? <button className="btn btn-ghost" onClick={() => setGardenOpen(true)}><Leaf size={16} /> Add to My Garden</button> : <Link className="btn btn-ghost" to="/login" state={{ from: `/product/${p.slug}`, notice: 'Sign in to track this plant in My Garden.' }}><Leaf size={16} /> Track in My Garden</Link>)}
          </div>

          <ul className="pd-assure">
            <li><Truck size={18} /> Free shipping over ₹999 · delivered in about 5 days</li>
            <li><ShieldCheck size={18} /> Packed with care – plants arrive with care instructions</li>
          </ul>
          {isPlant && (
            <div className={`pet-card ${p.petSafe}`}>
              <strong><PetBadge status={p.petSafe} /></strong>
              <p className="small" style={{ margin: '6px 0 0' }}>{p.petNote || 'We could not confirm pet safety for this plant – keep it away from pets and check with your vet.'}</p>
              <p className="xs muted" style={{ margin: '6px 0 0' }}>Based on commonly published toxicity lists (e.g. ASPCA). Always check with your vet if a pet eats a plant.</p>
            </div>
          )}
        </div>
      </div>

      <div id="pd-tabs" className="pd-tabs">
        <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>

        <div className="pd-panel" role="tabpanel">
          {tab === 'overview' && (
            <div className="pd-overview">
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>About this {isPlant ? 'plant' : 'product'}</h2>
                <p>{p.description}</p>
                {p.tags?.length > 0 && <div className="row wrap" style={{ gap: 6 }}>{p.tags.map((t) => <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="chip beige">{t}</Link>)}</div>}
                {!isPlant && p.supply && Object.keys(p.supply).length > 1 && (
                  <dl className="kv" style={{ marginTop: 18 }}>
                    {p.supply.material && <><dt>Material</dt><dd>{p.supply.material}</dd></>}
                    {p.supply.diameterMinCm && <><dt>Pot size</dt><dd>{p.supply.diameterMinCm}–{p.supply.diameterMaxCm} cm</dd></>}
                    {p.supply.hasDrainage !== undefined && p.supply.hasDrainage !== null && <><dt>Drainage holes</dt><dd>{p.supply.hasDrainage ? 'Yes' : 'No – use with a nursery pot inside'}</dd></>}
                    {p.supply.suitableFor?.length > 0 && <><dt>Suited to</dt><dd>{p.supply.suitableFor.join(', ')}</dd></>}
                  </dl>
                )}
              </div>
              {isPlant && (
                <div className="facts">
                  <Fact icon={Sprout} label="Difficulty" value={DIFFICULTY_LABEL[p.difficulty]} />
                  <Fact icon={Sun} label="Light" value={p.lightTolerance?.length ? p.lightTolerance.map((l) => LIGHT_LABEL[l]).join(' · ') : LIGHT_LABEL[p.light]} />
                  <Fact icon={Droplets} label="Watering" value={p.watering?.label} />
                  <Fact icon={Wind} label="Humidity" value={p.humidity && p.humidity[0].toUpperCase() + p.humidity.slice(1)} />
                  <Fact icon={Thermometer} label="Temperature" value={p.temperature ? `${p.temperature.minC}–${p.temperature.maxC} °C` : ''} />
                  <Fact icon={Ruler} label="Mature size" value={p.matureSize?.label} />
                  <Fact icon={Flower2} label="Growth rate" value={p.growthRate && p.growthRate[0].toUpperCase() + p.growthRate.slice(1)} />
                  <Fact icon={Clock} label="Care time" value={p.careTime && ({ minimal: 'A few minutes a week', moderate: 'About 30 min a week', dedicated: 'An hour or more a week' }[p.careTime] || p.careTime)} />
                  <Fact icon={Package} label="Best rooms" value={p.rooms?.map((r) => ROOM_LABEL[r] || r).join(', ')} />
                </div>
              )}
            </div>
          )}

          {tab === 'care' && isPlant && (
            <div className="care-grid">
              {[['Watering', Droplets, p.care?.watering], ['Light', Sun, p.care?.light], ['Soil', Leaf, p.care?.soil], ['Fertiliser', Sprout, p.care?.fertilizer], ['Humidity', Wind, p.care?.humidity], ['Temperature', Thermometer, p.care?.temperature], ['Repotting', Package, p.care?.repotting], ['Pruning & cleaning', Sparkles, p.care?.pruning]].filter((x) => x[2]).map(([t, I, text]) => (
                <div key={t} className="card pad-sm care-item"><I size={22} /><div><h4>{t}</h4><p className="small">{text}</p></div></div>
              ))}
              {p.care?.tips?.length > 0 && <div className="card pad-sm care-item wide"><Sparkles size={22} /><div><h4>Good to know</h4><ul className="tips">{p.care.tips.map((t) => <li key={t}>{t}</li>)}</ul></div></div>}
              <p className="small muted wide">Want reminders? <Link to="/garden"><b>Add it to My Garden</b></Link> and the Care Calendar schedules these tasks for you. Or <Link to="/plant-care/sos"><b>run Plant SOS</b></Link> if it looks unwell.</p>
            </div>
          )}

          {tab === 'box' && isKit && (
            <div className="grid cols-2">
              {data.kitContents.map((k) => (
                <Link key={k.product.id} to={`/product/${k.product.slug}`} className="card pad-sm kit-item"><SmartImage src={k.product.image} alt="" width="80" height="80" /><div><strong>{k.product.name}</strong><div className="small muted">× {k.quantity} · {formatINR(k.product.price)} each</div></div></Link>
              ))}
              <p className="small muted" style={{ gridColumn: '1/-1' }}>The kit is priced lower than buying each item separately. Kit stock is tracked separately from single items.</p>
            </div>
          )}

          {tab === 'compat' && (
            <div>
              {p.compatibility?.notes && <div className="alert info" style={{ marginBottom: 20 }}><Sparkles size={18} /><span>{p.compatibility.notes}</span></div>}
              {data.compatible.length ? <div className="product-grid">{data.compatible.map((c) => <ProductCard key={c.id} product={c} />)}</div> : <p className="muted">No specific pairings listed.</p>}
              {isPlant && <p style={{ marginTop: 20 }}>Planning a shelf? Try the <Link to="/plant-care/compatibility"><b>Compatibility Checker</b></Link> to see if two or more plants can share a spot or pot.</p>}
            </div>
          )}

          {tab === 'reviews' && <Reviews product={p} onRated={(r) => setData((d) => ({ ...d, product: { ...d.product, rating: r.rating, numReviews: r.numReviews } }))} />}
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="pd-section" aria-labelledby="rel-title"><h2 id="rel-title">You may also like</h2><div className="product-grid">{data.related.map((r) => <ProductCard key={r.id} product={r} />)}</div></section>
      )}
      {recent.data?.products.length > 0 && (
        <section className="pd-section" aria-labelledby="rec-title"><h2 id="rec-title">Recently viewed</h2><div className="product-grid">{recent.data.products.map((r) => <ProductCard key={r.id} product={r} />)}</div></section>
      )}
      {isPlant && <AddToGardenModal open={gardenOpen} onClose={() => setGardenOpen(false)} product={p} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search, Sprout } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { Breadcrumbs, EmptyState, ErrorState, Pagination, ProductGridSkeleton } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, LIGHT_LABEL, PET_LABEL, ROOM_LABEL, TYPE_LABEL, formatINR } from '../utils/format.js';

const SORTS = [
  ['featured', 'Featured'], ['popularity', 'Popularity'], ['rating', 'Top rated'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'],
];
const PRICE_PRESETS = [['Under ₹300', '', 300], ['₹300 – ₹600', 300, 600], ['₹600 – ₹1,000', 600, 1000], ['Over ₹1,000', 1000, '']];

function CheckGroup({ legend, options, selected, onToggle, counts }) {
  return (
    <fieldset className="filter-group">
      <legend>{legend}</legend>
      {options.map(([value, label]) => (
        <label key={value} className="check">
          <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
          <span>{label}{counts && counts[value] !== undefined && <small className="muted"> ({counts[value]})</small>}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useState(false);
  const cats = useApi((signal) => api.get('/categories', null, { signal }), []);

  const get = (k) => sp.get(k) || '';
  const list = (k) => (sp.get(k) ? sp.get(k).split(',').filter(Boolean) : []);
  const update = (patch) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: false });
  };
  const toggle = (k, value) => { const cur = list(k); update({ [k]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] }); };

  const [minP, setMinP] = useState(get('minPrice'));
  const [maxP, setMaxP] = useState(get('maxPrice'));
  useEffect(() => { setMinP(get('minPrice')); setMaxP(get('maxPrice')); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const applyPrice = (e) => {
    e?.preventDefault();
    let a = minP === '' ? '' : Math.max(0, Number(minP));
    let b = maxP === '' ? '' : Math.max(0, Number(maxP));
    if (a !== '' && b !== '' && a > b) [a, b] = [b, a];
    update({ minPrice: a, maxPrice: b });
  };

  const query = Object.fromEntries([...sp.entries()].filter(([k]) => k !== 'page'));
  const page = Number(get('page')) || 1;
  const { data, loading, error, reload } = useApi((signal) => api.get('/products', { ...query, page, limit: 12 }, { signal }), [sp.toString()]);

  const activeChips = useMemo(() => {
    const chips = [];
    list('category').forEach((c) => chips.push([`Category: ${CATEGORY_LABEL[c] || c}`, () => toggle('category', c)]));
    list('plantType').forEach((c) => chips.push([TYPE_LABEL[c] || c, () => toggle('plantType', c)]));
    list('difficulty').forEach((c) => chips.push([`${DIFFICULTY_LABEL[c] || c} care`, () => toggle('difficulty', c)]));
    list('light').forEach((c) => chips.push([LIGHT_LABEL[c] || c, () => toggle('light', c)]));
    list('petSafe').forEach((c) => chips.push([PET_LABEL[c] || c, () => toggle('petSafe', c)]));
    if (get('placement')) chips.push([get('placement') === 'indoor' ? 'Indoor' : 'Outdoor', () => update({ placement: '' })]);
    if (get('room')) chips.push([`Room: ${ROOM_LABEL[get('room')] || get('room')}`, () => update({ room: '' })]);
    if (get('minPrice') || get('maxPrice')) chips.push([`${get('minPrice') ? formatINR(get('minPrice')) : '₹0'} – ${get('maxPrice') ? formatINR(get('maxPrice')) : 'any'}`, () => update({ minPrice: '', maxPrice: '' })]);
    if (get('minRating')) chips.push([`${get('minRating')}★ & up`, () => update({ minRating: '' })]);
    if (get('inStock')) chips.push(['In stock', () => update({ inStock: '' })]);
    if (get('beginner')) chips.push(['Beginner-friendly', () => update({ beginner: '' })]);
    if (get('featured')) chips.push(['Featured', () => update({ featured: '' })]);
    if (get('search')) chips.push([`Search: “${get('search')}”`, () => update({ search: '' })]);
    return chips;
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => setSp(new URLSearchParams());
  const catList = cats.data?.categories || [];
  const counts = Object.fromEntries(catList.map((c) => [c.slug, c.productCount]));
  const singleCat = list('category').length === 1 ? list('category')[0] : null;
  const title = singleCat ? CATEGORY_LABEL[singleCat] || 'Shop' : get('room') ? `${ROOM_LABEL[get('room')] || 'Room'} plants` : get('beginner') ? 'Beginner-friendly plants' : 'Shop all';
  const desc = singleCat ? catList.find((c) => c.slug === singleCat)?.description : 'Plants, seeds, pots, tools and everything to help them thrive.';

  const filters = (
    <div className="filters">
      <div className="row between filters-head">
        <h2>Filters</h2>
        <button className="icon-btn filters-close" onClick={() => setOpen(false)} aria-label="Close filters"><X size={22} /></button>
      </div>
      <CheckGroup legend="Category" options={catList.map((c) => [c.slug, c.name])} selected={list('category')} onToggle={(v) => toggle('category', v)} counts={data?.facets?.categoryCounts || counts} />
      <fieldset className="filter-group">
        <legend>Price (₹)</legend>
        <form className="price-form" onSubmit={applyPrice}>
          <input className="input" type="number" min="0" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={minP} onChange={(e) => setMinP(e.target.value)} />
          <span>–</span>
          <input className="input" type="number" min="0" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
          <button className="btn btn-secondary btn-sm" type="submit">Go</button>
        </form>
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {PRICE_PRESETS.map(([label, a, b]) => <button key={label} type="button" className={`chip${String(get('minPrice')) === String(a) && String(get('maxPrice')) === String(b) ? ' is-on' : ''}`} onClick={() => update({ minPrice: a, maxPrice: b })}>{label}</button>)}
        </div>
      </fieldset>
      <CheckGroup legend="Plant type" options={Object.entries(TYPE_LABEL)} selected={list('plantType')} onToggle={(v) => toggle('plantType', v)} />
      <CheckGroup legend="Difficulty" options={[['easy', 'Easy'], ['moderate', 'Moderate'], ['hard', 'Expert']]} selected={list('difficulty')} onToggle={(v) => toggle('difficulty', v)} />
      <CheckGroup legend="Light it tolerates" options={[['low', 'Low light'], ['medium', 'Medium light'], ['bright-indirect', 'Bright indirect'], ['bright-direct', 'Direct sun']]} selected={list('light')} onToggle={(v) => toggle('light', v)} />
      <CheckGroup legend="Pet safety" options={[['safe', 'Pet-safe'], ['toxic', 'Toxic to pets'], ['unknown', 'Unknown']]} selected={list('petSafe')} onToggle={(v) => toggle('petSafe', v)} />
      <fieldset className="filter-group">
        <legend>Indoor / outdoor</legend>
        {[['', 'Any'], ['indoor', 'Indoor'], ['outdoor', 'Outdoor']].map(([v, l]) => (
          <label key={v} className="radio"><input type="radio" name="placement" checked={get('placement') === v} onChange={() => update({ placement: v })} /><span>{l}</span></label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend>Rating</legend>
        {[['', 'Any rating'], ['4', '4★ & up'], ['4.5', '4.5★ & up']].map(([v, l]) => (
          <label key={v} className="radio"><input type="radio" name="rating" checked={get('minRating') === v} onChange={() => update({ minRating: v })} /><span>{l}</span></label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend>More</legend>
        <label className="check"><input type="checkbox" checked={!!get('inStock')} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} /><span>In stock only</span></label>
        <label className="check"><input type="checkbox" checked={!!get('beginner')} onChange={(e) => update({ beginner: e.target.checked ? 'true' : '' })} /><span>Beginner-friendly</span></label>
      </fieldset>
      <div className="filters-foot">
        <button className="btn btn-ghost btn-block" onClick={clearAll} disabled={!activeChips.length}>Clear all filters</button>
        <button className="btn btn-primary btn-block filters-apply" onClick={() => setOpen(false)}>Show {data?.total ?? ''} results</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="container shop-head">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: singleCat ? '/shop' : undefined }, ...(singleCat ? [{ label: title }] : [])]} />
        <h1>{title}</h1>
        <p className="muted" style={{ maxWidth: '60ch' }}>{desc}</p>
      </div>
      <div className="container shop-layout">
        <aside className={`shop-filters${open ? ' open' : ''}`} aria-label="Filters">{filters}</aside>
        {open && <div className="filters-overlay" onClick={() => setOpen(false)} />}
        <section aria-label="Products" aria-busy={loading}>
          <div className="shop-bar">
            <button className="btn btn-secondary btn-sm shop-filter-btn" onClick={() => setOpen(true)}><SlidersHorizontal size={16} /> Filters{activeChips.length ? ` (${activeChips.length})` : ''}</button>
            <p className="shop-count" role="status" aria-live="polite">{loading ? 'Loading…' : data ? `${data.total} ${data.total === 1 ? 'product' : 'products'}${data.total ? ` · showing ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)}` : ''}` : ''}</p>
            <label className="shop-sort"><span className="sr-only">Sort by</span>
              <select className="select" value={get('sort') || (get('search') ? 'relevance' : 'featured')} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
                {get('search') && <option value="relevance">Best match</option>}
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          {activeChips.length > 0 && (
            <div className="active-chips" aria-label="Active filters">
              {activeChips.map(([label, remove]) => <button key={label} className="filter-chip" onClick={remove} aria-label={`Remove filter ${label}`}>{label}<X size={14} /></button>)}
              <button className="btn-link small" onClick={clearAll}>Clear all</button>
            </div>
          )}
          {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <ProductGridSkeleton count={8} /> : data.products.length === 0 ? (
            <EmptyState icon={Search} title="No products match those filters" text="Try removing a filter or two, or widen the price range.">
              <button className="btn btn-primary" onClick={clearAll}>Clear all filters</button>
              <Link to="/matchmaker" className="link-arrow"><Sprout size={16} /> Or let the Plant Matchmaker choose</Link>
            </EmptyState>
          ) : (
            <>
              <div className={`product-grid shop-grid${loading ? ' is-loading' : ''}`}>{data.products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}</div>
              <Pagination page={data.page} pages={data.pages} onChange={(n) => { update({ page: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          )}
        </section>
      </div>
    </>
  );
}

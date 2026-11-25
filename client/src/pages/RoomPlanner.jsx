import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, LayoutGrid, Save, ShoppingBag, Sparkles, Sun, Trash2, X } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Field, PageHead, SmartImage } from '../components/ui.jsx';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LIGHT_LABEL, ROOM_LABEL, formatDate } from '../utils/format.js';

const STATUS = { great: ['ok', 'Great fit'], ok: ['warn', 'Okay fit'], poor: ['bad', 'Poor fit'] };
const SIDE_LABEL = { north: 'North', east: 'East', south: 'South', west: 'West' };
const LEVEL_SHORT = { low: 'Low', medium: 'Medium', 'bright-indirect': 'Bright indirect', 'bright-direct': 'Direct sun' };

export default function RoomPlanner() {
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const cfgQ = useApi((signal) => api.get('/planner/config', null, { signal }), []);
  const plantsQ = useApi((signal) => api.get('/care/plants', null, { signal }), []);
  const plansQ = useApi((signal) => api.get('/planner/plans', null, { signal }), [user?.id], { enabled: !!user });

  const [cfg, setCfg] = useState({ room: 'living-room', size: 'medium', windowSide: 'south', windowLight: 'bright-indirect' });
  const [placed, setPlaced] = useState([]); // [{ x, y, productId, name, image }]
  const [brush, setBrush] = useState(null);
  const [sel, setSel] = useState(null); // { x, y }
  const [result, setResult] = useState(null);
  const [evalErr, setEvalErr] = useState('');
  const [pets, setPets] = useState(user?.preferences?.pets || 'unspecified');
  const [experience, setExperience] = useState(user?.preferences?.experience || 'beginner');
  const [suggesting, setSuggesting] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [delPlan, setDelPlan] = useState(null);
  const [filter, setFilter] = useState('');

  const key = JSON.stringify([cfg, placed.map((p) => [p.x, p.y, p.productId])]);
  const dKey = useDebounced(key, 180);
  const seq = useRef(0);
  useEffect(() => {
    const [c, pl] = JSON.parse(dKey);
    const n = ++seq.current;
    api.post('/planner/evaluate', { ...c, placements: pl.map(([x, y, productId]) => ({ x, y, productId })) })
      .then((r) => { if (n === seq.current) { setResult(r); setEvalErr(''); } })
      .catch((e) => { if (n === seq.current) setEvalErr(errorMessage(e)); });
  }, [dKey]);

  const plants = plantsQ.data?.plants || [];
  const byId = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);
  const sizes = cfgQ.data?.sizes || [];
  const size = sizes.find((s) => s.value === cfg.size) || { cols: 7, rows: 5, capacity: 8 };
  const map = result?.map;
  const fits = useMemo(() => new Map((result?.placements || []).map((p) => [`${p.x},${p.y}`, p])), [result]);
  const at = (x, y) => placed.find((p) => p.x === x && p.y === y);

  const setC = (k) => (e) => {
    const v = e.target.value;
    setCfg((c) => ({ ...c, [k]: v }));
    if (k === 'size') {
      const s = sizes.find((x) => x.value === v);
      if (s) setPlaced((l) => l.filter((p) => p.x < s.cols && p.y < s.rows));
    }
  };

  const clickCell = (x, y) => {
    const here = at(x, y);
    if (!here && brush) {
      setPlaced((l) => [...l, { x, y, productId: brush.id, name: brush.name, image: brush.image }]);
      setSel({ x, y });
    } else setSel({ x, y });
  };
  const removeAt = (x, y) => { setPlaced((l) => l.filter((p) => !(p.x === x && p.y === y))); };

  const suggest = async () => {
    setSuggesting(true);
    try {
      const r = await api.post('/planner/suggest', { ...cfg, pets, experience });
      setPlaced(r.placements.map((p) => ({ x: p.x, y: p.y, productId: p.productId, name: p.name, image: p.image })));
      setPlanId(''); setSel(null);
      toast.success(r.placements.length ? `Placed ${r.placements.length} plants that suit this light.` : 'We could not find a good set for this room.');
    } catch (e) { toast.error(errorMessage(e)); } finally { setSuggesting(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!placed.length) { toast.error('Place at least one plant before saving.'); return; }
    if (planName.trim().length < 2) { toast.error('Give your plan a name.'); return; }
    setSaving(true);
    try {
      const r = await api.post('/planner/plans', { id: planId || undefined, name: planName.trim(), ...cfg, placements: placed.map((p) => ({ x: p.x, y: p.y, productId: p.productId })) });
      setPlanId(r.plan.id);
      toast.success(`Plan “${r.plan.name}” saved.`); toast.rewards(r.rewards);
      plansQ.reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setSaving(false); }
  };

  const loadPlan = (p) => {
    setCfg(p.config); setPlaced(p.placements.map((x) => ({ x: x.x, y: x.y, productId: x.productId, name: x.name, image: x.image })));
    setPlanId(p.id); setPlanName(p.name); setSel(null);
    toast.info(`Loaded “${p.name}”.`);
    document.getElementById('planner-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const removePlan = async () => {
    try { await api.del(`/planner/plans/${delPlan.id}`); if (planId === delPlan.id) setPlanId(''); toast.info('Plan deleted.'); plansQ.reload(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setDelPlan(null); }
  };

  const [cartBusy, setCartBusy] = useState(false);
  const addAllToCart = async () => {
    const counts = new Map();
    placed.forEach((p) => counts.set(p.productId, (counts.get(p.productId) || 0) + 1));
    setCartBusy(true);
    let ok = 0;
    for (const [id, qty] of counts) {
      const prod = byId.get(id);
      if (prod && (await cart.add(prod, qty, { silent: true }))) ok += 1;
    }
    setCartBusy(false);
    if (ok) toast.success(`${ok} ${ok === 1 ? 'plant' : 'plants'} from your plan added to the cart.`, { action: { to: '/cart', label: 'View cart' } });
  };

  const selPlaced = sel ? at(sel.x, sel.y) : null;
  const selCell = sel && map ? map.cells[sel.y]?.[sel.x] : null;
  const selFit = sel ? fits.get(`${sel.x},${sel.y}`) : null;
  const shown = plants.filter((p) => !filter.trim() || p.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const totalPrice = placed.reduce((s, p) => s + (byId.get(p.productId)?.price || 0), 0);

  if (cfgQ.error) return <div className="container section"><ErrorState message={cfgQ.error} onRetry={cfgQ.reload} /></div>;

  return (
    <>
      <PageHead eyebrow="Room planner" title="Place plants where they’ll thrive">Describe your room and window, then drop plants on the light map. We score each spot and flag anything that will struggle.</PageHead>
      <div className="container section tight">
        <div className="planner-layout">
          <div className="stack" style={{ gap: 20, minWidth: 0 }}>
            <section className="card pad" aria-label="Room settings">
              <div className="form-row four">
                <Field label="Room" htmlFor="rp-room"><select id="rp-room" className="select" value={cfg.room} onChange={setC('room')}>{(cfgQ.data?.rooms || Object.keys(ROOM_LABEL)).map((r) => <option key={r} value={r}>{ROOM_LABEL[r]}</option>)}</select></Field>
                <Field label="Room size" htmlFor="rp-size"><select id="rp-size" className="select" value={cfg.size} onChange={setC('size')}>{sizes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
                <Field label="Window is on the…" htmlFor="rp-side"><select id="rp-side" className="select" value={cfg.windowSide} onChange={setC('windowSide')}>{(cfgQ.data?.windowSides || Object.keys(SIDE_LABEL)).map((s) => <option key={s} value={s}>{SIDE_LABEL[s]} wall</option>)}</select></Field>
                <Field label="Light at the window" htmlFor="rp-light"><select id="rp-light" className="select" value={cfg.windowLight} onChange={setC('windowLight')}>{(cfgQ.data?.lightLevels || []).map((l) => <option key={l.value} value={l.value}>{LEVEL_SHORT[l.value]}</option>)}</select></Field>
              </div>
            </section>

            <section className="card pad" aria-label="Light map" id="planner-grid">
              <div className="row between wrap" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Light map</h2>
                <div className="row wrap xs">{Object.entries(LEVEL_SHORT).map(([k, l]) => <span key={k} className={`lvl-key lvl-${k}`}>{l}</span>)}</div>
              </div>
              {!map ? <div className="skeleton" style={{ height: 320 }} /> : (
                <div className={`plan-frame win-${cfg.windowSide}`}>
                  <div className="plan-window"><Sun size={14} /> Window ({SIDE_LABEL[cfg.windowSide]})</div>
                  <div className="plan-grid" style={{ '--cols': map.cols, '--rows': map.rows }} role="grid" aria-label={`Room grid, ${map.cols} by ${map.rows}`}>
                    {map.cells.flat().map((c) => {
                      const p = at(c.x, c.y);
                      const f = fits.get(`${c.x},${c.y}`);
                      const isSel = sel?.x === c.x && sel?.y === c.y;
                      return (
                        <button key={`${c.x}-${c.y}`} role="gridcell" className={`plan-cell lvl-${c.level}${p ? ' has' : ''}${isSel ? ' is-sel' : ''}${f ? ` fit-${f.status}` : ''}`} onClick={() => clickCell(c.x, c.y)}
                          aria-label={`Row ${c.y + 1}, column ${c.x + 1}, ${LEVEL_SHORT[c.level]} light${p ? `, ${p.name}${f ? `, ${STATUS[f.status][1]}` : ''}` : brush ? `, click to place ${brush.name}` : ', empty'}`} title={`${LEVEL_SHORT[c.level]} light`}>
                          {p ? <SmartImage src={p.image} alt="" width="64" height="64" /> : <span className="plan-hint">{brush ? '+' : ''}</span>}
                          {f && f.status !== 'great' && <i className={`plan-flag ${f.status}`} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="planner-sel" aria-live="polite">
                {!sel ? <p className="small muted" style={{ margin: 0 }}>{brush ? <>Placing <b>{brush.name}</b> – click an empty square. Click the plant in the list again to stop.</> : 'Choose a plant from the list, then click a square. Click a placed plant to inspect or remove it.'}</p> : (
                  <div className="row between wrap">
                    <div className="small"><b>Row {sel.y + 1}, column {sel.x + 1}</b> · {selCell ? `${LEVEL_SHORT[selCell.level]} light` : ''}{selPlaced ? <> · <b>{selPlaced.name}</b>{selFit && <> – <span className={`chip ${STATUS[selFit.status][0]}`}>{STATUS[selFit.status][1]} ({selFit.fit}%)</span></>}</> : ' · empty'}
                      {selFit && <div className="xs muted" style={{ marginTop: 4 }}>{selFit.detail}{selFit.heightCm ? ` Grows ~${selFit.heightCm} cm tall.` : ''}</div>}</div>
                    <div className="row">{selPlaced && <button className="btn btn-ghost btn-sm" onClick={() => removeAt(sel.x, sel.y)}><Trash2 size={14} /> Remove</button>}<button className="icon-btn" onClick={() => setSel(null)} aria-label="Clear selection"><X size={16} /></button></div>
                  </div>
                )}
              </div>
            </section>

            <section className="card pad" aria-label="Plan score" aria-live="polite">
              {evalErr && <p className="err-text small" role="alert">{evalErr}</p>}
              {!result || placed.length === 0 ? (
                <EmptyState icon={LayoutGrid} title="Your plan score will appear here" text="Place a plant on the map, or let us suggest a layout that suits your light.">
                  <button className="btn btn-primary" onClick={suggest} disabled={suggesting}><Sparkles size={16} /> {suggesting ? 'Thinking…' : 'Suggest a layout'}</button>
                </EmptyState>
              ) : (
                <div className="stack" style={{ gap: 14 }}>
                  <div className="row" style={{ gap: 18 }}>
                    <div className={`ring lg ${result.score >= 75 ? '' : result.score >= 50 ? 'warn' : 'bad'}`} style={{ '--pct': result.score }} role="img" aria-label={`Plan score ${result.score} out of 100`}><span>{result.score}</span></div>
                    <div><h2 style={{ fontSize: '1.3rem', margin: 0 }}>{result.score >= 85 ? 'Excellent layout' : result.score >= 70 ? 'Good layout' : result.score >= 50 ? 'Needs a few tweaks' : 'Several plants will struggle'}</h2><p className="small muted" style={{ margin: '4px 0 0' }}>{placed.length} {placed.length === 1 ? 'plant' : 'plants'} · room fits about {size.capacity} comfortably</p></div>
                  </div>
                  <ul className="fit-list">{result.placements.map((p) => <li key={`${p.x},${p.y}`}><SmartImage src={p.image} alt="" width="36" height="36" /><span className="small"><b>{p.name}</b> <span className="muted">· {p.levelLabel}</span></span><span className={`chip ${STATUS[p.status][0]}`}>{STATUS[p.status][1]}</span></li>)}</ul>
                  {result.notes.length > 0 && <ul className="kit-notes">{result.notes.map((n, i) => <li key={i} className="note warn"><AlertTriangle size={15} /><span>{n}</span></li>)}</ul>}
                  <div className="row wrap">
                    <button className="btn btn-primary" onClick={addAllToCart} disabled={cartBusy}><ShoppingBag size={16} /> {cartBusy ? 'Adding…' : `Add all to cart${totalPrice ? ` (≈ ₹${totalPrice.toLocaleString('en-IN')})` : ''}`}</button>
                    <button className="btn btn-ghost" onClick={suggest} disabled={suggesting}><Sparkles size={16} /> {suggesting ? 'Thinking…' : 'Re-suggest layout'}</button>
                    <button className="btn btn-ghost" onClick={() => { setPlaced([]); setSel(null); setPlanId(''); }}>Clear map</button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="stack" style={{ gap: 20, minWidth: 0 }}>
            <section className="card pad" aria-label="Auto-suggest options">
              <h3 style={{ fontSize: '1.15rem' }}>Auto-suggest</h3>
              <div className="form-row">
                <Field label="Pets at home?" htmlFor="rp-pets"><select id="rp-pets" className="select" value={pets} onChange={(e) => setPets(e.target.value)}><option value="unspecified">Not specified</option><option value="yes">Yes – pet-safe only</option><option value="no">No pets</option></select></Field>
                <Field label="Experience" htmlFor="rp-exp"><select id="rp-exp" className="select" value={experience} onChange={(e) => setExperience(e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></Field>
              </div>
              <button className="btn btn-primary btn-block" onClick={suggest} disabled={suggesting}><Sparkles size={16} /> {suggesting ? 'Thinking…' : 'Suggest a layout'}</button>
            </section>

            <section className="card pad" aria-label="Plants">
              <h3 style={{ fontSize: '1.15rem' }}>Plants</h3>
              <input className="input" type="search" placeholder="Search plants…" aria-label="Search plants" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 10 }} />
              {plantsQ.error ? <ErrorState message={plantsQ.error} onRetry={plantsQ.reload} /> : (
                <ul className="palette">
                  {shown.map((p) => (
                    <li key={p.id}><button className={brush?.id === p.id ? 'is-on' : ''} onClick={() => setBrush((b) => (b?.id === p.id ? null : p))} aria-pressed={brush?.id === p.id}><SmartImage src={p.image} alt="" width="40" height="40" /><span className="pal-name"><b>{p.name}</b><span className="xs muted">{LIGHT_LABEL[p.light]}</span></span>{brush?.id === p.id && <Check size={16} />}</button></li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card pad" aria-label="Save plan">
              <h3 style={{ fontSize: '1.15rem' }}>Save this plan</h3>
              {!user ? <p className="small muted">Sign in to save plans and come back to them later. <Link to="/login" state={{ from: '/room-planner' }}><b>Sign in</b></Link> · <Link to="/register"><b>Create account</b></Link></p> : (
                <form onSubmit={save} noValidate>
                  <Field label="Plan name" htmlFor="rp-name"><input id="rp-name" className="input" value={planName} maxLength={60} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Living room window" /></Field>
                  <button className="btn btn-primary btn-block" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : planId ? 'Update plan' : 'Save plan'}</button>
                  {planId && <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={() => { setPlanId(''); setPlanName(''); }}>Save as a new plan instead</button>}
                </form>
              )}
              {user && plansQ.data && (
                <div style={{ marginTop: 16 }}>
                  <h4 className="small">Saved plans</h4>
                  {plansQ.data.plans.length === 0 ? <p className="xs muted">No saved plans yet.</p> : (
                    <ul className="saved-plans">{plansQ.data.plans.map((p) => (
                      <li key={p.id} className={p.id === planId ? 'is-on' : ''}><button className="sp-main" onClick={() => loadPlan(p)}><b>{p.name}</b><span className="xs muted">{ROOM_LABEL[p.config.room]} · {p.placements.length} plants · score {p.score} · {formatDate(p.updatedAt, { day: 'numeric', month: 'short' })}</span></button><button className="icon-btn" onClick={() => setDelPlan(p)} aria-label={`Delete plan ${p.name}`}><Trash2 size={15} /></button></li>
                    ))}</ul>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>
        <p className="xs muted" style={{ marginTop: 24 }}>Light levels are an estimate based on your window side and strength – a real room has curtains, trees and neighbours. Use the map as a guide and trust the plant’s own signals.</p>
      </div>
      <ConfirmDialog open={!!delPlan} title="Delete this plan?" message={delPlan ? `“${delPlan.name}” will be permanently deleted.` : ''} confirmLabel="Delete" danger onConfirm={removePlan} onClose={() => setDelPlan(null)} />
    </>
  );
}

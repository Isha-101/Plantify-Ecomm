import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Pencil, Plus, Ruler, Save, Trash2 } from 'lucide-react';
import { Breadcrumbs, ConfirmDialog, ErrorState, Field, Modal, PageLoading, PetBadge, SmartImage } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { notifyGardenChanged } from '../context/RemindersContext.jsx';
import { LIGHT_LABEL, MOOD_LABEL, ROOM_LABEL, TASK_LABEL, formatDate, todayKey } from '../utils/format.js';
import { dueText } from './MyGarden.jsx';

const TASK_ICON = { water: 'droplets', fertilize: 'sprout', mist: 'cloud-drizzle', rotate: 'refresh-cw', prune: 'scissors', repot: 'package-open', clean: 'sparkles', 'pest-check': 'bug' };
const DEFAULT_INTERVAL = { water: 7, fertilize: 30, mist: 3, rotate: 14, prune: 60, repot: 365, clean: 30, 'pest-check': 21 };
const HEALTH = { thriving: ['ok', 'Thriving'], ok: ['warn', 'Doing okay'], 'needs-attention': ['bad', 'Needs attention'] };
const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

function GrowthChart({ points }) {
  if (points.length === 0) return null;
  const W = 560, H = 220, P = { l: 44, r: 16, t: 16, b: 34 };
  const hs = points.map((p) => p.heightCm);
  const max = Math.max(...hs, 1) * 1.1;
  const min = Math.max(0, Math.min(...hs) * 0.8);
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const x = (d) => P.l + (t1 === t0 ? (W - P.l - P.r) / 2 : ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - P.l - P.r));
  const y = (v) => P.t + (1 - (v - min) / (max - min || 1)) * (H - P.t - P.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.heightCm).toFixed(1)}`).join(' ');
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="growth-chart" role="img" aria-label={`Height over time: from ${points[0].heightCm} cm to ${points[points.length - 1].heightCm} cm across ${points.length} measurements`}>
      {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--sage)" strokeOpacity=".5" strokeDasharray="3 4" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">{Math.round(t)}</text></g>)}
      <text x="12" y={P.t + 4} fontSize="11" fill="var(--ink-soft)">cm</text>
      {points.length > 1 && <path d={path} fill="none" stroke="var(--green)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p) => <circle key={p.id || p.date} cx={x(p.date)} cy={y(p.heightCm)} r="5" fill="var(--cream)" stroke="var(--forest)" strokeWidth="2.5"><title>{`${formatDate(p.date)}: ${p.heightCm} cm`}</title></circle>)}
      <text x={x(points[0].date)} y={H - 10} fontSize="11" textAnchor={points.length > 1 ? 'start' : 'middle'} fill="var(--ink-soft)">{formatDate(points[0].date, { day: 'numeric', month: 'short' })}</text>
      {points.length > 1 && <text x={x(points[points.length - 1].date)} y={H - 10} fontSize="11" textAnchor="end" fill="var(--ink-soft)">{formatDate(points[points.length - 1].date, { day: 'numeric', month: 'short' })}</text>}
    </svg>
  );
}

function Schedule({ plant, onSaved, onDone, busy }) {
  const toast = useToast();
  const initial = useMemo(() => Object.fromEntries(plant.care.tasks.map((t) => [t.type, { intervalDays: t.intervalDays, enabled: t.enabled }])), [plant.care.tasks]);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(initial), [initial]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const byType = Object.fromEntries(plant.care.tasks.map((t) => [t.type, t]));
  const types = [...new Set([...plant.care.tasks.map((t) => t.type), ...Object.keys(draft)])];
  const missing = Object.keys(TASK_LABEL).filter((t) => !types.includes(t));

  const save = async () => {
    for (const [t, v] of Object.entries(draft)) if (!(v.intervalDays >= 1 && v.intervalDays <= 730)) { toast.error(`${TASK_LABEL[t]}: choose between 1 and 730 days.`); return; }
    setSaving(true);
    try {
      const r = await api.put(`/garden/${plant.id}`, { tasks: Object.entries(draft).map(([type, v]) => ({ type, intervalDays: Number(v.intervalDays), enabled: v.enabled })) });
      onSaved(r.plant); toast.success('Care schedule saved.'); notifyGardenChanged();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  return (
    <div>
      <p className="small muted">Intervals are the base schedule. Plantify stretches or shortens watering and feeding a little with the season. Tap <b>Done</b> after you do a task – the next date is counted from then.</p>
      <ul className="task-list">
        {types.map((type) => {
          const t = byType[type];
          const d = draft[type] || { intervalDays: DEFAULT_INTERVAL[type], enabled: true };
          return (
            <li key={type} className={`task ${t && d.enabled ? t.status : 'off'}`}>
              <span className="care-ico"><Icon name={TASK_ICON[type]} size={20} /></span>
              <div className="task-main">
                <b>{TASK_LABEL[type]}</b>
                <div className="small muted">{t ? (d.enabled ? dueText(t, false) : 'Paused') : 'Save to schedule'}{t?.lastDoneAt && ` · last ${formatDate(t.lastDoneAt, { day: 'numeric', month: 'short' })}`}</div>
                {t && t.effectiveIntervalDays !== t.intervalDays && d.enabled && <div className="xs muted">Seasonal adjustment: every {t.effectiveIntervalDays} days right now</div>}
              </div>
              <label className="small task-int">Every <input className="input" type="number" min="1" max="730" value={d.intervalDays} onChange={(e) => setDraft((s) => ({ ...s, [type]: { ...d, intervalDays: e.target.value === '' ? '' : Number(e.target.value) } }))} aria-label={`${TASK_LABEL[type]} interval in days`} /> days</label>
              <label className="switch" title={d.enabled ? 'Reminders on' : 'Reminders off'}><input type="checkbox" checked={d.enabled} onChange={(e) => setDraft((s) => ({ ...s, [type]: { ...d, enabled: e.target.checked } }))} aria-label={`${TASK_LABEL[type]} reminders`} /><span /></label>
              <button className="btn btn-primary btn-sm" disabled={!t || busy === type} onClick={() => onDone(type)} aria-label={`Mark ${TASK_LABEL[type]} done`}><Check size={15} /> Done</button>
            </li>
          );
        })}
      </ul>
      <div className="row wrap" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}><Save size={16} /> {saving ? 'Saving…' : 'Save schedule'}</button>
        {dirty && <button className="btn btn-ghost" onClick={() => setDraft(initial)}>Discard changes</button>}
        {missing.length > 0 && (
          <select className="select" style={{ width: 'auto' }} value="" aria-label="Add a task" onChange={(e) => e.target.value && setDraft((s) => ({ ...s, [e.target.value]: { intervalDays: DEFAULT_INTERVAL[e.target.value], enabled: true } }))}>
            <option value="">+ Add a task…</option>{missing.map((m) => <option key={m} value={m}>{TASK_LABEL[m]}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function Diary({ plant, onChange }) {
  const toast = useToast();
  const [f, setF] = useState({ note: '', mood: 'good', health: 4, date: todayKey() });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setErrs({});
    if (f.note.trim().length < 3) { setErrs({ note: 'Write a few words about your plant today.' }); return; }
    setBusy(true);
    try {
      const r = await api.post(`/garden/${plant.id}/diary`, { ...f, note: f.note.trim(), health: Number(f.health) });
      onChange(r.plant); toast.success('Diary entry saved.'); toast.rewards(r.rewards); setF((s) => ({ ...s, note: '' })); notifyGardenChanged();
    } catch (err) { setErrs(err.errors || { note: errorMessage(err) }); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { const r = await api.del(`/garden/${plant.id}/diary/${del}`); onChange(r.plant); toast.info('Entry deleted.'); } catch (err) { toast.error(errorMessage(err)); } finally { setDel(null); }
  };
  return (
    <div className="two-col">
      <form onSubmit={submit} noValidate className="card pad">
        <h3 style={{ fontSize: '1.2rem' }}>Write today’s entry</h3>
        <Field label="What did you notice?" error={errs.note} htmlFor="d-note"><textarea id="d-note" className="textarea" maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="New leaf unfurling, a bit droopy after the heatwave…" aria-invalid={!!errs.note} /></Field>
        <div className="form-row">
          <Field label="Mood" htmlFor="d-mood"><select id="d-mood" className="select" value={f.mood} onChange={(e) => setF({ ...f, mood: e.target.value })}>{Object.entries(MOOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Health (1–5)" error={errs.health} htmlFor="d-health"><select id="d-health" className="select" value={f.health} onChange={(e) => setF({ ...f, health: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} – {['', 'Poor', 'Weak', 'Okay', 'Good', 'Excellent'][n]}</option>)}</select></Field>
        </div>
        <Field label="Date" htmlFor="d-date"><input id="d-date" className="input" type="date" max={todayKey()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy}><Plus size={16} /> {busy ? 'Saving…' : 'Add entry'}</button>
      </form>
      <div>
        {plant.diary.length === 0 ? <div className="panel center muted" style={{ padding: 32 }}>No entries yet – a short note each week makes it easy to spot trends.</div> : (
          <ol className="diary">
            {plant.diary.map((d) => (
              <li key={d.id} className="card pad">
                <div className="row between wrap"><span className="small"><b>{formatDate(d.date)}</b></span><span className="row"><span className={`chip ${d.health >= 4 ? 'ok' : d.health === 3 ? 'warn' : 'bad'}`}>{MOOD_LABEL[d.mood]} · {d.health}/5</span><button className="icon-btn" onClick={() => setDel(d.id)} aria-label={`Delete diary entry from ${formatDate(d.date)}`}><Trash2 size={16} /></button></span></div>
                <p style={{ margin: '8px 0 0' }}>{d.note}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <ConfirmDialog open={!!del} title="Delete this entry?" message="This diary entry will be removed." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

function Growth({ plant, onChange }) {
  const toast = useToast();
  const [f, setF] = useState({ heightCm: '', leafCount: '', note: '', date: todayKey() });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const withHeight = plant.growth.filter((g) => typeof g.heightCm === 'number');
  const submit = async (e) => {
    e.preventDefault(); setErrs({});
    if (f.heightCm === '' || Number.isNaN(Number(f.heightCm)) || Number(f.heightCm) < 0) { setErrs({ heightCm: 'Enter the height in centimetres.' }); return; }
    setBusy(true);
    try {
      const r = await api.post(`/garden/${plant.id}/growth`, { ...f, heightCm: Number(f.heightCm), leafCount: f.leafCount === '' ? '' : Number(f.leafCount) });
      onChange(r.plant); toast.success('Measurement saved.'); toast.rewards(r.rewards); setF((s) => ({ ...s, heightCm: '', leafCount: '', note: '' })); notifyGardenChanged();
    } catch (err) { setErrs(err.errors || { heightCm: errorMessage(err) }); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { const r = await api.del(`/garden/${plant.id}/growth/${del}`); onChange(r.plant); toast.info('Measurement deleted.'); } catch (err) { toast.error(errorMessage(err)); } finally { setDel(null); }
  };
  const first = withHeight[0], last = withHeight[withHeight.length - 1];
  return (
    <div className="two-col">
      <form onSubmit={submit} noValidate className="card pad">
        <h3 style={{ fontSize: '1.2rem' }}>Record a measurement</h3>
        <div className="form-row">
          <Field label="Height (cm)" error={errs.heightCm} htmlFor="g-h"><input id="g-h" className="input" type="number" min="0" step="0.1" value={f.heightCm} onChange={(e) => setF({ ...f, heightCm: e.target.value })} aria-invalid={!!errs.heightCm} /></Field>
          <Field label="Leaves (optional)" error={errs.leafCount} htmlFor="g-l"><input id="g-l" className="input" type="number" min="0" step="1" value={f.leafCount} onChange={(e) => setF({ ...f, leafCount: e.target.value })} /></Field>
        </div>
        <Field label="Date" htmlFor="g-date"><input id="g-date" className="input" type="date" max={todayKey()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Note (optional)" htmlFor="g-note"><input id="g-note" className="input" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <button className="btn btn-primary" disabled={busy}><Ruler size={16} /> {busy ? 'Saving…' : 'Save measurement'}</button>
      </form>
      <div className="stack" style={{ gap: 16 }}>
        {withHeight.length === 0 ? <div className="panel center muted" style={{ padding: 32 }}>No measurements yet. Measure from the soil line to the highest leaf tip, about once a month.</div> : (
          <div className="card pad">
            <div className="row between wrap"><h3 style={{ fontSize: '1.2rem', margin: 0 }}>Height over time</h3>{withHeight.length > 1 && <span className="chip ok">{last.heightCm - first.heightCm >= 0 ? '+' : ''}{(last.heightCm - first.heightCm).toFixed(1)} cm since {formatDate(first.date, { day: 'numeric', month: 'short' })}</span>}</div>
            <GrowthChart points={withHeight} />
          </div>
        )}
        {plant.growth.length > 0 && (
          <div className="card table-wrap"><table className="table"><thead><tr><th>Date</th><th>Height</th><th>Leaves</th><th>Note</th><th><span className="sr-only">Delete</span></th></tr></thead><tbody>
            {[...plant.growth].reverse().map((g) => <tr key={g.id}><td>{formatDate(g.date)}</td><td>{g.heightCm} cm</td><td>{g.leafCount ?? '–'}</td><td>{g.note || '–'}</td><td><button className="icon-btn" onClick={() => setDel(g.id)} aria-label={`Delete measurement from ${formatDate(g.date)}`}><Trash2 size={16} /></button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <ConfirmDialog open={!!del} title="Delete this measurement?" message="It will be removed from the chart." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

function EditModal({ plant, open, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setErrs({}); setF({ nickname: plant.nickname, location: plant.location, light: plant.light, notes: plant.notes || '', acquiredOn: dateKey(plant.acquiredOn) }); } }, [open, plant]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setErrs({}); setBusy(true);
    try { const r = await api.put(`/garden/${plant.id}`, { ...f, nickname: f.nickname.trim() }); onSaved(r.plant); toast.success('Plant updated.'); onClose(); }
    catch (err) { setErrs(err.errors || { nickname: errorMessage(err) }); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Edit plant">
      <form onSubmit={submit} noValidate>
        <Field label="Nickname" error={errs.nickname} htmlFor="e-nick"><input id="e-nick" className="input" value={f.nickname || ''} onChange={set('nickname')} maxLength={60} aria-invalid={!!errs.nickname} /></Field>
        <div className="form-row">
          <Field label="Location" htmlFor="e-loc"><select id="e-loc" className="select" value={f.location || 'other'} onChange={set('location')}>{Object.entries(ROOM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Light" htmlFor="e-light"><select id="e-light" className="select" value={f.light || 'unsure'} onChange={set('light')}>{Object.entries(LIGHT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <Field label="Date you got it" error={errs.acquiredOn} htmlFor="e-date"><input id="e-date" className="input" type="date" max={todayKey()} value={f.acquiredOn || ''} onChange={set('acquiredOn')} /></Field>
        <Field label="Notes" htmlFor="e-notes"><textarea id="e-notes" className="textarea" style={{ minHeight: 80 }} maxLength={500} value={f.notes || ''} onChange={set('notes')} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </Modal>
  );
}

const TABS = [['schedule', 'Care schedule'], ['diary', 'Diary'], ['growth', 'Growth'], ['history', 'Care history'], ['about', 'About this plant']];

export default function GardenPlant() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi((signal) => api.get(`/garden/${id}`, null, { signal }), [id]);
  const [tab, setTab] = useState('schedule');
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  const setPlant = (plant) => setData((d) => ({ ...d, plant }));

  if (loading && !data) return <PageLoading />;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  const { plant, product } = data;
  const h = HEALTH[plant.health] || HEALTH.ok;

  const done = async (type) => {
    setBusy(type);
    try {
      const r = await api.post(`/garden/${plant.id}/care`, { type });
      setPlant(r.plant); toast.success(`${TASK_LABEL[type]} logged.`); toast.rewards(r.rewards); notifyGardenChanged();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };
  const remove = async () => {
    try { await api.del(`/garden/${plant.id}`); toast.info(`${plant.nickname} was removed from your garden.`); notifyGardenChanged(); nav('/garden'); }
    catch (e) { toast.error(errorMessage(e)); setConfirm(false); }
  };

  return (
    <div className="container section tight">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My Garden', to: '/garden' }, { label: plant.nickname }]} />
      <header className="plant-head card">
        <SmartImage src={plant.image} alt="" width="200" height="200" className="plant-head-img" eager />
        <div className="plant-head-body">
          <div className="row wrap"><span className={`chip ${h[0]}`}>{h[1]}</span>{product && <PetBadge status={product.petSafe} />}</div>
          <h1>{plant.nickname}</h1>
          <p className="muted" style={{ margin: 0 }}>{plant.speciesName || product?.name || ''}{plant.botanicalName && <> · <i className="botanical">{plant.botanicalName}</i></>}</p>
          <p className="small muted">{ROOM_LABEL[plant.location]} · {LIGHT_LABEL[plant.light]} · with you since {formatDate(plant.acquiredOn)}{plant.latestHeightCm != null && ` · ${plant.latestHeightCm} cm tall`}</p>
          {plant.notes && <p className="small">“{plant.notes}”</p>}
          <div className="row wrap">
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</button>
            <Link to="/plant-care/sos" className="btn btn-ghost btn-sm">Plant SOS</Link>
            {product && <Link to={`/product/${product.slug}`} className="btn btn-ghost btn-sm">View in shop</Link>}
            <button className="btn btn-ghost btn-sm danger-link" onClick={() => setConfirm(true)}><Trash2 size={15} /> Remove</button>
          </div>
          {plant.lastSos?.problem && <p className="xs muted" style={{ marginTop: 8 }}>Last SOS check ({formatDate(plant.lastSos.at, { day: 'numeric', month: 'short' })}): {plant.lastSos.problem}</p>}
        </div>
      </header>

      <div className="tabs" role="tablist" style={{ margin: '28px 0 20px' }}>
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'schedule' && <Schedule plant={plant} onSaved={setPlant} onDone={done} busy={busy} />}
      {tab === 'diary' && <Diary plant={plant} onChange={setPlant} />}
      {tab === 'growth' && <Growth plant={plant} onChange={setPlant} />}
      {tab === 'history' && (
        plant.careLog.length === 0 ? <div className="panel center muted" style={{ padding: 32 }}>Nothing logged yet. Tap “Done” on a task to start your history.</div> : (
          <ul className="history">{plant.careLog.map((l) => <li key={l.id} className="row"><span className="care-ico"><Icon name={TASK_ICON[l.type]} size={18} /></span><span><b>{TASK_LABEL[l.type]}</b>{l.note && ` – ${l.note}`}</span><span className="small muted" style={{ marginLeft: 'auto' }}>{formatDate(l.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></li>)}</ul>
        )
      )}
      {tab === 'about' && (
        product?.care ? (
          <div className="care-grid">
            {Object.entries({ Watering: product.care.watering, Light: product.care.light, Soil: product.care.soil, Fertiliser: product.care.fertilizer, Humidity: product.care.humidity, Temperature: product.care.temperature, Repotting: product.care.repotting, Pruning: product.care.pruning }).filter(([, v]) => v).map(([k, v]) => <div key={k} className="care-item"><b>{k}</b><p className="small" style={{ margin: 0 }}>{v}</p></div>)}
            {product.petNote && <div className="care-item"><b>Pets</b><p className="small" style={{ margin: 0 }}>{product.petNote}</p></div>}
          </div>
        ) : <div className="panel center muted" style={{ padding: 32 }}>This is a plant you added yourself, so we don’t have a care sheet for it. Edit its schedule on the Care schedule tab.</div>
      )}

      <EditModal plant={plant} open={edit} onClose={() => setEdit(false)} onSaved={setPlant} />
      <ConfirmDialog open={confirm} title={`Remove ${plant.nickname}?`} message="Its schedule, diary and growth records will be permanently deleted. This can’t be undone." confirmLabel="Remove plant" danger onConfirm={remove} onClose={() => setConfirm(false)} />
    </div>
  );
}

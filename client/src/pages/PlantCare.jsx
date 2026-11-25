import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, Check, ChevronDown, Droplets, Layers, LifeBuoy, Lightbulb, Search, Sprout, Stethoscope, Sun, Thermometer, Wind, X } from 'lucide-react';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, PageHead, PetBadge, SmartImage } from '../components/ui.jsx';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DIFFICULTY_LABEL } from '../utils/format.js';

const TABS = [['guides', 'Care guides', BookOpen], ['plants', 'Plant care sheets', Sprout], ['sos', 'Plant SOS', LifeBuoy], ['compatibility', 'Compatibility checker', Layers]];

function Guides() {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi((signal) => api.get('/care/guides', { category: cat }, { signal }), [cat]);
  const tip = useApi((signal) => api.get('/care/tip', null, { signal }), []);
  const list = (data?.guides || []).filter((g) => !q.trim() || (g.title + ' ' + g.summary + ' ' + g.tags.join(' ')).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      {tip.data?.tip && <div className="tip-banner glass" style={{ marginBottom: 24 }}><Lightbulb size={22} /><div><strong>Today’s care tip</strong><p style={{ margin: 0 }}>{tip.data.tip}</p></div></div>}
      <div className="row wrap" style={{ marginBottom: 20 }}>
        <div className="input-wrap" style={{ flex: '1 1 260px', maxWidth: 380 }}><input className="input" type="search" placeholder="Search guides – e.g. watering, pests" aria-label="Search guides" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className={`chip${!cat ? ' is-on' : ''}`} onClick={() => setCat('')}>All</button>
        {(data?.categories || []).map((c) => <button key={c} className={`chip${cat === c ? ' is-on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <div className="grid cols-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 170 }} />)}</div> : list.length === 0 ? <EmptyState icon={Search} title="No guides match" text="Try a different word or category." /> : (
        <div className="grid cols-3">
          {list.map((g) => (
            <Link key={g.slug} to={`/plant-care/guides/${g.slug}`} className="card guide-card">
              <span className="care-ico"><Icon name={g.icon} size={24} /></span>
              <span className="chip beige">{g.category} · {g.readMinutes} min</span>
              <h3>{g.title}</h3>
              <p className="small muted">{g.summary}</p>
              <span className="link-arrow small">Read guide →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PlantSheets() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useApi((signal) => api.get('/care/plants', { search: dq }, { signal }), [dq]);
  return (
    <div>
      <div className="input-wrap" style={{ maxWidth: 420, marginBottom: 20 }}><input className="input" type="search" placeholder="Search a plant – e.g. snake, fern, tulsi" aria-label="Search plant care sheets" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <div className="skeleton" style={{ height: 300 }} /> : data.plants.length === 0 ? <EmptyState icon={Search} title="No plants found" text="Try another name." /> : (
        <div className="sheet-list">
          {data.plants.map((p) => {
            const isOpen = open === p.id;
            return (
              <article key={p.id} className="card sheet">
                <button className="sheet-head" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                  <SmartImage src={p.image} alt="" width="64" height="64" />
                  <span className="sheet-title"><strong>{p.name}</strong><small className="botanical">{p.botanicalName}</small></span>
                  <span className="sheet-chips"><span className="chip">{DIFFICULTY_LABEL[p.difficulty]}</span><span className="chip beige"><Droplets size={12} />{p.watering?.label}</span><PetBadge status={p.petSafe} compact /></span>
                  <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flex: 'none' }} />
                </button>
                {isOpen && (
                  <div className="sheet-body">
                    {[['Watering', Droplets, p.care.watering], ['Light', Sun, p.care.light], ['Soil', Layers, p.care.soil], ['Fertiliser', Sprout, p.care.fertilizer], ['Humidity', Wind, p.care.humidity], ['Temperature', Thermometer, p.care.temperature], ['Repotting', Layers, p.care.repotting], ['Pruning', Sprout, p.care.pruning]].filter((x) => x[2]).map(([t, I, text]) => <div key={t} className="sheet-item"><I size={18} /><div><b>{t}</b><p className="small">{text}</p></div></div>)}
                    {p.care.tips?.length > 0 && <div className="sheet-item wide"><Lightbulb size={18} /><div><b>Tips</b><ul className="tips">{p.care.tips.map((t) => <li key={t}>{t}</li>)}</ul></div></div>}
                    <div className="row wrap wide"><Link to={`/product/${p.slug}`} className="btn btn-primary btn-sm">View plant</Link><Link to="/plant-care/sos" className="btn btn-ghost btn-sm">Run Plant SOS</Link></div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SOS() {
  const { user } = useAuth();
  const toast = useToast();
  const cfg = useApi((signal) => api.get('/care/sos/config', null, { signal }), []);
  const plants = useApi((signal) => api.get('/care/plants', null, { signal }), []);
  const garden = useApi((signal) => api.get('/garden', null, { signal }), [user?.id], { enabled: !!user });
  const [symptoms, setSymptoms] = useState([]);
  const [context, setContext] = useState({});
  const [target, setTarget] = useState(''); // "p:<productId>" | "g:<gardenId>"
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const toggle = (id) => setSymptoms((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const diagnose = async () => {
    if (!symptoms.length) { setErr('Choose at least one symptom.'); return; }
    setErr(''); setBusy(true);
    try {
      const body = { symptoms, context };
      if (target.startsWith('p:')) body.productId = target.slice(2);
      if (target.startsWith('g:')) body.gardenPlantId = target.slice(2);
      const r = await api.post('/care/sos/diagnose', body);
      setResult(r);
      toast.rewards(r.rewards);
      setTimeout(() => document.getElementById('sos-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  if (cfg.error) return <ErrorState message={cfg.error} onRetry={cfg.reload} />;
  if (!cfg.data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div className="sos-layout">
      <div className="card pad">
        <h2 style={{ fontSize: '1.5rem' }}>What are you seeing?</h2>
        <p className="muted small">Pick every symptom that applies. Add a few details about your care for a sharper answer. This is a rule-based guide to common causes, not a lab test.</p>
        {err && <div className="form-error" role="alert"><AlertTriangle size={18} />{err}</div>}
        <div className="field"><label htmlFor="sos-plant">Which plant? (optional)</label>
          <select id="sos-plant" className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Not sure / not listed</option>
            {(garden.data?.plants || []).length > 0 && <optgroup label="My Garden">{garden.data.plants.map((p) => <option key={p.id} value={`g:${p.id}`}>{p.nickname}</option>)}</optgroup>}
            <optgroup label="All plants">{(plants.data?.plants || []).map((p) => <option key={p.id} value={`p:${p.id}`}>{p.name}</option>)}</optgroup>
          </select>
        </div>
        {cfg.data.groups.map((g) => (
          <fieldset key={g.id} className="sos-group"><legend>{g.label}</legend>
            <div className="row wrap" style={{ gap: 8 }}>{g.symptoms.map((s) => <button key={s.id} type="button" className={`chip sym${symptoms.includes(s.id) ? ' is-on' : ''}`} aria-pressed={symptoms.includes(s.id)} onClick={() => toggle(s.id)}>{symptoms.includes(s.id) && <Check size={13} />}{s.label}</button>)}</div>
          </fieldset>
        ))}
        <h3 style={{ fontSize: '1.15rem', marginTop: 24 }}>A few details <span className="muted small" style={{ fontFamily: 'var(--font-body)' }}>(optional)</span></h3>
        <div className="form-row">
          {cfg.data.context.map((c) => (
            <div key={c.id} className="field"><label htmlFor={`ctx-${c.id}`}>{c.label}</label>
              <select id={`ctx-${c.id}`} className="select" value={context[c.id] || ''} onChange={(e) => setContext((x) => ({ ...x, [c.id]: e.target.value }))}><option value="">Skip</option>{c.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
          ))}
        </div>
        <div className="row wrap"><button className="btn btn-primary btn-lg" onClick={diagnose} disabled={busy}><Stethoscope size={18} /> {busy ? 'Checking…' : 'Diagnose my plant'}</button>{symptoms.length > 0 && <button className="btn btn-ghost" onClick={() => { setSymptoms([]); setResult(null); }}>Clear ({symptoms.length})</button>}</div>
      </div>

      <div id="sos-results">
        {result && (
          <div className="stack" style={{ gap: 16 }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Likely causes{result.plant ? ` for ${result.plant.name}` : ''}</h2>
            {result.diagnoses.map((d, i) => (
              <article key={d.id} className="card pad diag">
                <div className="row between wrap"><div className="row"><span className={`chip ${d.urgency === 'high' ? 'bad' : d.urgency === 'medium' ? 'warn' : 'ok'}`}>{d.urgency === 'high' ? 'Act soon' : d.urgency === 'medium' ? 'Worth fixing' : 'Low urgency'}</span><span className="chip">{d.likelihood}</span></div><div className={`ring ${d.confidence < 40 ? 'warn' : ''}`} style={{ '--pct': d.confidence, '--size': '56px' }} role="img" aria-label={`${d.confidence}% confidence`}><span style={{ fontSize: '.85rem' }}>{d.confidence}%</span></div></div>
                <h3 style={{ marginTop: 10 }}>{i + 1}. {d.title}</h3>
                <p>{d.summary}</p>
                {d.why.length > 0 && <p className="small muted"><b>Why we think so:</b> {d.why.join(' · ')}{d.contextHits.length ? ` · ${d.contextHits.join(' · ')}` : ''}</p>}
                {d.plantNote && <div className="alert info small" style={{ marginBottom: 10 }}><Lightbulb size={16} /><span>{d.plantNote}</span></div>}
                <h4>What to do</h4><ol className="steps">{d.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <h4>Prevent it next time</h4><ul className="tips">{d.prevention.map((s) => <li key={s}>{s}</li>)}</ul>
                {d.products?.length > 0 && (<><h4>Helpful products</h4><div className="sos-products">{d.products.map((p) => <Link key={p.id} to={`/product/${p.slug}`} className="mini-prod"><SmartImage src={p.image} alt="" width="48" height="48" /><span>{p.name}</span></Link>)}</div></>)}
              </article>
            ))}
            <p className="xs muted">{result.disclaimer}</p>
          </div>
        )}
        {!result && <div className="panel center muted" style={{ padding: 40 }}><LifeBuoy size={36} style={{ opacity: 0.6 }} /><p>Your results will appear here.</p></div>}
      </div>
    </div>
  );
}

function Compatibility() {
  const plants = useApi((signal) => api.get('/care/plants', null, { signal }), []);
  const [sel, setSel] = useState([]);
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const all = plants.data?.plants || [];
  const shown = all.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id) => { setRes(null); setErr(''); setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? (setErr('You can compare up to 6 plants.'), s) : [...s, id])); };
  const check = async () => {
    if (sel.length < 2) { setErr('Choose at least two plants.'); return; }
    setBusy(true); setErr('');
    try { setRes(await api.post('/compatibility/check', { productIds: sel })); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const vt = res?.verdict.tone;
  const tone = vt === 'great' || vt === 'good' ? '' : vt === 'warn' ? 'warn' : 'bad';
  const chipTone = vt === 'great' || vt === 'good' ? 'ok' : vt === 'warn' ? 'warn' : 'bad';
  return (
    <div className="sos-layout">
      <div className="card pad">
        <h2 style={{ fontSize: '1.5rem' }}>Can these plants live together?</h2>
        <p className="muted small">Choose 2–6 plants. We compare light, watering, humidity, soil, temperature and pet safety to tell you whether they can share a shelf or even a pot.</p>
        {sel.length > 0 && <div className="row wrap" style={{ marginBottom: 12 }}>{sel.map((id) => { const p = all.find((x) => x.id === id); return p ? <button key={id} className="filter-chip" onClick={() => toggle(id)} aria-label={`Remove ${p.name}`}>{p.name}<X size={14} /></button> : null; })}</div>}
        <input className="input" type="search" placeholder="Search plants…" aria-label="Search plants to compare" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
        {plants.error ? <ErrorState message={plants.error} onRetry={plants.reload} /> : (
          <div className="pick-grid">{shown.map((p) => <button key={p.id} className={`pick${sel.includes(p.id) ? ' is-on' : ''}`} onClick={() => toggle(p.id)} aria-pressed={sel.includes(p.id)}><SmartImage src={p.image} alt="" width="56" height="56" /><span>{p.name}</span>{sel.includes(p.id) && <Check size={16} className="pick-check" />}</button>)}</div>
        )}
        {err && <p className="err-text small" role="alert" style={{ marginTop: 10 }}>{err}</p>}
        <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} onClick={check} disabled={busy || sel.length < 2}>{busy ? 'Checking…' : `Check compatibility (${sel.length})`}</button>
      </div>
      <div>
        {res ? (
          <div className="card pad stack" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 18 }}><div className={`ring lg ${tone}`} style={{ '--pct': res.overall }} role="img" aria-label={`${res.overall} out of 100`}><span>{res.overall}</span></div><div><span className={`chip ${chipTone}`}>{res.verdict.label}</span><h3 style={{ margin: '6px 0 0' }}>{res.plants.map((p) => p.name).join(' + ')}</h3></div></div>
            {res.dealBreakers.length > 0 && <div className="alert bad"><AlertTriangle size={16} /><span><b>Conflicts:</b> {res.dealBreakers.join(', ')}</span></div>}
            <div className="stack" style={{ gap: 10 }}>
              {res.factors.map((f) => (
                <div key={f.key}><div className="row between small"><b>{f.label}</b><span className={`chip ${f.status === 'ok' ? 'ok' : f.status === 'warn' ? 'warn' : 'bad'}`}>{Math.round(f.score * 100)}%</span></div><div className={`meter ${f.status === 'ok' ? '' : f.status === 'warn' ? 'warn' : 'bad'}`}><span style={{ width: `${f.score * 100}%` }} /></div><div className="xs muted">{f.detail}</div></div>
              ))}
            </div>
            <div className="grid cols-2"><div className={`panel ${res.sharePot.ok ? 'good' : ''}`}><b className="small">Share a pot?</b><p className="small" style={{ margin: '4px 0 0' }}>{res.sharePot.advice}</p></div><div className="panel"><b className="small">Same shelf?</b><p className="small" style={{ margin: '4px 0 0' }}>{res.sameShelf.advice}</p></div></div>
            {res.petNote && <div className="alert warn small"><AlertTriangle size={16} /><span>{res.petNote}</span></div>}
            {res.tips.length > 0 && <div><h4>Tips</h4><ul className="tips">{res.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>}
          </div>
        ) : <div className="panel center muted" style={{ padding: 40 }}><Layers size={36} style={{ opacity: 0.6 }} /><p>Pick at least two plants to see how well they get along.</p></div>}
      </div>
    </div>
  );
}

export default function PlantCare() {
  const { tab = 'guides' } = useParams();
  const nav = useNavigate();
  const t = TABS.some(([k]) => k === tab) ? tab : 'guides';
  return (
    <>
      <PageHead eyebrow="Plant care" title="Keep every plant thriving">Practical guides, plant-by-plant care sheets, a symptom checker and a compatibility tool – all in plain language.</PageHead>
      <div className="container section tight">
        <div className="tabs" role="tablist" style={{ marginBottom: 28 }}>
          {TABS.map(([k, l, I]) => <button key={k} role="tab" aria-selected={t === k} className={`tab${t === k ? ' is-on' : ''}`} onClick={() => nav(k === 'guides' ? '/plant-care' : `/plant-care/${k}`)}><I size={16} />{l}</button>)}
        </div>
        {t === 'guides' && <Guides />}
        {t === 'plants' && <PlantSheets />}
        {t === 'sos' && <SOS />}
        {t === 'compatibility' && <Compatibility />}
      </div>
    </>
  );
}

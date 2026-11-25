import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Droplets, Heart, PawPrint, RotateCcw, Save, ShoppingBag, Sparkles, Sprout, Sun, TriangleAlert } from 'lucide-react';
import Icon from '../components/Icon.jsx';
import { ErrorState, PageLoading, PetBadge, SmartImage, Stars } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DIFFICULTY_LABEL, LIGHT_LABEL, formatINR } from '../utils/format.js';

const STORE = 'plantify_match_answers';

function ResultCard({ r, rank }) {
  const cart = useCart();
  const wish = useWishlist();
  const [open, setOpen] = useState(rank === 0);
  const p = r.product;
  const liked = wish.has(p.id);
  const tone = r.score >= 80 ? '' : r.score >= 60 ? 'warn' : 'bad';
  return (
    <article className={`mm-result card${rank === 0 ? ' top' : ''}`}>
      {rank === 0 && <span className="mm-best"><Sparkles size={14} /> Best match</span>}
      <div className="mm-media"><Link to={`/product/${p.slug}`}><SmartImage src={p.image} alt={p.name} width="500" height="500" /></Link></div>
      <div className="mm-body">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div><h3 style={{ marginBottom: 2 }}><Link to={`/product/${p.slug}`}>{p.name}</Link></h3><div className="botanical small">{p.botanicalName}</div><Stars value={p.rating} count={p.numReviews} size={14} /></div>
          <div className={`ring lg ${tone}`} style={{ '--pct': r.score }} role="img" aria-label={`${r.score} percent match`}><span>{r.score}%</span></div>
        </div>
        <div className="pc-tags" style={{ margin: '12px 0' }}>
          <span className="chip"><Sprout size={12} />{DIFFICULTY_LABEL[p.difficulty]}</span>
          <span className="chip beige"><Sun size={12} />{LIGHT_LABEL[p.light]}</span>
          {p.wateringLabel && <span className="chip info"><Droplets size={12} />{p.wateringLabel}</span>}
          <PetBadge status={r.pet.status === 'safe' ? 'safe' : r.pet.status === 'toxic' ? 'toxic' : 'unknown'} compact />
        </div>
        <h4>Why it matches</h4>
        <ul className="why">{r.reasons.map((x) => <li key={x}><Check size={15} />{x}</li>)}</ul>
        {r.warnings.length > 0 && <div className="alert warn" style={{ margin: '10px 0' }}><TriangleAlert size={16} /><ul style={{ margin: 0, paddingLeft: 16 }}>{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
        <div className="pet-line small"><PawPrint size={15} /> <span>{r.pet.text}</span></div>
        {p.careNotes && <p className="small muted" style={{ margin: '8px 0 0' }}><b>Care tip:</b> {p.careNotes}</p>}
        <button className="btn-link small" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ marginTop: 10 }}>{open ? 'Hide' : 'Show'} score breakdown <ChevronDown size={14} style={{ verticalAlign: '-2px', transform: open ? 'rotate(180deg)' : 'none' }} /></button>
        {open && (
          <div className="breakdown">
            {r.breakdown.map((b) => (
              <div key={b.key}>
                <div className="row between small"><span>{b.label} <span className="muted">({b.weight}%)</span></span><b>{b.points.toFixed(0)} / {b.weight}</b></div>
                <div className={`meter ${b.score >= 0.75 ? '' : b.score >= 0.45 ? 'warn' : 'bad'}`}><span style={{ width: `${b.score * 100}%` }} /></div>
                <div className="xs muted">{b.detail}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mm-foot">
          <div className="pc-price"><strong>{formatINR(p.price)}</strong>{p.originalPrice > p.price && <s>{formatINR(p.originalPrice)}</s>}</div>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => cart.add(p, 1)} disabled={p.stock <= 0}><ShoppingBag size={15} />{p.stock <= 0 ? 'Sold out' : 'Add to cart'}</button>
            <button className={`icon-btn neu${liked ? ' is-on' : ''}`} style={{ color: liked ? '#c2403d' : undefined }} onClick={() => wish.toggle(p)} aria-pressed={liked} aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /></button>
            <Link to={`/product/${p.slug}`} className="btn btn-ghost btn-sm">View plant</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Results({ result, loading, onEdit, onRestart, onShowPets, answers }) {
  const { user } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await api.post('/matchmaker/save-preferences', { answers }); toast.success('Saved to your profile preferences.'); } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  const top = result.results[0];
  return (
    <div className="container section tight" aria-busy={loading}>
      <div className="mm-hero glass">
        <div>
          <span className="eyebrow">Your Plant Matchmaker results</span>
          <h1>{result.greeting}</h1>
          <p className="muted" style={{ fontSize: '1.05rem' }}>We compared {result.totalConsidered} plants against your answers.{top ? <> Your best match is <b>{top.product.name}</b> at <b>{top.score}%</b>.</> : ' We could not find a strong match – try changing a few answers.'}</p>
          <div className="personality"><span className="p-ico"><Icon name={result.personality.icon} size={26} /></span><div><small>Your plant personality</small><strong>{result.personality.title}</strong><p className="small muted" style={{ margin: 0 }}>{result.personality.blurb}</p></div></div>
        </div>
        <div className="answers-sum">
          <h4>Your answers</h4>
          <ul>{result.summary.map((s) => <li key={s.id}><span>{s.question}</span><b>{s.answer}</b></li>)}</ul>
        </div>
      </div>

      <div className="row wrap" style={{ margin: '20px 0 8px' }}>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}><ArrowLeft size={15} /> Edit answers</button>
        <button className="btn btn-ghost btn-sm" onClick={onRestart}><RotateCcw size={15} /> Start over</button>
        {user ? <button className="btn btn-ghost btn-sm" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Save to my preferences'}</button> : <Link className="btn btn-ghost btn-sm" to="/login" state={{ from: '/matchmaker', notice: 'Sign in to save your preferences and earn garden points.' }}><Save size={15} /> Sign in to save</Link>}
      </div>

      {result.excluded.length > 0 && (
        <div className="alert warn" style={{ marginBottom: 16 }}><PawPrint size={18} /><div style={{ flex: 1 }}><b>{result.excluded.length} {result.excluded.length === 1 ? 'plant is' : 'plants are'} hidden for pet safety:</b> {result.excluded.slice(0, 6).map((e) => e.name).join(', ')}{result.excluded.length > 6 ? '…' : ''}. <button className="btn-link" onClick={onShowPets}>Show them anyway</button></div></div>
      )}

      {result.results.length === 0 ? <ErrorState title="No strong matches" message="Nothing in our catalogue fits all of those answers. Try a different light level or relax the pet setting." onRetry={onEdit} /> : (
        <div className="mm-list">{result.results.map((r, i) => <ResultCard key={r.product.id} r={r} rank={i} />)}</div>
      )}

      <div className="card pad" style={{ marginTop: 28 }}>
        <button className="btn-link" onClick={() => setShowMethod((s) => !s)} aria-expanded={showMethod}>How are matches calculated?</button>
        {showMethod && (
          <div style={{ marginTop: 12 }}>
            <p className="small muted">{result.method}</p>
            <div className="grid cols-3">{result.weights.map((w) => <div key={w.key}><div className="row between small"><span>{w.label}</span><b>{w.weight}%</b></div><div className="meter"><span style={{ width: `${w.weight * 3}%` }} /></div></div>)}</div>
            <p className="xs muted" style={{ marginTop: 12 }}>The scoring is rule-based and transparent – there is no AI guesswork. Pet-safety information follows commonly published toxicity lists; if a plant is “unknown” we never assume it is safe.</p>
          </div>
        )}
      </div>
      {result.rewards?.gained > 0 && <p className="xs muted center" style={{ marginTop: 14 }}>+{result.rewards.gained} garden points for completing the Matchmaker.</p>}
    </div>
  );
}

export default function Matchmaker() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi((signal) => api.get('/matchmaker/questions', null, { signal }), []);
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(sessionStorage.getItem(STORE)) || {}; } catch { return {}; } });
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const headRef = useRef(null);

  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(answers)); } catch { /* ignore */ } }, [answers]);

  // Pre-fill from the signed-in user's profile (only for questions that are still unanswered).
  useEffect(() => {
    if (!data || !user || prefilled || Object.keys(answers).length) return;
    const pr = user.preferences || {};
    const has = (qid, v) => data.questions.find((q) => q.id === qid)?.options.some((o) => o.value === v);
    const next = {};
    if (has('experience', pr.experience)) next.experience = pr.experience;
    if (has('pets', pr.pets) && pr.pets !== 'unspecified') next.pets = pr.pets;
    if (has('light', pr.lightConditions) && pr.lightConditions !== 'unsure') next.light = pr.lightConditions;
    if (pr.preferredTypes?.length) next.types = pr.preferredTypes.filter((t) => has('types', t));
    if (Object.keys(next).length) { setAnswers(next); toast.info('We pre-filled a few answers from your profile – change anything you like.'); }
    setPrefilled(true);
  }, [data, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = data?.questions || [];
  const q = questions[step];
  const answered = (qq) => (qq.type === 'multi' ? (answers[qq.id] || []).length > 0 : !!answers[qq.id]);

  const choose = (qq, value) => {
    setAnswers((a) => {
      if (qq.type !== 'multi') return { ...a, [qq.id]: value };
      const cur = a[qq.id] || [];
      if (value === 'any') return { ...a, [qq.id]: cur.includes('any') ? [] : ['any'] };
      const without = cur.filter((v) => v !== 'any');
      return { ...a, [qq.id]: without.includes(value) ? without.filter((v) => v !== value) : [...without, value] };
    });
  };

  const run = async (ignorePetFilter = false) => {
    setBusy(true);
    try {
      const r = await api.post('/matchmaker/recommend', { answers, ignorePetFilter });
      setResult(r);
      toast.rewards(r.rewards);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error(errorMessage(e));
      if (e.errors) { const first = questions.findIndex((qq) => e.errors[qq.id]); if (first >= 0) setStep(first); }
    } finally { setBusy(false); }
  };

  const next = () => { if (step < questions.length - 1) { setStep(step + 1); headRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else run(false); };
  const restart = () => { setAnswers({}); setStep(0); setResult(null); };
  const progress = useMemo(() => Math.round((questions.filter(answered).length / Math.max(1, questions.length)) * 100), [answers, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <PageLoading />;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  if (result) return <Results result={result} loading={busy} answers={answers} onEdit={() => { setResult(null); setStep(0); }} onRestart={restart} onShowPets={() => run(true)} />;

  return (
    <div className="container section tight">
      <div className="mm-intro" ref={headRef}>
        <span className="eyebrow">Plant Matchmaker</span>
        <h1>Find the plant that fits your life</h1>
        <p className="muted">Seven quick questions. We’ll score every plant on light, care time, experience, room, preferences and space – and tell you exactly why.</p>
      </div>
      <div className="mm-card glass" role="group" aria-labelledby="mm-q">
        <div className="row between small" style={{ marginBottom: 8 }}><span>Question {step + 1} of {questions.length}</span><span className="muted">{progress}% answered</span></div>
        <div className="pill-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
        <h2 id="mm-q" style={{ margin: '26px 0 6px' }}>{q.title}</h2>
        {q.type === 'multi' && <p className="small muted">Choose all that apply.</p>}
        <div className={`mm-options${q.options.length > 4 ? ' many' : ''}`} role={q.type === 'multi' ? 'group' : 'radiogroup'} aria-labelledby="mm-q">
          {q.options.map((o) => {
            const on = q.type === 'multi' ? (answers[q.id] || []).includes(o.value) : answers[q.id] === o.value;
            return (
              <label key={o.value} className={`mm-opt neu${on ? ' is-on' : ''}`}>
                <input type={q.type === 'multi' ? 'checkbox' : 'radio'} name={q.id} checked={on} onChange={() => choose(q, o.value)} />
                <span className="mm-ico"><Icon name={o.icon} size={24} /></span>
                <span className="mm-text"><strong>{o.label}</strong>{o.hint && <small>{o.hint}</small>}</span>
                {on && <Check size={18} className="mm-check" />}
              </label>
            );
          })}
        </div>
        <div className="mm-nav">
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          <button className="btn btn-primary btn-lg" onClick={next} disabled={!answered(q) || busy}>{busy ? 'Matching…' : step === questions.length - 1 ? <>See my matches <Sparkles size={16} /></> : <>Next <ArrowRight size={16} /></>}</button>
        </div>
        {questions.every(answered) && step < questions.length - 1 && <div className="center" style={{ marginTop: 12 }}><button className="btn-link small" onClick={() => run(false)}>All answered – skip to results</button></div>}
      </div>
      <div className="mm-dots" aria-hidden="true">{questions.map((qq, i) => <button key={qq.id} tabIndex={-1} className={`${i === step ? 'cur' : ''} ${answered(qq) ? 'done' : ''}`} onClick={() => setStep(i)} />)}</div>
    </div>
  );
}

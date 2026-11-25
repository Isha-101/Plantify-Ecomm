import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Info, Leaf } from 'lucide-react';
import { Field, Logo } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errorMessage } from '../api/client.js';

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const pwProblem = (pw) => (pw.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Include at least one letter and one number.' : '');

function PasswordInput({ id, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input id={id} className="input" type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} aria-invalid={!!error} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}

function AuthShell({ title, subtitle, children, footer }) {
  const loc = useLocation();
  return (
    <div className="auth-page">
      <div className="auth-art" aria-hidden="true"><img src="/images/hero.svg" alt="" /><div className="auth-quote glass"><Leaf size={20} /><p>“Find your plant. Grow your space. Keep it thriving.”</p></div></div>
      <div className="auth-card">
        <Link to="/" aria-label="Plantify home"><Logo /></Link>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {loc.state?.notice && <div className="alert info" style={{ marginBottom: 16 }}><Info size={18} /><span>{loc.state.notice}</span></div>}
        {children}
        <p className="small center" style={{ marginTop: 20 }}>{footer}</p>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!isEmail(f.email)) er.email = 'Please enter a valid email address.';
    if (!f.password) er.password = 'Please enter your password.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await login(f.email.trim(), f.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      nav(from, { replace: true });
    } catch (err) { setErrs({ ...(err.errors || {}), form: errorMessage(err) }); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your cart, wishlist, orders and garden." footer={<>New to Plantify? <Link to="/register" state={loc.state}><b>Create an account</b></Link></>}>
      <form onSubmit={submit} noValidate>
        {errs.form && <div className="form-error" role="alert"><AlertTriangle size={18} />{errs.form}</div>}
        <Field label="Email" error={errs.email} htmlFor="l-email"><input id="l-email" className="input" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!errs.email} /></Field>
        <Field label="Password" error={errs.password} htmlFor="l-pw"><PasswordInput id="l-pw" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errs.password} /></Field>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="divider-label">demo account</div>
      <button className="btn btn-ghost btn-block" type="button" onClick={() => setF({ email: 'demo@plantify.test', password: 'Plantify123' })}>Fill demo credentials</button>
      <p className="xs muted center" style={{ marginTop: 8 }}>Available after running <code>npm run seed -- --demo</code> on the server.</p>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/';
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', experience: 'beginner', pets: 'unspecified' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={from} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your name (at least 2 characters).';
    if (!isEmail(f.email)) er.email = 'Please enter a valid email address.';
    const pw = pwProblem(f.password);
    if (pw) er.password = pw;
    if (f.confirm !== f.password) er.confirm = 'Passwords do not match.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await register({ name: f.name.trim(), email: f.email.trim(), password: f.password, preferences: { experience: f.experience, pets: f.pets } });
      toast.success(`Welcome to Plantify, ${u.name.split(' ')[0]}!`);
      nav(from, { replace: true });
    } catch (err) { setErrs({ ...(err.errors || {}), form: err.errors ? 'Please fix the highlighted fields.' : errorMessage(err) }); } finally { setBusy(false); }
  };
  const strength = Math.min(4, [f.password.length >= 8, /[A-Z]/.test(f.password), /\d/.test(f.password), /[^A-Za-z0-9]/.test(f.password) || f.password.length >= 12].filter(Boolean).length);

  return (
    <AuthShell title="Create your account" subtitle="Save your cart, track orders and start your plant garden." footer={<>Already have an account? <Link to="/login" state={loc.state}><b>Sign in</b></Link></>}>
      <form onSubmit={submit} noValidate>
        {errs.form && <div className="form-error" role="alert"><AlertTriangle size={18} />{errs.form}</div>}
        <Field label="Full name" error={errs.name} htmlFor="r-name"><input id="r-name" className="input" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={!!errs.name} /></Field>
        <Field label="Email" error={errs.email} htmlFor="r-email"><input id="r-email" className="input" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} aria-invalid={!!errs.email} /></Field>
        <Field label="Password" error={errs.password} hint="At least 8 characters, with a letter and a number." htmlFor="r-pw">
          <PasswordInput id="r-pw" autoComplete="new-password" value={f.password} onChange={set('password')} error={errs.password} />
          {f.password && <div className="pw-meter" aria-hidden="true">{[1, 2, 3, 4].map((n) => <span key={n} className={n <= strength ? `on s${strength}` : ''} />)}</div>}
        </Field>
        <Field label="Confirm password" error={errs.confirm} htmlFor="r-pw2"><PasswordInput id="r-pw2" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errs.confirm} /></Field>
        <div className="form-row">
          <Field label="Plant experience" htmlFor="r-exp"><select id="r-exp" className="select" value={f.experience} onChange={set('experience')}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></Field>
          <Field label="Pets at home?" htmlFor="r-pets"><select id="r-pets" className="select" value={f.pets} onChange={set('pets')}><option value="unspecified">Prefer not to say</option><option value="no">No pets</option><option value="yes">Yes – show pet-safe plants</option></select></Field>
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="xs muted center" style={{ marginTop: 10 }}>By creating an account you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
      </form>
    </AuthShell>
  );
}

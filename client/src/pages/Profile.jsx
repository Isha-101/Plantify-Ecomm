import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ConfirmDialog, Field, Modal, PageHead } from '../components/ui.jsx';
import { AddressForm, validateAddress } from './Checkout.jsx';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LIGHT_LABEL, TYPE_LABEL } from '../utils/format.js';

const EMPTY = { label: 'Home', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

function ProfileTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.profile?.phone || '', city: user.profile?.city || '', bio: user.profile?.bio || '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) { setErrs({ name: 'Please enter your name (at least 2 characters).' }); return; }
    setBusy(true);
    try { const r = await api.put('/auth/me', { name: f.name, profile: { phone: f.phone, city: f.city, bio: f.bio } }); setUser(r.user); setErrs({}); toast.success('Profile saved.'); } catch (err) { setErrs({ ...(err.errors || {}), form: errorMessage(err) }); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} noValidate className="card pad" style={{ maxWidth: 640 }}>
      {errs.form && <div className="form-error" role="alert">{errs.form}</div>}
      <Field label="Name" error={errs.name} htmlFor="p-name"><input id="p-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errs.name} /></Field>
      <Field label="Email" hint="Your email is your sign-in and can’t be changed here." htmlFor="p-email"><input id="p-email" className="input" value={user.email} disabled /></Field>
      <div className="form-row">
        <Field label="Phone" htmlFor="p-phone"><input id="p-phone" className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="City" htmlFor="p-city"><input id="p-city" className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
      </div>
      <Field label="About you" hint="Optional – 240 characters." htmlFor="p-bio"><textarea id="p-bio" className="textarea" maxLength={240} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

function PreferencesTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const pr = user.preferences || {};
  const [f, setF] = useState({ experience: pr.experience || 'beginner', lightConditions: pr.lightConditions || 'unsure', pets: pr.pets || 'unspecified', petInfo: pr.petInfo || '', climate: pr.climate || 'tropical-india', preferredTypes: pr.preferredTypes || [] });
  const [busy, setBusy] = useState(false);
  const toggleType = (t) => setF((s) => ({ ...s, preferredTypes: s.preferredTypes.includes(t) ? s.preferredTypes.filter((x) => x !== t) : [...s.preferredTypes, t] }));
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.put('/auth/me', { preferences: f }); setUser(r.user); toast.success('Preferences saved. Recommendations will use them.'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="card pad" style={{ maxWidth: 640 }}>
      <div className="alert info" style={{ marginBottom: 18 }}><Sparkles size={18} /><span>These preferences pre-fill the Plant Matchmaker and Room Planner, and the climate setting adjusts seasonal watering in your Care Calendar.</span></div>
      <div className="form-row">
        <Field label="Plant experience" htmlFor="pf-exp"><select id="pf-exp" className="select" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select></Field>
        <Field label="Typical light at home" htmlFor="pf-light"><select id="pf-light" className="select" value={f.lightConditions} onChange={(e) => setF({ ...f, lightConditions: e.target.value })}>{Object.entries(LIGHT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </div>
      <div className="form-row">
        <Field label="Pets at home" htmlFor="pf-pets"><select id="pf-pets" className="select" value={f.pets} onChange={(e) => setF({ ...f, pets: e.target.value })}><option value="unspecified">Prefer not to say</option><option value="no">No pets</option><option value="yes">Yes</option></select></Field>
        <Field label="Pet details (optional)" htmlFor="pf-pi"><input id="pf-pi" className="input" maxLength={120} placeholder="e.g. one curious cat" value={f.petInfo} onChange={(e) => setF({ ...f, petInfo: e.target.value })} /></Field>
      </div>
      <Field label="Climate (for seasonal care)" htmlFor="pf-cl"><select id="pf-cl" className="select" value={f.climate} onChange={(e) => setF({ ...f, climate: e.target.value })}><option value="tropical-india">Tropical India (summer, monsoon, winter)</option><option value="temperate-north">Temperate – northern hemisphere</option><option value="temperate-south">Temperate – southern hemisphere</option></select></Field>
      <div className="field"><span className="label">Plant types you love</span><div className="row wrap">{Object.entries(TYPE_LABEL).map(([v, l]) => <button key={v} type="button" className={`chip${f.preferredTypes.includes(v) ? ' is-on' : ''}`} aria-pressed={f.preferredTypes.includes(v)} onClick={() => toggleType(v)}>{l}</button>)}</div></div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>
    </form>
  );
}

function AddressesTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [edit, setEdit] = useState(null); // address object | 'new'
  const [form, setForm] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = (a) => { setEdit(a || 'new'); setForm(a ? { ...EMPTY, ...a } : { ...EMPTY, fullName: user.name, phone: user.profile?.phone || '' }); setErrs({}); };
  const save = async (e) => {
    e.preventDefault();
    const er = validateAddress(form);
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const r = edit === 'new' ? await api.post('/auth/addresses', form) : await api.put(`/auth/addresses/${edit.id}`, form);
      setUser(r.user); setEdit(null); toast.success('Address saved.');
    } catch (err) { setErrs(err.errors || { form: errorMessage(err) }); } finally { setBusy(false); }
  };
  const setDefault = async (a) => { try { const r = await api.put(`/auth/addresses/${a.id}`, { ...a, isDefault: true }); setUser(r.user); toast.success('Default address updated.'); } catch (err) { toast.error(errorMessage(err)); } };
  const remove = async () => { setBusy(true); try { const r = await api.del(`/auth/addresses/${del.id}`); setUser(r.user); setDel(null); toast.info('Address removed.'); } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); } };

  return (
    <div>
      <div className="row between wrap" style={{ marginBottom: 16 }}><p className="muted" style={{ margin: 0 }}>Saved addresses are available at checkout.</p><button className="btn btn-primary btn-sm" onClick={() => open(null)}><Plus size={15} /> Add address</button></div>
      {user.addresses.length === 0 ? <div className="panel center muted">No saved addresses yet.</div> : (
        <div className="grid cols-2">
          {user.addresses.map((a) => (
            <div key={a.id} className="card pad-sm">
              <div className="row between"><div className="row"><MapPin size={16} /><strong>{a.label}</strong>{a.isDefault && <span className="chip dark">Default</span>}</div></div>
              <p className="small" style={{ margin: '10px 0' }}><b>{a.fullName}</b><br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
              <div className="row wrap" style={{ gap: 12 }}>
                <button className="btn-link small" onClick={() => open(a)}><Edit3 size={13} style={{ verticalAlign: '-2px' }} /> Edit</button>
                {!a.isDefault && <button className="btn-link small" onClick={() => setDefault(a)}>Make default</button>}
                <button className="btn-link small danger-link" onClick={() => setDel(a)}><Trash2 size={13} style={{ verticalAlign: '-2px' }} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'Add address' : 'Edit address'} wide>
        <form onSubmit={save} noValidate>
          {errs.form && <div className="form-error" role="alert">{errs.form}</div>}
          <AddressForm value={form} onChange={setForm} errors={errs} />
          <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" checked={!!form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /><span>Make this my default address</span></label>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete this address?" message={del ? `${del.label} – ${del.line1}, ${del.city} will be removed from your account.` : ''} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} busy={busy} />
    </div>
  );
}

function PasswordTab() {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.currentPassword) er.currentPassword = 'Enter your current password.';
    if (f.newPassword.length < 8 || !/[A-Za-z]/.test(f.newPassword) || !/\d/.test(f.newPassword)) er.newPassword = 'Use at least 8 characters with a letter and a number.';
    if (f.confirm !== f.newPassword) er.confirm = 'Passwords do not match.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await api.put('/auth/me/password', { currentPassword: f.currentPassword, newPassword: f.newPassword }); toast.success('Password updated.'); setF({ currentPassword: '', newPassword: '', confirm: '' }); } catch (err) { setErrs(err.errors || { currentPassword: errorMessage(err) }); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} noValidate className="card pad" style={{ maxWidth: 480 }}>
      <Field label="Current password" error={errs.currentPassword} htmlFor="pw-c"><input id="pw-c" type="password" className="input" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} aria-invalid={!!errs.currentPassword} /></Field>
      <Field label="New password" error={errs.newPassword} htmlFor="pw-n"><input id="pw-n" type="password" className="input" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} aria-invalid={!!errs.newPassword} /></Field>
      <Field label="Confirm new password" error={errs.confirm} htmlFor="pw-c2"><input id="pw-c2" type="password" className="input" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} aria-invalid={!!errs.confirm} /></Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  return (
    <>
      <PageHead eyebrow="Your account" title={`Hello, ${user.name.split(' ')[0]}`}>Manage your details, preferences and saved addresses. <Link to="/orders"><b>View your orders →</b></Link></PageHead>
      <div className="container section tight">
        <div className="tabs" role="tablist" style={{ marginBottom: 24 }}>
          {[['profile', 'Profile'], ['prefs', 'Plant preferences'], ['addresses', 'Addresses'], ['password', 'Password']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={`tab${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'prefs' && <PreferencesTab />}
        {tab === 'addresses' && <AddressesTab />}
        {tab === 'password' && <PasswordTab />}
      </div>
    </>
  );
}

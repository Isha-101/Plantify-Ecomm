import { useEffect, useState } from 'react';
import { Modal, Field, SmartImage } from './ui.jsx';
import { api, errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { LIGHT_LABEL, ROOM_LABEL, todayKey } from '../utils/format.js';
import { notifyGardenChanged } from '../context/RemindersContext.jsx';

/** Adds a plant to My Garden. Pass `product` to preset it, or leave it empty to let the user pick any plant (or enter their own). */
export default function AddToGardenModal({ open, onClose, product: preset, onAdded }) {
  const toast = useToast();
  const needList = open && !preset;
  const list = useApi((signal) => api.get('/care/plants', null, { signal }), [needList], { enabled: needList });
  const [productId, setProductId] = useState('');
  const [custom, setCustom] = useState(false);
  const [f, setF] = useState({ nickname: '', speciesName: '', location: 'living-room', light: '', acquiredOn: todayKey(), notes: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const selected = preset || (list.data?.plants || []).find((p) => p.id === productId) || null;
  useEffect(() => { if (open) { setErrs({}); setMsg(''); setF((s) => ({ ...s, nickname: preset?.name || '', acquiredOn: todayKey(), light: preset?.light || '' })); } }, [open, preset]);
  useEffect(() => { if (selected && !f.nickname) setF((s) => ({ ...s, nickname: selected.name, light: selected.light || s.light })); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErrs({}); setMsg('');
    if (!selected && !custom) { setMsg('Choose a plant from the list, or switch to “my own plant”.'); return; }
    if (custom && f.speciesName.trim().length < 2) { setErrs({ speciesName: 'Enter the plant type.' }); return; }
    setBusy(true);
    try {
      const body = { productId: custom ? undefined : selected.id, nickname: f.nickname.trim() || (custom ? f.speciesName.trim() : selected.name), speciesName: custom ? f.speciesName.trim() : undefined, location: f.location, light: f.light || undefined, acquiredOn: f.acquiredOn || undefined, notes: f.notes.trim() };
      const r = await api.post('/garden', body);
      toast.success(`${r.plant.nickname} joined your garden!`, { action: { to: `/garden/${r.plant.id}`, label: 'Open plant' } });
      toast.rewards(r.rewards);
      notifyGardenChanged();
      onAdded?.(r.plant);
      onClose();
    } catch (err) {
      setErrs(err.errors || {});
      setMsg(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add to My Garden">
      <form onSubmit={submit} noValidate>
        {msg && <div className="form-error" role="alert">{msg}</div>}
        {preset ? (
          <div className="row" style={{ marginBottom: 16 }}><SmartImage src={preset.image} alt="" width="56" height="56" className="thumb" /><div><strong>{preset.name}</strong><div className="small muted">We’ll set up a care schedule for it.</div></div></div>
        ) : (
          <>
            <div className="row wrap" style={{ marginBottom: 12 }}>
              <button type="button" className={`chip${!custom ? ' is-on' : ''}`} onClick={() => setCustom(false)}>Plant from Plantify</button>
              <button type="button" className={`chip${custom ? ' is-on' : ''}`} onClick={() => setCustom(true)}>My own plant</button>
            </div>
            {!custom ? (
              <Field label="Plant" htmlFor="ag-plant">
                <select id="ag-plant" className="select" value={productId} onChange={(e) => { setProductId(e.target.value); setF((s) => ({ ...s, nickname: '' })); }}>
                  <option value="">Choose a plant…</option>
                  {(list.data?.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            ) : (
              <Field label="Plant type" error={errs.speciesName} htmlFor="ag-species"><input id="ag-species" className="input" value={f.speciesName} onChange={set('speciesName')} placeholder="e.g. Neighbour’s money plant" aria-invalid={!!errs.speciesName} /></Field>
            )}
          </>
        )}
        <Field label="Nickname" error={errs.nickname} htmlFor="ag-nick"><input id="ag-nick" className="input" value={f.nickname} onChange={set('nickname')} placeholder="e.g. Sunny" maxLength={60} aria-invalid={!!errs.nickname} /></Field>
        <div className="form-row">
          <Field label="Where does it live?" htmlFor="ag-loc"><select id="ag-loc" className="select" value={f.location} onChange={set('location')}>{Object.entries(ROOM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Light there" htmlFor="ag-light"><select id="ag-light" className="select" value={f.light} onChange={set('light')}><option value="">Use plant’s default</option>{Object.entries(LIGHT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <Field label="Date you got it" hint="Used to schedule the first care tasks." htmlFor="ag-date"><input id="ag-date" className="input" type="date" max={todayKey()} value={f.acquiredOn} onChange={set('acquiredOn')} /></Field>
        <Field label="Notes (optional)" htmlFor="ag-notes"><textarea id="ag-notes" className="textarea" style={{ minHeight: 70 }} value={f.notes} onChange={set('notes')} maxLength={500} /></Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add to garden'}</button>
        </div>
      </form>
    </Modal>
  );
}

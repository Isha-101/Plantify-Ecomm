import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Check, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Icon from '../components/Icon.jsx';
import { Breadcrumbs, ErrorState, PageHead, SmartImage } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { NOTIFY_KEY, notifyGardenChanged, useReminders } from '../context/RemindersContext.jsx';
import { readString, writeString } from '../utils/storage.js';
import { TASK_LABEL, pluralize } from '../utils/format.js';

const TASK_ICON = { water: 'droplets', fertilize: 'sprout', mist: 'cloud-drizzle', rotate: 'refresh-cw', prune: 'scissors', repot: 'package-open', clean: 'sparkles', 'pest-check': 'bug' };
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const shiftMonth = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (key) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const dayLabel = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export default function CareCalendar() {
  const toast = useToast();
  const rem = useReminders();
  const [month, setMonth] = useState('');
  const [sel, setSel] = useState('');
  const [busy, setBusy] = useState('');
  const [notifyOn, setNotifyOn] = useState(readString(NOTIFY_KEY) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const { data, error, loading, reload } = useApi((signal) => api.get('/garden/calendar', { month }, { signal }), [month]);

  useEffect(() => { if (data && !month) setMonth(data.month); }, [data, month]);
  useEffect(() => { if (data && !sel) setSel(data.today); }, [data, sel]);

  const grid = useMemo(() => {
    if (!data) return [];
    const [y, m] = data.month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells = Array(lead).fill(null);
    for (let d = 1; d <= count; d++) cells.push(`${data.month}-${String(d).padStart(2, '0')}`);
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [data]);

  const markDone = async (ev) => {
    const key = `${ev.plantId}${ev.type}`;
    setBusy(key);
    try {
      const r = await api.post(`/garden/${ev.plantId}/care`, { type: ev.type });
      toast.success(`${TASK_LABEL[ev.type]} logged for ${r.plant.nickname}.`); toast.rewards(r.rewards);
      notifyGardenChanged(); reload(); rem?.refresh();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(''); }
  };

  const toggleNotify = async () => {
    if (notifyOn) { writeString(NOTIFY_KEY, '0'); setNotifyOn(false); toast.info('Browser notifications turned off.'); return; }
    if (typeof Notification === 'undefined') { toast.error('This browser does not support notifications. In-app reminders still work.'); return; }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm === 'granted') { writeString(NOTIFY_KEY, '1'); setNotifyOn(true); toast.success('Notifications on – you’ll get a daily nudge while Plantify is open.'); }
    else toast.error('Notifications are blocked in your browser settings. In-app reminders still work.');
  };

  const days = data?.days || {};
  const selEvents = sel ? days[sel] || [] : [];
  const worst = (evs) => (evs.some((e) => e.status === 'overdue') ? 'overdue' : evs.some((e) => e.status === 'today') ? 'today' : 'upcoming');

  return (
    <>
      <PageHead eyebrow="My Garden" title="Care calendar">Every task for every plant, in one place. Overdue tasks stay on today until you mark them done.</PageHead>
      <div className="container section tight">
        <Breadcrumbs items={[{ label: 'My Garden', to: '/garden' }, { label: 'Care calendar' }]} />
        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <div className="skeleton" style={{ height: 420 }} /> : (
          <div className="cal-layout">
            <section className="card pad" aria-label="Month view" style={{ opacity: loading ? 0.7 : 1 }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <button className="icon-btn" onClick={() => { setMonth(shiftMonth(data.month, -1)); setSel(''); }} aria-label="Previous month"><ChevronLeft size={20} /></button>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{monthLabel(data.month)}</h2>
                <button className="icon-btn" onClick={() => { setMonth(shiftMonth(data.month, 1)); setSel(''); }} aria-label="Next month"><ChevronRight size={20} /></button>
              </div>
              <div className="cal-grid" role="grid" aria-label={monthLabel(data.month)}>
                {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
                {grid.map((key, i) => {
                  if (!key) return <div key={`b${i}`} className="cal-cell blank" />;
                  const evs = days[key] || [];
                  const st = evs.length ? worst(evs) : '';
                  return (
                    <button key={key} role="gridcell" className={`cal-cell ${st} ${key === data.today ? 'is-today' : ''} ${key === sel ? 'is-sel' : ''}`} onClick={() => setSel(key)} aria-label={`${dayLabel(key)}: ${evs.length ? pluralize(evs.length, 'task') : 'no tasks'}`} aria-pressed={key === sel}>
                      <span className="cal-num">{Number(key.slice(8))}</span>
                      {evs.length > 0 && <span className="cal-dots">{evs.slice(0, 3).map((e, j) => <i key={j} className={e.status} />)}{evs.length > 3 && <small>+{evs.length - 3}</small>}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="row wrap xs muted" style={{ marginTop: 12, gap: 16 }}><span className="legend overdue">Overdue</span><span className="legend today">Due today</span><span className="legend upcoming">Upcoming</span><span>Later dates are projected assuming you do each task on time.</span></div>
            </section>

            <aside className="stack" style={{ gap: 16 }}>
              <section className="card pad" aria-live="polite">
                <h3 style={{ fontSize: '1.2rem' }}>{sel ? dayLabel(sel) : 'Select a day'}</h3>
                {selEvents.length === 0 ? <p className="muted small">Nothing scheduled this day.</p> : (
                  <ul className="due-list">
                    {selEvents.map((e) => (
                      <li key={`${e.plantId}${e.type}`} className={`due ${e.status}`}>
                        <SmartImage src={e.image} alt="" width="40" height="40" className="thumb" />
                        <div style={{ flex: 1, minWidth: 0 }}><Link to={`/garden/${e.plantId}`}><b>{e.plantName}</b></Link><div className="small muted"><Icon name={TASK_ICON[e.type]} size={13} style={{ verticalAlign: '-2px' }} /> {e.label}{e.status === 'overdue' && ` · ${pluralize(e.daysOverdue, 'day')} overdue`}{e.projected && ' · projected'}</div></div>
                        {sel === data.today && !e.projected && <button className="btn btn-primary btn-sm" disabled={busy === `${e.plantId}${e.type}`} onClick={() => markDone(e)} aria-label={`Mark ${e.label} done for ${e.plantName}`}><Check size={14} /> Done</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card pad">
                <h3 style={{ fontSize: '1.2rem' }}>Next 7 days</h3>
                {data.upcoming.length === 0 ? <p className="muted small">No tasks coming up. Add plants in <Link to="/garden"><b>My Garden</b></Link>.</p> : (
                  <ul className="mini-list">{data.upcoming.slice(0, 12).map((e) => <li key={`${e.date}${e.plantId}${e.type}`}><span className={`dot ${e.status}`} /><span><b>{e.plantName}</b> · {e.label}</span><span className="xs muted">{e.status === 'overdue' ? 'Overdue' : e.date === data.today ? 'Today' : new Date(`${e.date}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span></li>)}</ul>
                )}
              </section>

              <section className="card pad">
                <h3 style={{ fontSize: '1.2rem' }}>Reminders</h3>
                <p className="small">{data.reminders.overdue + data.reminders.dueToday === 0 ? 'You’re all caught up.' : `${pluralize(data.reminders.overdue, 'task')} overdue, ${pluralize(data.reminders.dueToday, 'task')} due today.`} They also show on the bell in the top bar.</p>
                <button className={`btn btn-sm ${notifyOn ? 'btn-ghost' : 'btn-primary'}`} onClick={toggleNotify}>{notifyOn ? <BellOff size={15} /> : <Bell size={15} />} {notifyOn ? 'Turn off browser notifications' : 'Turn on browser notifications'}</button>
                <p className="xs muted" style={{ marginTop: 10, display: 'flex', gap: 6 }}><Info size={14} style={{ flex: 'none', marginTop: 2 }} /><span>Reminders appear while Plantify is open. We don’t send email or push messages when the app is closed in this version.</span></p>
              </section>
              {data.season && <p className="small muted">{data.season.note}</p>}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

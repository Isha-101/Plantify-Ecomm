import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, Droplets, Flame, Lightbulb, Plus, Sprout, Trophy } from 'lucide-react';
import Icon from '../components/Icon.jsx';
import AddToGardenModal from '../components/AddToGardenModal.jsx';
import { EmptyState, ErrorState, PageHead, SmartImage } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { notifyGardenChanged } from '../context/RemindersContext.jsx';
import { ROOM_LABEL, TASK_LABEL, pluralize } from '../utils/format.js';

const HEALTH = { thriving: ['ok', 'Thriving'], ok: ['warn', 'Doing okay'], 'needs-attention': ['bad', 'Needs attention'] };

export function dueText(t, withLabel = true) {
  if (!t) return 'No tasks scheduled';
  const lead = withLabel ? `${t.label} · ` : '';
  if (t.status === 'overdue') return `${lead}${pluralize(-t.daysUntil, 'day')} overdue`;
  if (t.status === 'today') return `${lead}due today`;
  return `${lead}in ${pluralize(t.daysUntil, 'day')}`;
}

/** Points, level, streak, badges and weekly challenges. */
export function Progress({ g, challenges }) {
  const lvl = g.level;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card pad level-card glass-soft" aria-label="Your level">
        <div className="row between"><div><span className="eyebrow">Garden level</span><h3 style={{ margin: '2px 0 0', fontSize: '1.5rem' }}>{lvl.name}</h3></div><Trophy size={30} color="var(--green)" /></div>
        <div className="meter" role="progressbar" aria-valuenow={lvl.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level"><span style={{ width: `${lvl.progressPct}%` }} /></div>
        <div className="row between small"><b>{g.points} pts</b><span className="muted">{lvl.next ? `${lvl.next.min - g.points} to ${lvl.next.name}` : 'Top level reached!'}</span></div>
        <div className="row streak"><Flame size={20} color={g.streak.current ? '#d9822b' : 'var(--sage)'} /><span><b>{g.streak.current}</b>-day care streak</span><span className="xs muted" style={{ marginLeft: 'auto' }}>Best: {g.streak.longest}</span></div>
        {!g.streak.activeToday && <p className="xs muted" style={{ margin: 0 }}>Care for any plant today to {g.streak.current ? 'keep your streak going' : 'start a streak'}.</p>}
      </section>

      {challenges && (
        <section className="card pad" aria-label="Weekly challenges">
          <h3 style={{ fontSize: '1.15rem' }}>This week’s challenges</h3>
          <ul className="challenges">
            {challenges.map((c) => (
              <li key={c.key} className={c.done ? 'done' : ''}>
                <div className="row between small"><span>{c.done && <Check size={14} />} {c.title}</span><b>{c.progress}/{c.target}</b></div>
                <div className="meter"><span style={{ width: `${(c.progress / c.target) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card pad" aria-label="Badges">
        <h3 style={{ fontSize: '1.15rem' }}>Badges <span className="muted small" style={{ fontFamily: 'var(--font-body)' }}>{g.badges.filter((b) => b.earned).length}/{g.badges.length}</span></h3>
        <ul className="badges">
          {g.badges.map((b) => (
            <li key={b.key} className={b.earned ? 'earned' : ''} title={`${b.title} – ${b.description}${b.earned ? ' (earned)' : ' (locked)'}`}>
              <span className="badge-ico"><Icon name={b.icon} size={20} /></span>
              <span className="badge-t">{b.title}</span>
              <span className="sr-only">{b.earned ? 'Earned.' : 'Locked.'} {b.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function MyGarden() {
  const toast = useToast();
  const garden = useApi((signal) => api.get('/garden', null, { signal }), []);
  const stats = useApi((signal) => api.get('/garden/stats', null, { signal }), [garden.data]);
  const [adding, setAdding] = useState(false);
  const [busyKey, setBusyKey] = useState('');

  const markDone = async (plantId, type) => {
    const key = `${plantId}:${type}`;
    setBusyKey(key);
    try {
      const r = await api.post(`/garden/${plantId}/care`, { type });
      toast.success(`${TASK_LABEL[type] || type} logged for ${r.plant.nickname}.`);
      toast.rewards(r.rewards);
      notifyGardenChanged();
      garden.reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusyKey(''); }
  };

  const d = garden.data;
  return (
    <>
      <PageHead eyebrow="My Garden" title="Your plants, your routine">Track every plant, get care reminders and earn points for keeping them happy.</PageHead>
      <div className="container section tight">
        <div className="row between wrap" style={{ marginBottom: 24 }}>
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={18} /> Add a plant</button>
            <Link to="/garden/calendar" className="btn btn-ghost"><CalendarDays size={18} /> Care calendar</Link>
            <Link to="/plant-care/sos" className="btn btn-ghost"><Sprout size={18} /> Plant SOS</Link>
          </div>
          {d?.season && <span className="chip beige" title={d.season.note}>Season: {d.season.name[0].toUpperCase() + d.season.name.slice(1)}</span>}
        </div>

        {garden.error ? <ErrorState message={garden.error} onRetry={garden.reload} /> : !d ? (
          <div className="garden-layout"><div className="skeleton" style={{ height: 360 }} /><div className="skeleton" style={{ height: 360 }} /></div>
        ) : (
          <div className="garden-layout">
            <div className="stack" style={{ gap: 28, minWidth: 0 }}>
              {d.tip && <div className="tip-banner glass"><Lightbulb size={22} /><div><strong>Tip of the day</strong><p style={{ margin: 0 }}>{d.tip}</p></div></div>}

              <section aria-labelledby="due-h">
                <h2 id="due-h" style={{ fontSize: '1.4rem' }}>Needs doing {d.reminders.items.length > 0 && <span className="chip warn">{d.reminders.items.length}</span>}</h2>
                {d.reminders.items.length === 0 ? (
                  <div className="panel good row"><Check size={20} /><span>{d.plants.length ? 'All caught up – nothing is due today. 🌿' : 'Add a plant and we’ll schedule its care here.'}</span></div>
                ) : (
                  <ul className="due-list">
                    {d.reminders.items.map((r) => (
                      <li key={`${r.plantId}${r.type}`} className={`due ${r.status}`}>
                        <SmartImage src={r.image} alt="" width="44" height="44" className="thumb" />
                        <div style={{ flex: 1, minWidth: 0 }}><Link to={`/garden/${r.plantId}`}><b>{r.plantName}</b></Link><div className="small muted">{r.label} · {r.status === 'overdue' ? `${pluralize(r.daysOverdue, 'day')} overdue` : 'due today'}</div></div>
                        <button className="btn btn-primary btn-sm" onClick={() => markDone(r.plantId, r.type)} disabled={busyKey === `${r.plantId}:${r.type}`} aria-label={`Mark ${r.label} done for ${r.plantName}`}><Check size={15} /> Done</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="plants-h">
                <h2 id="plants-h" style={{ fontSize: '1.4rem' }}>My plants {d.plants.length > 0 && <span className="muted small" style={{ fontFamily: 'var(--font-body)' }}>({d.plants.length})</span>}</h2>
                {d.plants.length === 0 ? (
                  <EmptyState icon={Sprout} title="Your garden is empty" text="Add the plants you own (or the ones you just ordered) to get a care schedule, reminders and a growth diary."
                    action={<button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={18} /> Add your first plant</button>}>
                    <p className="small muted" style={{ marginTop: 12 }}>Not sure what to grow? <Link to="/matchmaker"><b>Try the Plant Matchmaker</b></Link>.</p>
                  </EmptyState>
                ) : (
                  <div className="garden-grid">
                    {d.plants.map((p) => {
                      const h = HEALTH[p.health] || HEALTH.ok;
                      const next = p.care.nextTask;
                      const water = p.care.tasks.find((t) => t.type === 'water' && t.enabled);
                      return (
                        <article key={p.id} className="card garden-card">
                          <Link to={`/garden/${p.id}`} className="garden-media" aria-label={`Open ${p.nickname}`}><SmartImage src={p.image} alt="" width="300" height="220" /><span className={`chip ${h[0]} health`}>{h[1]}</span></Link>
                          <div className="garden-body">
                            <h3><Link to={`/garden/${p.id}`}>{p.nickname}</Link></h3>
                            <p className="small muted">{p.speciesName || p.botanicalName || ''}{(p.speciesName || p.botanicalName) ? ' · ' : ''}{ROOM_LABEL[p.location] || 'Other'}</p>
                            <p className={`small due-line ${next?.status || ''}`}>{dueText(next)}</p>
                            {water && next?.type !== 'water' && <p className="xs muted">Next water: {water.status === 'upcoming' ? `in ${pluralize(water.daysUntil, 'day')}` : water.status}</p>}
                            <div className="row between" style={{ marginTop: 'auto' }}>
                              {water ? <button className="btn btn-ghost btn-sm" onClick={() => markDone(p.id, 'water')} disabled={busyKey === `${p.id}:water`}><Droplets size={15} /> Watered</button> : <span />}
                              <Link to={`/garden/${p.id}`} className="link-arrow small">Details →</Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside aria-label="Progress">
              <Progress g={stats.data?.gamification || d.gamification} challenges={stats.data?.challenges} />
              {stats.data && (
                <section className="card pad" style={{ marginTop: 16 }} aria-label="Activity">
                  <h3 style={{ fontSize: '1.15rem' }}>Care activity · last 14 days</h3>
                  <div className="activity" role="img" aria-label={`${stats.data.activity.reduce((n, a) => n + a.count, 0)} care actions in the last 14 days`}>
                    {stats.data.activity.map((a) => <span key={a.date} title={`${a.date}: ${a.count}`} style={{ height: `${Math.min(100, 12 + a.count * 22)}%` }} className={a.count ? 'on' : ''} />)}
                  </div>
                  <div className="row wrap small muted" style={{ marginTop: 10, gap: 12 }}>
                    <span><b>{stats.data.totals.careLogs}</b> care logs</span><span><b>{stats.data.totals.diary}</b> diary entries</span><span><b>{stats.data.totals.growth}</b> measurements</span>
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
      <AddToGardenModal open={adding} onClose={() => setAdding(false)} onAdded={() => garden.reload()} />
    </>
  );
}

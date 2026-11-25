import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { readString, writeString } from '../utils/storage.js';
import { todayKey } from '../utils/format.js';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);
export const useReminders = () => useContext(Ctx);
export const NOTIFY_KEY = 'plantify_notify';
const LAST_KEY = 'plantify_last_notified';

/**
 * Care reminders for the signed-in user (overdue / due today). They are shown in the app (bell icon,
 * calendar) and, if the user opted in, as a browser notification – only while Plantify is open.
 */
export function RemindersProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], overdue: 0, dueToday: 0, today: '' });
  const last = useRef(0);

  const refresh = useCallback(async (force) => {
    if (!user) return;
    if (!force && Date.now() - last.current < 30000) return;
    last.current = Date.now();
    try {
      const r = await api.get('/garden/reminders');
      setData(r);
      const due = r.overdue + r.dueToday;
      if (due > 0 && readString(NOTIFY_KEY) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted' && readString(LAST_KEY) !== todayKey()) {
        writeString(LAST_KEY, todayKey());
        new Notification('Your plants need you 🌿', { body: `${due} care ${due === 1 ? 'task is' : 'tasks are'} due today or overdue.`, icon: '/favicon.svg' });
      }
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setData({ items: [], overdue: 0, dueToday: 0, today: '' }); return undefined; }
    refresh(true);
    const onFocus = () => refresh(false);
    const onChange = () => refresh(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('plantify:garden-changed', onChange);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('plantify:garden-changed', onChange); };
  }, [user, refresh]);

  const value = useMemo(() => ({ ...data, due: data.overdue + data.dueToday, refresh: () => refresh(true) }), [data, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const notifyGardenChanged = () => window.dispatchEvent(new Event('plantify:garden-changed'));

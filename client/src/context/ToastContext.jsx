import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, CircleCheck, Info, Sparkles, X } from 'lucide-react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info, reward: Sparkles };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, message, ...opts }]);
    setTimeout(() => dismiss(id), opts.duration || (type === 'error' ? 6500 : 4200));
    return id;
  }, [dismiss]);

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
      reward: (m, o) => push('reward', m, o),
      /** Announces points / badges returned by the API after a rewarded action. */
      rewards(r) {
        if (!r) return;
        if (r.gained > 0) push('reward', `+${r.gained} garden points`, { title: 'Nice work!' });
        (r.newBadges || []).forEach((b) => push('reward', b.description || '', { title: `Badge unlocked: ${b.title}`, duration: 6500 }));
      },
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => {
          const I = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <span className="t-icon"><I size={17} /></span>
              <div className="t-body">
                {t.title && <strong>{t.title}</strong>}
                {t.message}
                {t.action && <div style={{ marginTop: 4 }}><Link to={t.action.to} onClick={() => dismiss(t.id)}><b>{t.action.label}</b></Link></div>}
              </div>
              <button className="t-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

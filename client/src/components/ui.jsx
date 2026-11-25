import { useEffect, useId, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Leaf, Minus, PawPrint, Plus, RefreshCw, ShieldCheck, ShieldAlert, ShieldQuestion, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const FALLBACK_IMG = '/images/fallback.svg';

export function SmartImage({ src, alt = '', className = '', width, height, eager, ...rest }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <img
      className={className}
      src={broken || !src ? FALLBACK_IMG : src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setBroken(true)}
      {...rest}
    />
  );
}

export function Logo({ light, size = 34 }) {
  return (
    <span className="logo" style={light ? { color: '#fff' } : undefined}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? '#E5F0E5' : '#244C3A'} />
        <path d="M32 52V30" stroke={light ? '#244C3A' : '#E5F0E5'} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M32 32C18 32 12 22 13 12c12-1 19 5 19 20Z" fill={light ? '#477A58' : '#A8BDA5'} />
        <path d="M32 40c12 0 19-8 19-20-12 0-19 7-19 20Z" fill={light ? '#244C3A' : '#E5F0E5'} />
      </svg>
      <span className="logo-word">Plantify</span>
    </span>
  );
}

export function Stars({ value = 0, size = 16, count, showValue = true, label }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars" role="img" aria-label={label || `Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ''}`}>
      <span className="stars-bar" style={{ width: size * 5 }} aria-hidden="true">
        <span className="stars-empty">{[...Array(5)].map((_, i) => <Star key={i} size={size} />)}</span>
        <span className="stars-fill" style={{ width: `${pct}%` }}>{[...Array(5)].map((_, i) => <Star key={i} size={size} fill="currentColor" />)}</span>
      </span>
      {showValue && <span className="stars-num">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="stars-count">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-input" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}>
          <Star size={size} fill={n <= shown ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function PetBadge({ status, compact }) {
  if (!status || status === 'na') return null;
  const map = {
    safe: { cls: 'ok', Icon: ShieldCheck, text: 'Pet-safe' },
    toxic: { cls: 'bad', Icon: ShieldAlert, text: 'Toxic to pets' },
    unknown: { cls: 'warn', Icon: ShieldQuestion, text: 'Pet safety unknown' },
  };
  const m = map[status] || map.unknown;
  return <span className={`chip ${m.cls}`} title={m.text}><m.Icon size={13} />{compact ? (status === 'safe' ? 'Pet-safe' : status === 'toxic' ? 'Toxic' : 'Unknown') : m.text}</span>;
}

export function Modal({ open, onClose, title, children, wide, footer, labelledBy }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('[autofocus],input,select,textarea,button:not(.modal-close)')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal glass${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy || titleId} ref={ref}>
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        {title && <h3 id={titleId}>{title}</h3>}
        {children}
        {footer && <div className="row wrap" style={{ justifyContent: 'flex-end', marginTop: 20 }}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>
      <p className="muted" style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon: Icon = Leaf, title, text, action, children }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={36} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry, title = 'We hit a snag' }) {
  return (
    <div className="empty" role="alert">
      <div className="empty-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><AlertTriangle size={34} /></div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={16} /> Try again</button>}
    </div>
  );
}

export const Spinner = ({ label = 'Loading' }) => <span className="spinner" role="status" aria-label={label} />;
export const PageLoading = () => <div className="page-loading"><Spinner /></div>;

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="card" style={{ padding: 12 }}>
          <div className="skeleton" style={{ aspectRatio: '1/1' }} />
          <div className="skeleton" style={{ height: 16, width: '70%', marginTop: 14 }} />
          <div className="skeleton" style={{ height: 14, width: '40%', marginTop: 10 }} />
          <div className="skeleton" style={{ height: 38, marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" role="alert"><AlertTriangle size={14} />{error}</span>}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, size = 'md', label = 'Quantity' }) {
  return (
    <div className={`qty qty-${size}`} role="group" aria-label={label}>
      <button type="button" className="neu" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity"><Minus size={15} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" className="neu" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity"><Plus size={15} /></button>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
  const out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push('…' + n); out.push(n); });
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /> Prev</button>
      {out.map((n) => (typeof n === 'string' ? <span key={n} className="muted">…</span> : <button key={n} className={`page-num${n === page ? ' is-on' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}>{n}</button>))}
      <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next <ChevronRight size={16} /></button>
    </nav>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page" style={{ color: 'var(--forest)', fontWeight: 600 }}>{it.label}</span>}
          {i < items.length - 1 && <ChevronRight size={13} />}
        </span>
      ))}
    </nav>
  );
}

export function PageHead({ eyebrow, title, children }) {
  return (
    <div className="page-head container">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Protected({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search, notice: 'Please sign in to continue.' }} />;
  return children;
}

export function DemoNote({ children }) {
  return <p className="xs muted demo-note">{children}</p>;
}

export { PawPrint };

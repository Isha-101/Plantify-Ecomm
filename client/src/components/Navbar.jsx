import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Clock, Heart, LogOut, Menu, Package, Search, ShoppingBag, Sprout, TrendingUp, User, X, Leaf, Layers } from 'lucide-react';
import { Logo, SmartImage } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useReminders } from '../context/RemindersContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';
import { useDebounced } from '../hooks/useApi.js';
import { RECENT_SEARCHES, pushToList, useLocalList } from '../hooks/useLocalList.js';
import { formatINR } from '../utils/format.js';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/matchmaker', label: 'Plant Matchmaker' },
  { to: '/plant-care', label: 'Plant Care' },
  { to: '/garden', label: 'My Garden' },
  { to: '/kits', label: 'Plant Kits' },
];

function SearchBox({ onDone, autoFocus }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const dq = useDebounced(q, 220);
  const recent = useLocalList(RECENT_SEARCHES, 6);
  const wrap = useRef(null);

  useEffect(() => {
    let off = false;
    api.get('/products/suggest', { q: dq.trim() }).then((r) => !off && setItems(r.suggestions || [])).catch(() => !off && setItems([]));
    return () => { off = true; };
  }, [dq]);
  useEffect(() => {
    const h = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (text) => {
    const t = text.trim();
    if (!t) return;
    pushToList(RECENT_SEARCHES, t, 6);
    setOpen(false);
    setQ('');
    onDone?.();
    nav(`/search?q=${encodeURIComponent(t)}`);
  };
  const pick = (s) => {
    if (s.type === 'product') { setOpen(false); setQ(''); onDone?.(); nav(`/product/${s.value}`); }
    else if (s.type === 'category') { setOpen(false); setQ(''); onDone?.(); nav(`/shop?category=${s.value}`); }
    else if (s.type === 'guide') { setOpen(false); setQ(''); onDone?.(); nav(`/plant-care/guides/${s.value}`); }
    else go(s.value);
  };
  const showRecent = !q.trim() && recent.list.length > 0;
  const options = q.trim() ? items : [];
  const total = showRecent ? recent.list.length : options.length;

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(1, total + (showRecent ? 0 : 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? total - 1 : a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && showRecent) go(recent.list[active]);
      else if (active >= 0 && options[active]) pick(options[active]);
      else go(q);
    }
  };

  const popular = items.filter((i) => i.type === 'query');
  return (
    <div className="searchbox" ref={wrap} role="search">
      <Search size={18} className="s-icon" aria-hidden="true" />
      <input
        className="input" type="search" value={q} autoFocus={autoFocus} placeholder="Search plants, care, “low light”…" aria-label="Search Plantify"
        role="combobox" aria-expanded={open} aria-controls="search-list" aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
      />
      {open && (
        <div className="search-pop glass" id="search-list" role="listbox">
          {showRecent && (
            <div>
              <div className="sp-head"><span><Clock size={13} /> Recent searches</span><button className="btn-link xs" onClick={recent.clear}>Clear</button></div>
              {recent.list.map((r, i) => (
                <button key={r} role="option" aria-selected={active === i} className={`sp-item${active === i ? ' is-active' : ''}`} onClick={() => go(r)}>
                  <Clock size={15} /><span>{r}</span>
                </button>
              ))}
            </div>
          )}
          {!q.trim() && (
            <div>
              <div className="sp-head"><span><TrendingUp size={13} /> Popular searches</span></div>
              <div className="sp-chips">{popular.map((p) => <button key={p.value} className="chip" onClick={() => go(p.value)}>{p.label}</button>)}</div>
            </div>
          )}
          {q.trim() && options.length === 0 && <div className="sp-empty">No quick matches – press Enter to search everything for “{q.trim()}”.</div>}
          {q.trim() && options.map((s, i) => (
            <button key={s.type + s.value} role="option" aria-selected={active === i} className={`sp-item${active === i ? ' is-active' : ''}`} onClick={() => pick(s)}>
              {s.type === 'product' ? <SmartImage src={s.image} alt="" width="36" height="36" /> : <span className="sp-ico">{s.type === 'category' ? <Layers size={16} /> : s.type === 'guide' ? <Leaf size={16} /> : <Search size={16} />}</span>}
              <span className="sp-label">{s.label}<small>{s.type === 'product' ? formatINR(s.price) : s.type === 'category' ? 'Category' : s.type === 'guide' ? 'Care guide' : 'Search'}</small></span>
            </button>
          ))}
          {q.trim() && <button className="sp-all" onClick={() => go(q)}><Search size={15} /> See all results for “{q.trim()}”</button>}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const cart = useCart();
  const wish = useWishlist();
  const rem = useReminders();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const [acct, setAcct] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const acctRef = useRef(null);

  useEffect(() => { setMenu(false); setAcct(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    const h = (e) => acctRef.current && !acctRef.current.contains(e.target) && setAcct(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; }, [menu]);

  const doLogout = () => { logout(); setAcct(false); toast.info('You have been signed out.'); nav('/'); };

  return (
    <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-inner">
        <button className="icon-btn nav-burger" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}><Menu size={24} /></button>
        <Link to="/" className="nav-logo" aria-label="Plantify – home"><Logo /></Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>)}
        </nav>
        <div className="nav-search"><SearchBox /></div>
        <div className="nav-actions">
          {user && (
            <Link to="/garden/calendar" className="icon-btn" aria-label={rem.due ? `Care reminders: ${rem.due} due` : 'Care calendar'} title="Care reminders">
              <Bell size={22} />{rem.due > 0 && <span className="badge-dot is-alert">{rem.due}</span>}
            </Link>
          )}
          <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wish.count} items`}><Heart size={22} />{wish.count > 0 && <span className="badge-dot">{wish.count}</span>}</Link>
          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${cart.count} items`}><ShoppingBag size={22} />{cart.count > 0 && <span className="badge-dot">{cart.count}</span>}</Link>
          <div className="acct" ref={acctRef}>
            {user ? (
              <>
                <button className="icon-btn acct-btn" onClick={() => setAcct((o) => !o)} aria-haspopup="menu" aria-expanded={acct} aria-label="Account menu"><span className="avatar">{user.name?.[0]?.toUpperCase()}</span></button>
                {acct && (
                  <div className="acct-pop glass" role="menu">
                    <div className="acct-name"><strong>{user.name}</strong><small>{user.email}</small></div>
                    <Link role="menuitem" to="/profile"><User size={16} /> My profile</Link>
                    <Link role="menuitem" to="/orders"><Package size={16} /> My orders</Link>
                    <Link role="menuitem" to="/garden"><Sprout size={16} /> My Garden</Link>
                    <Link role="menuitem" to="/wishlist"><Heart size={16} /> Wishlist</Link>
                    <button role="menuitem" onClick={doLogout}><LogOut size={16} /> Sign out</button>
                  </div>
                )}
              </>
            ) : (
              <Link to="/login" className="btn btn-secondary btn-sm nav-signin"><User size={16} /> Sign in</Link>
            )}
          </div>
        </div>
      </div>

      {menu && (
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
          <aside className="drawer glass" aria-label="Menu">
            <div className="row between" style={{ marginBottom: 16 }}>
              <Logo />
              <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Close menu"><X size={24} /></button>
            </div>
            <SearchBox onDone={() => setMenu(false)} />
            <nav className="drawer-links" aria-label="Mobile">
              {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>{l.label}</NavLink>)}
              <hr className="soft" />
              {user ? (
                <>
                  <Link to="/profile">My profile</Link>
                  <Link to="/orders">My orders</Link>
                  <Link to="/wishlist">Wishlist ({wish.count})</Link>
                  <Link to="/cart">Cart ({cart.count})</Link>
                  <button onClick={() => { setMenu(false); doLogout(); }}>Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login">Sign in</Link>
                  <Link to="/register">Create account</Link>
                  <Link to="/wishlist">Wishlist ({wish.count})</Link>
                  <Link to="/cart">Cart ({cart.count})</Link>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}

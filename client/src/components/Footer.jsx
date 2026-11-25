import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Mail } from 'lucide-react';
import { Logo } from './ui.jsx';
import { api, errorMessage } from '../api/client.js';

const Social = ({ href, label, children }) => (
  <a className="social" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>{children}</a>
);

export function NewsletterForm({ dark }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', msg: '' });
  const submit = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setState({ status: 'error', msg: 'Please enter a valid email address.' }); return; }
    setState({ status: 'loading', msg: '' });
    try {
      const r = await api.post('/newsletter', { email: v });
      setState({ status: 'ok', msg: r.message });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', msg: errorMessage(err) });
    }
  };
  return (
    <form className="newsletter" onSubmit={submit} noValidate aria-label="Newsletter signup">
      <div className="nl-row">
        <label htmlFor={dark ? 'nl-email-f' : 'nl-email'} className="sr-only">Email address</label>
        <div className="nl-input"><Mail size={18} /><input id={dark ? 'nl-email-f' : 'nl-email'} type="email" inputMode="email" autoComplete="email" placeholder="Your email address" value={email} onChange={(e) => { setEmail(e.target.value); if (state.status !== 'idle') setState({ status: 'idle', msg: '' }); }} aria-invalid={state.status === 'error'} aria-describedby="nl-msg" /></div>
        <button className="btn btn-primary" type="submit" disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Joining…' : 'Subscribe'}</button>
      </div>
      <p id="nl-msg" className={`nl-msg ${state.status}`} role={state.status === 'error' ? 'alert' : 'status'}>
        {state.status === 'ok' && <Check size={15} />} {state.msg || 'Seasonal care tips and new arrivals. No spam, unsubscribe any time.'}
      </p>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo light />
            <p>Find your plant. Grow your space. Keep it thriving.</p>
            <div className="socials">
              <Social href="https://www.instagram.com/" label="Instagram"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></svg></Social>
              <Social href="https://www.facebook.com/" label="Facebook"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5v4h3v7h4v-7h3l1-4h-4V7.5c0-.3.2-.5.5-.5H15z" /></svg></Social>
              <Social href="https://x.com/" label="X (Twitter)"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l16 16M20 4L4 20" /></svg></Social>
              <Social href="https://www.youtube.com/" label="YouTube"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" /></svg></Social>
            </div>
          </div>
          <nav className="footer-col" aria-label="About">
            <h4>About</h4>
            <Link to="/about">About Plantify</Link><Link to="/contact">Contact us</Link><Link to="/faq">FAQs</Link>
          </nav>
          <nav className="footer-col" aria-label="Shop">
            <h4>Shop</h4>
            <Link to="/shop?category=indoor-plants">Indoor plants</Link><Link to="/shop?category=succulents">Succulents</Link><Link to="/shop?category=pots-planters">Pots &amp; planters</Link><Link to="/kits">Plant kits</Link>
          </nav>
          <nav className="footer-col" aria-label="Plant care">
            <h4>Plant Care</h4>
            <Link to="/plant-care">Care guides</Link><Link to="/plant-care/sos">Plant SOS</Link><Link to="/garden/calendar">Care calendar</Link><Link to="/matchmaker">Plant Matchmaker</Link>
          </nav>
          <nav className="footer-col" aria-label="Legal">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link>
          </nav>
          <div className="footer-news">
            <h4>Join the garden</h4>
            <NewsletterForm dark />
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Plantify. All rights reserved.</span>
          <span className="xs">Demo store: payments are simulated, and ratings, reviews and sales figures are sample data.</span>
        </div>
      </div>
    </footer>
  );
}

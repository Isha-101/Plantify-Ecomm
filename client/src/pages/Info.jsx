import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CircleCheck, Send } from 'lucide-react';
import { Field, PageHead } from '../components/ui.jsx';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const DEMO = 'Plantify is a demonstration project. Products, prices, ratings, reviews and sales figures are sample data, payments are simulated, and nothing you order will be shipped.';

const FAQ = [
  ['How do payments work?', 'Checkout offers Cash on Delivery, a mock UPI flow and a mock card flow. No real money moves and no real card or UPI details are stored. For the mock card you can use any number that passes the standard check, for example 4242 4242 4242 4242, with any future expiry date.'],
  ['What does shipping cost?', 'Shipping is ₹79, and free when your items total ₹999 or more (after any kit discount). Delivery times shown at checkout are estimates for the demo.'],
  ['Which coupon codes can I try?', 'PLANT10 (10% off orders above ₹499), WELCOME15 (15% off, up to ₹300, on orders above ₹799), GREENGIFT (₹100 off orders above ₹1,499) and FREESHIP (free shipping). The cart tells you if a code doesn’t apply yet and how much more to add.'],
  ['How does order tracking work?', 'Orders move through Order Placed → Processing → Packed → Shipped → Delivered. In this demo the stages advance automatically every couple of minutes, and the order page also has a “Simulate next step” button so you can see every stage quickly.'],
  ['How does the Plant Matchmaker choose plants?', 'You answer seven questions. Each plant gets a score from light match (30%), maintenance effort (20%), space (15%), pet safety (15%), style (10%) and budget (10%). If you have pets, plants that are toxic to them are hidden unless you ask to see them. Every result lists the reasons behind its score.'],
  ['Is the plant care advice reliable?', 'The guides and care sheets are general, widely used guidance for each plant type. Plant SOS is a rule-based checklist of common causes – it is not a lab test and can’t replace looking at your plant. Light, climate and pot size all change what a plant needs.'],
  ['Will I get reminders when the app is closed?', 'No. Care reminders show inside Plantify (the bell icon, My Garden and the care calendar) and, if you turn them on, as a browser notification while Plantify is open. We don’t send email, SMS or push notifications in this version.'],
  ['Can I use the cart without an account?', 'Yes. A guest cart is kept in your browser. When you sign in or register, it is merged with your saved cart. You need an account to check out, keep a wishlist across devices, and use My Garden.'],
  ['Are the reviews real?', 'No – the reviews on seeded products are sample reviews and are labelled as such. Reviews you write while signed in are saved to the demo database.'],
  ['Are the plants safe for pets?', 'Each plant shows a pet-safety label (pet-safe, toxic, or unknown) with a short note. Labels are based on common references, but if a pet eats a plant, contact a vet straight away.'],
  ['Can I return something?', 'Because this is a demo, no physical orders exist. A real store would publish its own returns policy here.'],
];

function Accordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="accordion">
      {FAQ.map(([q, a], i) => (
        <div key={q} className={`acc-item${open === i ? ' is-open' : ''}`}>
          <h3><button id={`faq-b${i}`} aria-expanded={open === i} aria-controls={`faq-p${i}`} onClick={() => setOpen(open === i ? -1 : i)}>{q}<ChevronDown size={18} /></button></h3>
          <div id={`faq-p${i}`} role="region" aria-labelledby={`faq-b${i}`} hidden={open !== i}><p>{a}</p></div>
        </div>
      ))}
    </div>
  );
}

function ContactForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setErrs({});
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'Please enter a valid email address.';
    if (f.message.trim().length < 10) er.message = 'Please write at least 10 characters.';
    if (Object.keys(er).length) { setErrs(er); return; }
    setBusy(true);
    try { const r = await api.post('/contact', { ...f, name: f.name.trim(), email: f.email.trim(), message: f.message.trim() }); setSent(r.message); setF((s) => ({ ...s, subject: '', message: '' })); toast.success('Message sent.'); }
    catch (err) { setErrs(err.errors || { message: errorMessage(err) }); } finally { setBusy(false); }
  };
  if (sent) return <div className="card pad center"><CircleCheck size={40} color="var(--green)" /><h3>Message received</h3><p className="muted">{sent}</p><p className="xs muted">This is a demo, so your message is stored in the demo database and nobody will read it.</p><button className="btn btn-ghost" onClick={() => setSent('')}>Send another</button></div>;
  return (
    <form className="card pad" onSubmit={submit} noValidate>
      <div className="form-row">
        <Field label="Your name" error={errs.name} htmlFor="c-name"><input id="c-name" className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errs.name} /></Field>
        <Field label="Email" error={errs.email} htmlFor="c-email"><input id="c-email" className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errs.email} /></Field>
      </div>
      <Field label="Subject (optional)" htmlFor="c-sub"><input id="c-sub" className="input" value={f.subject} onChange={set('subject')} maxLength={120} /></Field>
      <Field label="Message" error={errs.message} htmlFor="c-msg"><textarea id="c-msg" className="textarea" rows={6} value={f.message} onChange={set('message')} maxLength={2000} aria-invalid={!!errs.message} /></Field>
      <button className="btn btn-primary" disabled={busy}><Send size={16} /> {busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

const Prose = ({ children }) => <div className="prose">{children}</div>;

export default function Info({ page }) {
  if (page === 'faq') return (<><PageHead eyebrow="Help" title="Frequently asked questions">Quick answers about orders, plants and how this demo works.</PageHead><div className="container section tight narrow"><Accordion /><p className="small muted" style={{ marginTop: 24 }}>Something missing? <Link to="/contact"><b>Send us a message</b></Link>.</p></div></>);

  if (page === 'contact') return (
    <><PageHead eyebrow="Contact" title="Say hello">Questions about a plant, an order or this project? Drop us a note.</PageHead>
      <div className="container section tight narrow"><ContactForm /><p className="xs muted" style={{ marginTop: 16 }}>{DEMO}</p></div></>
  );

  if (page === 'privacy') return (
    <><PageHead eyebrow="Legal" title="Privacy policy">What this demo stores and why.</PageHead>
      <div className="container section tight narrow"><Prose>
        <p className="alert info">{DEMO}</p>
        <h2>What we store</h2>
        <p>If you create an account we store your name, email address, a bcrypt hash of your password (never the password itself), your saved addresses, preferences, wishlist, cart, orders, garden records and reviews. Newsletter sign-ups and contact messages store the email and text you submit.</p>
        <h2>What stays in your browser</h2>
        <p>Your sign-in token, a guest cart and wishlist, recent searches, recently viewed plants and reminder settings are kept in your browser’s local storage so the site works between visits. Clearing site data removes them.</p>
        <h2>Payments</h2>
        <p>Payments are simulated. We never ask for real card, UPI or bank details, and an order only keeps the card brand and last four digits (or a masked UPI ID).</p>
        <h2>Sharing</h2>
        <p>We don’t sell or share your data, and the demo doesn’t include analytics or advertising trackers. The only external request the pages make is to Google Fonts for typefaces.</p>
        <h2>Your choices</h2>
        <p>You can update your details on your <Link to="/profile">profile</Link>. To have a demo account removed, <Link to="/contact">contact us</Link>.</p>
      </Prose></div></>
  );

  if (page === 'terms') return (
    <><PageHead eyebrow="Legal" title="Terms of use">The ground rules for this demo.</PageHead>
      <div className="container section tight narrow"><Prose>
        <p className="alert info">{DEMO}</p>
        <h2>Using Plantify</h2>
        <p>You may browse, create a test account and place test orders. Please don’t enter anything you consider sensitive – use sample details for addresses and payments.</p>
        <h2>Orders and payments</h2>
        <p>Orders created here are simulations. No goods are dispatched, no payment is collected and order status changes are generated by the demo.</p>
        <h2>Plant care information</h2>
        <p>Care guides, the Matchmaker, Plant SOS, the compatibility checker and the room planner give general guidance only. Plants vary with light, climate and handling, and pet-safety notes are not veterinary advice.</p>
        <h2>Content you submit</h2>
        <p>Reviews, diary notes and messages you submit must be your own and respectful. We may remove content that isn’t.</p>
        <h2>No warranty</h2>
        <p>The demo is provided as is, without warranties of any kind.</p>
      </Prose></div></>
  );

  return (
    <><PageHead eyebrow="About" title="Find your plant. Grow your space. Keep it thriving.">Plantify helps you choose plants that suit your home, then keeps them alive.</PageHead>
      <div className="container section tight narrow"><Prose>
        <p>Most plants don’t die because people don’t care – they die because the plant wasn’t right for the room, or nobody told them what it needed. Plantify tries to fix both ends: a <Link to="/matchmaker">Plant Matchmaker</Link> that explains why a plant suits you, and a set of tools for the weeks after you bring it home.</p>
        <h2>What you can do here</h2>
        <ul>
          <li><b>Shop</b> plants, pots, soil, seeds, tools and ready-made <Link to="/kits">plant kits</Link>, with filters for light, difficulty and pet safety.</li>
          <li><b>Match</b> plants to your light, space, pets and routine with the <Link to="/matchmaker">Matchmaker</Link>.</li>
          <li><b>Learn</b> from <Link to="/plant-care">care guides and plant sheets</Link>, diagnose a struggling plant with Plant SOS, and check which plants can live together.</li>
          <li><b>Keep</b> a <Link to="/garden">garden</Link> with care schedules, a calendar, a diary and growth tracking – and earn points for looking after it.</li>
          <li><b>Plan</b> a room on the <Link to="/room-planner">light map</Link>.</li>
        </ul>
        <h2>About this build</h2>
        <p className="alert info">{DEMO} Product pictures are original illustrations rather than photographs.</p>
        <p>It is a full-stack app: a React front end, an Express API and a MongoDB database, with JWT sign-in, a server-side cart, order tracking and a seeded catalogue. See the project README for how it works and what its limits are.</p>
      </Prose></div></>
  );
}

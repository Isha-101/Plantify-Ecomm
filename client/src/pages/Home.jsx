import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Droplets, Heart, LifeBuoy, Lightbulb, NotebookPen, Sparkles, Sprout, Sun, Users } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorState, ProductGridSkeleton, SmartImage, PetBadge } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { DIFFICULTY_LABEL, LIGHT_LABEL, formatINR } from '../utils/format.js';

const ROOMS = [
  { slug: 'bedroom', label: 'Bedroom', note: 'Calm, low-fuss air lovers' },
  { slug: 'living-room', label: 'Living Room', note: 'Statement foliage' },
  { slug: 'study', label: 'Study', note: 'Desk-friendly greens' },
  { slug: 'bathroom', label: 'Bathroom', note: 'Humidity-happy plants' },
  { slug: 'balcony', label: 'Balcony', note: 'Sun-lovers & herbs' },
  { slug: 'office', label: 'Office', note: 'Tough, tidy picks' },
];
const KIT_ORDER = ['beginner-plant-kit', 'desk-plant-kit', 'balcony-garden-kit', 'indoor-jungle-starter-kit', 'succulent-collection'];

function Hero() {
  const { data } = useApi((signal) => api.get('/products', { featured: 'true', isPlant: 'true', limit: 12 }, { signal }), []);
  const picks = data?.products || [];
  const pick = picks.length ? picks[Math.floor(Date.now() / 86400000) % picks.length] : null;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <SmartImage className="hero-bg" src="/images/hero.svg" alt="" eager width="1600" height="1000" />
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">Plantify · plants, care &amp; community</span>
          <h1 id="hero-title">Bring a little more green into your life.</h1>
          <p className="hero-sub">Healthy plants, thoughtful care tools and guidance that helps every room, desk and balcony thrive – delivered across India.</p>
          <div className="row wrap">
            <Link to="/shop" className="btn btn-primary btn-lg">Explore Plants <ArrowRight size={18} /></Link>
            <Link to="/matchmaker" className="btn btn-light btn-lg"><Sparkles size={18} /> Find My Perfect Plant</Link>
          </div>
          <ul className="hero-points">
            <li><CheckCircle2 size={16} /> Free shipping over ₹999</li>
            <li><CheckCircle2 size={16} /> Care guidance with every plant</li>
            <li><CheckCircle2 size={16} /> Pet-safety info on every listing</li>
          </ul>
        </div>
        <aside className="hero-card glass" aria-label="Plant recommendation">
          <span className="chip dark"><Sparkles size={13} /> Plant of the day</span>
          {pick ? (
            <>
              <Link to={`/product/${pick.slug}`} className="hc-img"><SmartImage src={pick.image} alt={pick.name} width="600" height="600" /></Link>
              <h3><Link to={`/product/${pick.slug}`}>{pick.name}</Link></h3>
              <p className="small muted" style={{ margin: '0 0 8px' }}>{pick.shortDescription}</p>
              <div className="pc-tags">
                <span className="chip"><Sprout size={12} />{DIFFICULTY_LABEL[pick.difficulty]}</span>
                <span className="chip beige"><Sun size={12} />{LIGHT_LABEL[pick.light]}</span>
                <PetBadge status={pick.petSafe} compact />
              </div>
              <div className="row between" style={{ marginTop: 12 }}>
                <strong className="hc-price">{formatINR(pick.price)}</strong>
                <Link to={`/product/${pick.slug}`} className="btn btn-primary btn-sm">View plant</Link>
              </div>
            </>
          ) : <div className="skeleton" style={{ height: 300, marginTop: 14 }} />}
          <hr className="soft" />
          <Link to="/matchmaker" className="hc-link"><Lightbulb size={16} /> Not sure? Answer 7 quick questions <ArrowRight size={14} /></Link>
        </aside>
      </div>
    </section>
  );
}

function Categories() {
  const { data, loading, error, reload } = useApi((signal) => api.get('/categories', null, { signal }), []);
  return (
    <section className="section" aria-labelledby="cat-title">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Shop by category</span><h2 id="cat-title">Everything a green space needs</h2></div><Link to="/shop" className="link-arrow">Browse all <ArrowRight size={16} /></Link></div>
        {error ? <ErrorState message={error} onRetry={reload} /> : (
          <div className="cat-grid">
            {(loading ? [...Array(10)] : data.categories).map((c, i) => c ? (
              <Link key={c.slug} to={`/shop?category=${c.slug}`} className="cat-card">
                <SmartImage src={`/images/categories/${c.slug}.svg`} alt="" width="300" height="300" />
                <span className="cat-name">{c.name}</span>
                <span className="cat-count">{c.productCount} {c.productCount === 1 ? 'item' : 'items'}</span>
              </Link>
            ) : <div key={i} className="skeleton" style={{ aspectRatio: '1/1.1' }} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function Matchmaker() {
  return (
    <section className="section alt" aria-labelledby="mm-title">
      <div className="container">
        <div className="match-panel glass">
          <div>
            <span className="eyebrow">Plant Matchmaker</span>
            <h2 id="mm-title">Not sure which plant is right for you?</h2>
            <p className="muted">Tell us about your light, space, time and pets. We score every plant in our catalogue against your answers – with clear reasons – and show you the best matches.</p>
            <Link to="/matchmaker" className="btn btn-primary btn-lg"><Sparkles size={18} /> Find My Plant Match</Link>
          </div>
          <ol className="match-steps">
            {['Your space & light', 'Time you can give', 'Experience & style', 'Pets at home'].map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ProductRow({ id, eyebrow, title, subtitle, params, link, labelChip }) {
  const { data, loading, error, reload } = useApi((signal) => api.get('/products', params, { signal }), [JSON.stringify(params)]);
  return (
    <section className="section" aria-labelledby={id}>
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">{eyebrow}</span><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          {link && <Link to={link} className="link-arrow">View all <ArrowRight size={16} /></Link>}
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <ProductGridSkeleton count={params.limit || 4} /> : (
          <div className="product-grid">{data.products.map((p, i) => (
            <div key={p.id} className="pc-wrap">{labelChip && <span className="pc-label"><Sprout size={13} /> {labelChip}</span>}<ProductCard product={p} priority={i < 2} /></div>
          ))}</div>
        )}
      </div>
    </section>
  );
}

function Rooms() {
  return (
    <section className="section beige" aria-labelledby="rooms-title">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Shop by room</span><h2 id="rooms-title">Plants that suit the space you have</h2><p>Every plant is tagged with the rooms it genuinely works in – light, humidity and size considered.</p></div><Link to="/room-planner" className="link-arrow">Try the Room Planner <ArrowRight size={16} /></Link></div>
        <div className="room-grid">
          {ROOMS.map((r) => (
            <Link key={r.slug} to={`/shop?room=${r.slug}`} className="room-card">
              <SmartImage src={`/images/rooms/${r.slug}.svg`} alt="" width="800" height="600" />
              <span className="room-label"><strong>{r.label}</strong><small>{r.note}</small></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kits() {
  const cart = useCart();
  const { data, loading, error, reload } = useApi((signal) => api.get('/kits', null, { signal }), []);
  const kits = data ? KIT_ORDER.map((s) => data.kits.find((k) => k.slug === s)).filter(Boolean) : [];
  return (
    <section className="section" aria-labelledby="kits-title">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Plant kits</span><h2 id="kits-title">Everything in one box</h2><p>Curated bundles – plants, pots, soil and tools that actually work together – at a bundle price. Or build your own.</p></div><Link to="/kits" className="link-arrow">All kits &amp; builder <ArrowRight size={16} /></Link></div>
        {error ? <ErrorState message={error} onRetry={reload} /> : (
          <div className="kit-grid">
            {(loading ? [...Array(5)] : kits).map((k, i) => k ? (
              <article key={k.id} className="kit-card card">
                <Link to="/kits" className="kit-media"><SmartImage src={k.image} alt={k.name} width="600" height="600" /></Link>
                <div className="kit-body">
                  <h3><Link to="/kits">{k.name}</Link></h3>
                  <p className="small muted">{k.shortDescription}</p>
                  <div className="row between"><span><strong>{formatINR(k.price)}</strong> {k.originalPrice > k.price && <s className="muted small">{formatINR(k.originalPrice)}</s>}</span><span className="chip">{k.contents.length} items</span></div>
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => cart.add(k, 1)} disabled={k.stock <= 0}>Add kit to cart</button>
                </div>
              </article>
            ) : <div key={i} className="skeleton" style={{ height: 420 }} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function CareSection() {
  const { data } = useApi((signal) => api.get('/care/tip', null, { signal }), []);
  const items = [
    { to: '/plant-care', icon: BookOpen, title: 'Plant Care Guide', text: 'Plain-language guides and a care sheet for every plant we sell.' },
    { to: '/plant-care/sos', icon: LifeBuoy, title: 'Plant SOS', text: 'Yellow leaves? Brown tips? Pick the symptoms and get likely causes and fixes.' },
    { to: '/garden/calendar', icon: CalendarDays, title: 'Smart Care Calendar', text: 'Watering and feeding reminders that adapt to each plant and the season.' },
    { to: '/garden', icon: NotebookPen, title: 'My Plant Diary', text: 'Track growth, log care and earn points and badges as your garden grows.' },
  ];
  return (
    <section className="section alt" aria-labelledby="care-title">
      <div className="container">
        <div className="section-head"><div><span className="eyebrow">Plant care</span><h2 id="care-title">Keep every plant thriving</h2><p>Buying the plant is the start. These tools help you look after it.</p></div></div>
        <div className="grid cols-4">
          {items.map((c) => (
            <Link key={c.to} to={c.to} className="care-card card">
              <span className="care-ico"><c.icon size={26} /></span>
              <h3>{c.title}</h3>
              <p className="small muted">{c.text}</p>
              <span className="link-arrow small">Open <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
        {data?.tip && <div className="tip-banner glass"><Lightbulb size={22} /><div><strong>Today’s care tip</strong><p style={{ margin: 0 }}>{data.tip}</p></div></div>}
      </div>
    </section>
  );
}

function Community() {
  const ideas = [
    { icon: Droplets, title: 'Water mindfully', text: 'Check the soil, not the calendar. Most houseplants are lost to kindness, not neglect.' },
    { icon: Sprout, title: 'Start small, grow steady', text: 'One easy plant on a bright shelf teaches more than a dozen impulse buys.' },
    { icon: Heart, title: 'Share the green', text: 'Cuttings, pups and seedlings make the best gifts. Pass a little growth along.' },
  ];
  return (
    <section className="section" aria-labelledby="comm-title">
      <div className="container">
        <div className="community glass-dark">
          <div className="comm-copy">
            <span className="eyebrow" style={{ color: '#bfe0c3' }}><Users size={14} style={{ verticalAlign: '-2px' }} /> Grow together</span>
            <h2 id="comm-title" style={{ color: '#fff' }}>A greener home is a slower, kinder way to live.</h2>
            <p style={{ color: '#d6e6d6' }}>Plantify is built around a simple idea: the right plant, in the right place, with a little attention, rewards you every day. Start your garden, log how your plants grow and keep your streak alive.</p>
            <Link to="/garden" className="btn btn-light btn-lg">Start my garden <ArrowRight size={18} /></Link>
          </div>
          <div className="comm-ideas">
            {ideas.map((i) => <div key={i.title} className="idea"><i.icon size={22} /><div><strong>{i.title}</strong><p>{i.text}</p></div></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <Matchmaker />
      <ProductRow id="feat-title" eyebrow="Featured plants" title="Customer-favourite greens" subtitle="Hand-picked plants that are easy to love and easy to keep alive." params={{ featured: 'true', isPlant: 'true', limit: 8 }} link="/shop?featured=true" />
      <Rooms />
      <ProductRow id="begin-title" eyebrow="Beginner-friendly" title="Your first plants, sorted" subtitle="Forgiving, low-maintenance plants and kits that bounce back from mistakes." params={{ beginner: 'true', limit: 4, sort: 'popularity' }} link="/shop?beginner=true" labelChip="Beginner-friendly" />
      <Kits />
      <CareSection />
      <Community />
    </>
  );
}

import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, ProductGridSkeleton, PetBadge, SmartImage, Stars } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR } from '../utils/format.js';

export default function Wishlist() {
  const wish = useWishlist();
  const cart = useCart();
  const { user, ready } = useAuth();
  const key = wish.ids.join(',');
  const { data, loading, error, reload } = useApi((signal) => api.get('/products', { ids: wish.ids, limit: 60 }, { signal }), [key], { enabled: wish.ids.length > 0 && ready });
  const products = (data?.products || []).filter((p) => wish.ids.includes(p.id));

  const moveToCart = async (p) => { const ok = await cart.add(p, 1); if (ok) await wish.remove(p.id); };

  return (
    <div className="container section tight">
      <span className="eyebrow">Saved for later</span>
      <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)' }}>My wishlist</h1>
      {!user && wish.ids.length > 0 && <div className="alert info" style={{ marginBottom: 18 }}><Heart size={18} /><span>Your wishlist is saved on this device. <Link to="/login" state={{ from: '/wishlist' }}><b>Sign in</b></Link> to keep it with your account.</span></div>}
      {wish.ids.length === 0 ? (
        <EmptyState icon={Heart} title="Your wishlist is empty" text="Tap the heart on any plant to save it here for later."><Link to="/shop" className="btn btn-primary">Discover plants</Link></EmptyState>
      ) : error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <ProductGridSkeleton count={Math.min(8, wish.ids.length)} /> : (
        <div className="wish-list">
          {products.map((p) => (
            <article key={p.id} className="wish-row card">
              <Link to={`/product/${p.slug}`} className="cl-img"><SmartImage src={p.image} alt={p.name} width="160" height="160" /></Link>
              <div className="cl-main">
                <h3><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
                <Stars value={p.rating} count={p.numReviews} size={14} />
                <div className="row wrap" style={{ gap: 6 }}>{p.isPlant && <PetBadge status={p.petSafe} compact />}<span className={`small ${p.stock <= 0 ? 'err-text' : 'muted'}`}>{p.stock <= 0 ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}</span></div>
                <div><strong>{formatINR(p.price)}</strong> {p.originalPrice > p.price && <s className="muted small">{formatINR(p.originalPrice)}</s>}</div>
              </div>
              <div className="wish-actions">
                <button className="btn btn-primary btn-sm" onClick={() => moveToCart(p)} disabled={p.stock <= 0}><ShoppingBag size={15} /> Move to cart</button>
                <button className="btn btn-ghost btn-sm" onClick={() => cart.add(p, 1)} disabled={p.stock <= 0}>Add to cart</button>
                <button className="btn-link small danger-link" onClick={() => wish.remove(p.id)}><Trash2 size={13} style={{ verticalAlign: '-2px' }} /> Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Sun, Sprout } from 'lucide-react';
import { SmartImage, Stars, PetBadge } from './ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, LIGHT_LABEL, formatINR } from '../utils/format.js';
import { useState } from 'react';

export default function ProductCard({ product: p, priority }) {
  const cart = useCart();
  const wish = useWishlist();
  const [adding, setAdding] = useState(false);
  const liked = wish.has(p.id);
  const out = p.stock <= 0;

  const quickAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await cart.add(p, 1);
    setAdding(false);
  };

  return (
    <article className="product-card card">
      <div className="pc-media">
        <Link to={`/product/${p.slug}`} aria-label={`${p.name} – view details`} tabIndex={-1}>
          <SmartImage src={p.image} alt={p.name} width="600" height="600" eager={priority} />
        </Link>
        {p.discountPercent > 0 && <span className="pc-badge">{p.discountPercent}% off</span>}
        {out && <span className="pc-badge out">Out of stock</span>}
        <button className={`pc-wish neu${liked ? ' is-on' : ''}`} onClick={() => wish.toggle(p)} aria-pressed={liked} aria-label={liked ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="pc-body">
        <div className="pc-cat">{p.subcategory && p.isPlant ? p.subcategory : CATEGORY_LABEL[p.category] || p.category}</div>
        <h3 className="pc-name"><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <Stars value={p.rating} count={p.numReviews} size={14} />
        <div className="pc-tags">
          {p.isPlant && p.difficulty && <span className="chip"><Sprout size={12} />{DIFFICULTY_LABEL[p.difficulty]}</span>}
          {p.isPlant && p.light && <span className="chip beige"><Sun size={12} />{LIGHT_LABEL[p.light]}</span>}
          {p.isPlant && <PetBadge status={p.petSafe} compact />}
        </div>
        <div className="pc-price">
          <strong>{formatINR(p.price)}</strong>
          {p.originalPrice > p.price && <s>{formatINR(p.originalPrice)}</s>}
        </div>
        <div className="pc-actions">
          <button className="btn btn-primary btn-sm" onClick={quickAdd} disabled={out || adding}><ShoppingBag size={15} />{out ? 'Sold out' : adding ? 'Adding…' : 'Quick add'}</button>
          <Link className="btn btn-ghost btn-sm" to={`/product/${p.slug}`}>Details</Link>
        </div>
      </div>
    </article>
  );
}

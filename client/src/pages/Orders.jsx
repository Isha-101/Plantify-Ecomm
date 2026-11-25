import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { EmptyState, ErrorState, SmartImage } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { formatDate, formatINR } from '../utils/format.js';

export const statusTone = (s) => (s === 'Delivered' ? 'ok' : s === 'Shipped' ? 'info' : s === 'Order Placed' ? 'warn' : '');

export default function Orders() {
  const { data, loading, error, reload } = useApi((signal) => api.get('/orders', null, { signal }), []);
  return (
    <div className="container section tight">
      <span className="eyebrow">Your account</span>
      <h1 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)' }}>My orders</h1>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <div className="stack">{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div> : data.orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" text="When you place an order it will appear here with live tracking."><Link to="/shop" className="btn btn-primary">Start shopping</Link></EmptyState>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {data.orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.orderNumber}`} className="order-row card">
              <div className="or-thumbs">{o.items.slice(0, 3).map((i, n) => <SmartImage key={n} src={i.image} alt="" width="64" height="64" />)}{o.items.length > 3 && <span>+{o.items.length - 3}</span>}</div>
              <div className="or-main"><strong>{o.orderNumber}</strong><span className="small muted">Placed {formatDate(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}</span><span className="small muted">{o.items.slice(0, 2).map((i) => i.name).join(', ')}{o.items.length > 2 ? '…' : ''}</span></div>
              <div className="or-side"><span className={`chip ${statusTone(o.status)}`}>{o.status}</span><strong>{formatINR(o.pricing.total)}</strong></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Box, Check, ClipboardList, PackageCheck, PackageOpen, Truck } from 'lucide-react';
import AddToGardenModal from '../components/AddToGardenModal.jsx';
import { Breadcrumbs, ErrorState, PageLoading, SmartImage } from '../components/ui.jsx';
import { PaymentLabel } from './OrderConfirmation.jsx';
import { statusTone } from './Orders.jsx';
import { useApi } from '../hooks/useApi.js';
import { api, errorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, formatDateTime, formatINR } from '../utils/format.js';

const ICONS = { 'Order Placed': ClipboardList, Processing: PackageOpen, Packed: Box, Shipped: Truck, Delivered: PackageCheck };

export default function OrderDetail() {
  const { ref } = useParams();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi((signal) => api.get(`/orders/${ref}`, null, { signal }), [ref]);
  const [busy, setBusy] = useState(false);
  const [garden, setGarden] = useState(null);
  const order = data?.order;

  // Orders progress on their own (demo: one stage every few minutes), so refresh quietly while open.
  useEffect(() => {
    if (!order || order.status === 'Delivered') return undefined;
    const t = setInterval(() => api.get(`/orders/${ref}`).then(setData).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [order?.status, ref, setData]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = async () => {
    setBusy(true);
    try { setData(await api.post(`/orders/${ref}/advance`)); toast.success('Order moved to the next stage (demo).'); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  if (loading && !order) return <PageLoading />;
  if (error && !order) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  const delivered = order.status === 'Delivered';

  return (
    <div className="container section tight">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My orders', to: '/orders' }, { label: order.orderNumber }]} />
      <div className="row between wrap" style={{ marginBottom: 20 }}>
        <div><h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', marginBottom: 4 }}>Order {order.orderNumber}</h1><span className="muted">Placed {formatDateTime(order.placedAt)}</span></div>
        <span className={`chip ${statusTone(order.status)}`} style={{ fontSize: '0.95rem', padding: '8px 16px' }}>{order.status}</span>
      </div>

      <section className="card pad" aria-labelledby="trk">
        <div className="row between wrap"><h2 id="trk" style={{ fontSize: '1.3rem', margin: 0 }}>Order tracking</h2>{!delivered && <p className="small muted" style={{ margin: 0 }}>Estimated delivery: <b>{formatDate(order.estimatedDelivery, { weekday: 'short', day: 'numeric', month: 'short' })}</b></p>}</div>
        <ol className="timeline">
          {order.timeline.map((t) => {
            const Icon = ICONS[t.status];
            return (
              <li key={t.status} className={t.current ? 'current' : t.done ? 'done' : 'todo'} aria-current={t.current ? 'step' : undefined}>
                <span className="tl-dot">{t.done && !t.current ? <Check size={18} /> : <Icon size={18} />}</span>
                <span className="tl-label"><strong>{t.status}</strong><small>{t.at ? formatDateTime(t.at) : 'Pending'}</small></span>
              </li>
            );
          })}
        </ol>
        {!delivered && (
          <div className="alert info" style={{ marginTop: 16 }}>
            <Truck size={18} /><span style={{ flex: 1 }}>This is a demo store, so orders move through the stages automatically every couple of minutes. Want to see the next stage right now?</span>
            <button className="btn btn-secondary btn-sm" onClick={advance} disabled={busy}>{busy ? '…' : 'Simulate next step'}</button>
          </div>
        )}
      </section>

      <div className="grid cols-2" style={{ marginTop: 24, alignItems: 'start' }}>
        <section className="card pad" aria-labelledby="itm">
          <h2 id="itm" style={{ fontSize: '1.3rem' }}>Items</h2>
          <ul className="mini-lines">
            {order.items.map((i, n) => (
              <li key={n}>
                <SmartImage src={i.image} alt="" width="52" height="52" />
                <span><Link to={`/product/${i.slug}`}>{i.name}</Link>{i.kitName && <small className="muted"> · {i.kitName}</small>}<small className="muted"> × {i.quantity}</small>
                  {delivered && i.isPlant && <><br /><button className="btn-link xs" onClick={() => setGarden({ id: i.product, name: i.name, image: i.image })}>Add to My Garden</button></>}
                </span>
                <strong>{formatINR(i.unitPrice * i.quantity)}</strong>
              </li>
            ))}
          </ul>
          <dl className="summary">
            <div><dt>Subtotal</dt><dd>{formatINR(order.pricing.subtotal)}</dd></div>
            {order.pricing.kitDiscount > 0 && <div className="save"><dt>Kit discount</dt><dd>− {formatINR(order.pricing.kitDiscount)}</dd></div>}
            {order.pricing.couponDiscount > 0 && <div className="save"><dt>Coupon {order.pricing.couponCode}</dt><dd>− {formatINR(order.pricing.couponDiscount)}</dd></div>}
            <div><dt>Shipping</dt><dd>{order.pricing.shipping ? formatINR(order.pricing.shipping) : 'Free'}</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatINR(order.pricing.total)}</dd></div>
          </dl>
        </section>
        <section className="card pad stack" aria-labelledby="dlv">
          <h2 id="dlv" style={{ fontSize: '1.3rem', margin: 0 }}>Delivery &amp; payment</h2>
          <dl className="kv">
            <dt>Ship to</dt><dd>{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />{order.shippingAddress.phone}</dd>
            <dt>Payment</dt><dd><PaymentLabel payment={order.payment} />{order.payment.transactionId && <><br /><span className="xs muted">Ref {order.payment.transactionId}</span></>}</dd>
          </dl>
          <Link to="/shop" className="btn btn-ghost">Shop again</Link>
        </section>
      </div>
      <AddToGardenModal open={!!garden} onClose={() => setGarden(null)} product={garden} />
    </div>
  );
}

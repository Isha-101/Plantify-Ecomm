import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ErrorState, PageLoading, SmartImage } from '../components/ui.jsx';
import { Stepper } from './Checkout.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { formatDate, formatINR } from '../utils/format.js';

export function PaymentLabel({ payment }) {
  const label = { cod: 'Cash on Delivery', upi: 'UPI (mock)', card: 'Card (mock)' }[payment.method] || payment.method;
  return <>{label}{payment.reference && payment.method !== 'cod' ? ` · ${payment.reference}` : ''} <span className={`chip ${payment.status === 'paid' ? 'ok' : 'warn'}`}>{payment.status === 'paid' ? 'Paid' : 'Pay on delivery'}</span></>;
}

export default function OrderConfirmation() {
  const { ref } = useParams();
  const { state } = useLocation();
  const { data, loading, error, reload } = useApi((signal) => api.get(`/orders/${ref}`, null, { signal }), [ref], { enabled: !state?.order });
  const order = state?.order || data?.order;
  if (loading && !order) return <PageLoading />;
  if (error && !order) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  if (!order) return null;
  return (
    <div className="container section tight">
      <Stepper current={6} />
      <div className="confirm glass">
        <CheckCircle2 size={56} className="confirm-ico" />
        <h1>Thank you – your order is placed!</h1>
        <p className="muted">We’ve received your order and are getting your plants ready. A confirmation was saved to your account.</p>
        <div className="order-no"><small>Order number</small><strong>{order.orderNumber}</strong></div>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Link to={`/orders/${order.orderNumber}`} className="btn btn-primary">Track my order <ArrowRight size={16} /></Link>
          <Link to="/shop" className="btn btn-ghost">Continue shopping</Link>
          <Link to="/garden" className="btn btn-ghost">Set up My Garden</Link>
        </div>
      </div>
      <div className="grid cols-2" style={{ marginTop: 28, alignItems: 'start' }}>
        <div className="card pad">
          <h2 style={{ fontSize: '1.3rem' }}>Items</h2>
          <ul className="mini-lines">{order.items.map((i, n) => <li key={n}><SmartImage src={i.image} alt="" width="52" height="52" /><span>{i.name}{i.kitName && <small className="muted"> · {i.kitName}</small>}<small className="muted"> × {i.quantity}</small></span><strong>{formatINR(i.unitPrice * i.quantity)}</strong></li>)}</ul>
          <dl className="summary">
            <div><dt>Subtotal</dt><dd>{formatINR(order.pricing.subtotal)}</dd></div>
            {order.pricing.kitDiscount > 0 && <div className="save"><dt>Kit discount</dt><dd>− {formatINR(order.pricing.kitDiscount)}</dd></div>}
            {order.pricing.couponDiscount > 0 && <div className="save"><dt>Coupon {order.pricing.couponCode}</dt><dd>− {formatINR(order.pricing.couponDiscount)}</dd></div>}
            <div><dt>Shipping</dt><dd>{order.pricing.shipping ? formatINR(order.pricing.shipping) : 'Free'}</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatINR(order.pricing.total)}</dd></div>
          </dl>
        </div>
        <div className="card pad stack">
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Delivery &amp; payment</h2>
          <dl className="kv">
            <dt>Estimated delivery</dt><dd>{formatDate(order.estimatedDelivery, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
            <dt>Ship to</dt><dd>{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</dd>
            <dt>Payment</dt><dd><PaymentLabel payment={order.payment} /></dd>
          </dl>
          <p className="xs muted" style={{ margin: 0 }}>Demo store: nothing real was charged, and no shipment will arrive.</p>
        </div>
      </div>
    </div>
  );
}

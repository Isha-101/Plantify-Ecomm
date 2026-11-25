import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="container section">
      <EmptyState icon={Leaf} title="This page has wilted" text="We couldn’t find the page you were looking for. It may have moved, or the link might be mistyped.">
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">Back to home</Link>
          <Link to="/shop" className="btn btn-ghost">Browse plants</Link>
        </div>
      </EmptyState>
    </div>
  );
}

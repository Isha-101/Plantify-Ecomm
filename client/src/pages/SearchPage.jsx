import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, LifeBuoy, Search } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { EmptyState, ErrorState, ProductGridSkeleton } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { pushToList, RECENT_SEARCHES } from '../hooks/useLocalList.js';
import { useEffect } from 'react';

const EXAMPLES = ['low light', 'snake', 'watering', 'pet safe', 'beginner', 'succulents', 'balcony'];

export default function SearchPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const q = (sp.get('q') || '').trim();
  const { data, loading, error, reload } = useApi((signal) => api.get('/search', { q }, { signal }), [q]);
  useEffect(() => { if (q) pushToList(RECENT_SEARCHES, q, 6); }, [q]);
  const popular = data?.popular || EXAMPLES;

  return (
    <div className="container section tight">
      <span className="eyebrow">Search</span>
      <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.6rem)' }}>{q ? <>Results for “{q}”</> : 'Search Plantify'}</h1>
      <p className="muted" role="status" aria-live="polite">{loading ? 'Searching…' : q && data ? `${data.total} ${data.total === 1 ? 'result' : 'results'} – ${data.productCount} ${data.productCount === 1 ? 'product' : 'products'}${data.guides.length ? `, ${data.guides.length} care ${data.guides.length === 1 ? 'guide' : 'guides'}` : ''}` : 'Search by plant name, botanical name, category, type, light or a care topic.'}</p>
      <div className="row wrap" style={{ marginBottom: 28 }}>
        <span className="small muted">Try:</span>
        {popular.slice(0, 8).map((p) => <button key={p} className="chip" onClick={() => nav(`/search?q=${encodeURIComponent(p)}`)}>{p}</button>)}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <ProductGridSkeleton count={8} /> : !q ? (
        <>
          <h2 style={{ fontSize: '1.5rem' }}>Popular right now</h2>
          <div className="product-grid">{(data?.suggestedProducts || []).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </>
      ) : data.total === 0 ? (
        <>
          <EmptyState icon={Search} title={`Nothing found for “${q}”`} text="Check the spelling, try a more general word, or try one of these popular searches.">
            <div className="row wrap" style={{ justifyContent: 'center' }}>{popular.slice(0, 6).map((p) => <button key={p} className="chip" onClick={() => nav(`/search?q=${encodeURIComponent(p)}`)}>{p}</button>)}</div>
            <Link to="/shop" className="btn btn-primary">Browse all products</Link>
          </EmptyState>
          {data.suggestedProducts.length > 0 && (<><h2 style={{ fontSize: '1.5rem' }}>You might like</h2><div className="product-grid">{data.suggestedProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div></>)}
        </>
      ) : (
        <>
          {(data.guides.length > 0 || data.problems.length > 0) && (
            <div className="grid cols-2" style={{ marginBottom: 32 }}>
              {data.guides.map((g) => (
                <Link key={g.slug} to={`/plant-care/guides/${g.slug}`} className="card pad-sm search-hit"><BookOpen size={22} /><div><strong>{g.title}</strong><p className="small muted" style={{ margin: 0 }}>{g.summary}</p><span className="chip">{g.category} · {g.readMinutes} min read</span></div></Link>
              ))}
              {data.problems.map((p) => (
                <Link key={p.id} to="/plant-care/sos" className="card pad-sm search-hit"><LifeBuoy size={22} /><div><strong>{p.title}</strong><p className="small muted" style={{ margin: 0 }}>{p.summary}</p><span className="chip warn">Plant SOS</span></div></Link>
              ))}
            </div>
          )}
          {data.products.length > 0 && (<><h2 style={{ fontSize: '1.5rem' }}>Products</h2><div className="product-grid">{data.products.map((p) => <ProductCard key={p.id} product={p} />)}</div></>)}
        </>
      )}
    </div>
  );
}

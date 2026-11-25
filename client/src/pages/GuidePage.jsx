import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Breadcrumbs, ErrorState, PageLoading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';

export default function GuidePage() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi((signal) => api.get(`/care/guides/${slug}`, null, { signal }), [slug]);
  if (loading && !data) return <PageLoading />;
  if (error) return <div className="container section"><ErrorState message={error} onRetry={reload} /></div>;
  const g = data.guide;
  return (
    <div className="container section tight">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Plant Care', to: '/plant-care' }, { label: g.title }]} />
      <article className="guide">
        <header>
          <span className="care-ico"><Icon name={g.icon} size={28} /></span>
          <span className="chip beige">{g.category} · {g.readMinutes} min read</span>
          <h1>{g.title}</h1>
          <p className="lead">{g.summary}</p>
        </header>
        {g.sections.map((s) => <section key={s.heading}><h2>{s.heading}</h2><p>{s.body}</p></section>)}
        {g.tips?.length > 0 && <section><h2>Quick tips</h2><ul className="tips">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul></section>}
        <div className="alert info"><span>Plant care depends on your light, climate and pot. Treat guides as a starting point and let the plant tell you what it needs. Having trouble? <Link to="/plant-care/sos"><b>Try Plant SOS</b></Link>.</span></div>
      </article>
      {data.related.length > 0 && (
        <section style={{ marginTop: 48 }}><h2 style={{ fontSize: '1.6rem' }}>Keep reading</h2><div className="grid cols-3">{data.related.map((r) => <Link key={r.slug} to={`/plant-care/guides/${r.slug}`} className="card guide-card"><span className="care-ico"><Icon name={r.icon} size={24} /></span><h3>{r.title}</h3><p className="small muted">{r.summary}</p></Link>)}</div></section>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'ahora mismo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function estimateReadTime(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const TYPE_LABELS = {
  article: 'Artículo',
  research: 'Investigación',
  post: 'Blog',
  event: 'Evento',
  featured: 'Destacado',
};

function contentPath(type, id) {
  if (type === 'research') return `/research/${id}`;
  if (type === 'post') return `/blog/${id}`;
  if (type === 'event') return `/events/${id}`;
  return `/articles/${id}`;
}

const FeedItem = ({ item }) => {
  const path = contentPath(item.type, item.id);
  const initial = (item.author?.name || '?')[0].toUpperCase();

  return (
    <article style={{ paddingTop: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
      {/* Author + time */}
      <div className="flex items-center gap-2 mb-3">
        {item.author?.avatar ? (
          <img
            src={item.author.avatar}
            alt=""
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>{initial}</span>
          </div>
        )}
        <span className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>
          {item.author?.name || 'Anónimo'}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
          {timeAgo(item.createdAt)}
        </span>
      </div>

      {/* Category */}
      <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
        {item.category || TYPE_LABELS[item.type]}
      </p>

      {/* Title */}
      <Link to={path}>
        <h2
          className="font-display mb-2 transition-colors duration-150"
          style={{ fontSize: '1.25rem', color: 'var(--text)', lineHeight: 1.3 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
        >
          {item.title}
        </h2>
      </Link>

      {/* Excerpt */}
      {item.excerpt && (
        <p
          className="font-sans text-sm mb-3"
          style={{
            color: 'var(--muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.excerpt}
        </p>
      )}

      {/* Cover image */}
      {item.coverImage && (
        <Link to={path} className="block mb-3" style={{ overflow: 'hidden' }}>
          <img
            src={item.coverImage}
            alt=""
            style={{ width: '100%', aspectRatio: '16 / 5', objectFit: 'cover', display: 'block' }}
          />
        </Link>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
          {TYPE_LABELS[item.type]}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
          {estimateReadTime(item.excerpt)} min de lectura
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link
          to={path}
          className="font-sans text-xs transition-colors duration-150"
          style={{ color: 'var(--accent)' }}
        >
          Leer →
        </Link>
      </div>
    </article>
  );
};

export default FeedItem;

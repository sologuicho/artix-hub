import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const StatTile = ({ label, value, sub }) => (
  <div style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
    <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>{label}</p>
    <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--muted)', marginTop: '0.5rem', letterSpacing: '0.04em' }}>{sub}</p>}
  </div>
);

const PageBtn = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
      color: 'var(--muted)', padding: '0.25rem', display: 'flex', alignItems: 'center',
      opacity: disabled ? 0.3 : 1, transition: 'color 0.15s',
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = 'var(--text)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
  >
    {children}
  </button>
);

const SelectCell = ({ value, onChange, options, accent }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      fontFamily: MONO, fontSize: '0.6875rem',
      background: 'none', border: '1px solid var(--border)',
      color: accent || 'var(--text)',
      padding: '0.25rem 0.5rem', cursor: 'pointer', outline: 'none',
    }}
  >
    {options.map(([val, label]) => (
      <option key={val} style={{ backgroundColor: 'var(--bg)' }} value={val}>{label || val}</option>
    ))}
  </select>
);

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab]     = useState('users');
  const [stats, setStats]             = useState(null);
  const [users, setUsers]             = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError]             = useState(null);

  const [content, setContent]         = useState([]);
  const [contentPagination, setContentPagination] = useState({ page: 1, totalPages: 1 });
  const [contentType, setContentType] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  const [studentVerifications, setStudentVerifications] = useState([]);
  const [studentPagination, setStudentPagination]       = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingStudents, setLoadingStudents]           = useState(false);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(pagination.page, searchQuery), 400);
    return () => clearTimeout(t);
  }, [pagination.page, searchQuery]);

  useEffect(() => {
    if (activeTab === 'content') fetchContent(1, contentType);
    if (activeTab === 'students') fetchStudents(1);
  }, [activeTab, contentType]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res  = await fetch(`${BACKEND_URL}/api/admin/stats`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStats(data.stats);
      else setError(data.message || 'Error al cargar métricas');
    } catch { setError('Error de conexión'); }
    finally { setLoadingStats(false); }
  };

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      const res  = await fetch(`${BACKEND_URL}/api/admin/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setPagination({ page: data.pagination.page, limit: data.pagination.limit, totalPages: data.pagination.totalPages || 1 });
      } else setError(data.message || 'Error al cargar usuarios');
    } catch { setError('Error de conexión'); }
    finally { setLoadingUsers(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setUsers(us => us.map(u => u.id === userId ? { ...u, role: data.user.role } : u));
      else setError(data.message || 'Error al cambiar rol');
    } catch { setError('Error de conexión'); }
  };

  const handleTierChange = async (userId, newTier) => {
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ tier: newTier }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setUsers(us => us.map(u => u.id === userId ? { ...u, subscriptionTier: data.user.subscriptionTier } : u));
      else setError(data.message || 'Error al cambiar tier');
    } catch { setError('Error de conexión'); }
  };

  const fetchContent = async (page = 1, type = '') => {
    setLoadingContent(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (type) params.append('type', type);
      const res  = await fetch(`${BACKEND_URL}/api/admin/content?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setContent(data.content);
        setContentPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
      } else setError(data.message || 'Error al cargar contenido');
    } catch { setError('Error de conexión'); }
    finally { setLoadingContent(false); }
  };

  const handleDeleteContent = async (type, id, title) => {
    if (!window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/content/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setContent(prev => prev.filter(item => !(item.id === id && item.type === type)));
      else setError(data.message || 'Error al eliminar');
    } catch { setError('Error de conexión'); }
  };

  const fetchStudents = async (page = 1) => {
    setLoadingStudents(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/student-verifications?page=${page}&limit=20`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setStudentVerifications(data.verifications);
        setStudentPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages || 1, total: data.pagination.total });
      } else setError(data.message || 'Error al cargar verificaciones');
    } catch { setError('Error de conexión'); }
    finally { setLoadingStudents(false); }
  };

  const handleApproveStudent = async (id) => {
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/student-verifications/${id}/approve`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setStudentVerifications(vs => vs.filter(v => v.id !== id));
      else setError(data.message || 'Error al aprobar');
    } catch { setError('Error de conexión'); }
  };

  const handleRejectStudent = async (id) => {
    const reason = window.prompt('Motivo del rechazo (opcional):');
    if (reason === null) return;
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/student-verifications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) setStudentVerifications(vs => vs.filter(v => v.id !== id));
      else setError(data.message || 'Error al rechazar');
    } catch { setError('Error de conexión'); }
  };

  const handleBanToggle = async (userId, currentBan) => {
    setError(null);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ banned: !currentBan }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setUsers(us => us.map(u => u.id === userId ? { ...u, banned: data.user.banned } : u));
      else setError(data.message || 'Error al cambiar estado');
    } catch { setError('Error de conexión'); }
  };

  if (!user || (user.role !== 'ADMIN' && user.role !== 'admin')) {
    return <Navigate to="/" replace />;
  }

  const privileged =
    (stats?.usersByTier?.RESEARCHER || 0) +
    (stats?.usersByTier?.VISIONARY  || 0) +
    (stats?.usersByTier?.TEAM       || 0);

  const thStyle = {
    fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--muted)',
    textAlign: 'left', paddingBottom: '0.625rem',
    borderBottom: '1px solid var(--border)', paddingRight: '1.5rem',
  };
  const tdStyle = { borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem 0.75rem 0' };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">

        {/* ── Header ── */}
        <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={14} style={{ color: '#C4451A' }} />
            <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4451A' }}>Admin</span>
          </div>
          <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '2rem', color: 'var(--text)' }}>
            Panel de Administrador
          </h1>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', border: '1px solid #C4451A', color: '#C4451A' }}>
            <span style={{ fontFamily: SANS, fontSize: '0.875rem' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4451A', fontFamily: MONO, fontSize: '1rem' }}>×</button>
          </div>
        )}

        {/* ── Stats grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0, border: '1px solid var(--border)', marginBottom: '4rem' }}
          className="md:grid-cols-4">
          {[
            { label: 'Usuarios totales', value: loadingStats ? '…' : stats?.totalUsers || 0, sub: stats?.usersByTier ? Object.entries(stats.usersByTier).map(([k, v]) => `${k}: ${v}`).join(' · ') : '' },
            { label: 'Privilegiados',    value: loadingStats ? '…' : privileged, sub: 'Researcher + Visionary + Team' },
            { label: 'Artículos',        value: loadingStats ? '…' : stats?.totalArticles || 0, sub: 'Publicados en la plataforma' },
            { label: 'Blog posts',       value: loadingStats ? '…' : stats?.totalBlogs    || 0, sub: 'Entradas de blog y foro' },
          ].map(({ label, value, sub }, i, arr) => (
            <div key={label} style={{ borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <StatTile label={label} value={value} sub={sub} />
            </div>
          ))}
        </div>

        {/* ── Tab navigation ── */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'users',    label: 'Usuarios' },
            { id: 'content',  label: 'Contenido' },
            { id: 'students', label: studentPagination.total > 0 ? `Estudiantes (${studentPagination.total})` : 'Estudiantes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                paddingBottom: '0.75rem', marginBottom: '-1px',
                color: activeTab === tab.id ? '#C4451A' : 'var(--muted)',
                borderBottom: activeTab === tab.id ? '2px solid #C4451A' : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content tab ── */}
        {activeTab === 'content' && (
          <section>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)' }}>
                Moderación de contenido
              </h2>
              <select
                value={contentType}
                onChange={e => { setContentType(e.target.value); setContentPagination(p => ({ ...p, page: 1 })); }}
                style={{ fontFamily: MONO, fontSize: '0.6875rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.375rem 0.75rem', cursor: 'pointer', outline: 'none' }}
              >
                <option value="">Todos los tipos</option>
                <option value="article">Artículos</option>
                <option value="research">Investigaciones</option>
                <option value="event">Eventos</option>
                <option value="blogpost">Blog posts</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Tipo', 'Título', 'Autor', 'Fecha', 'Acción'].map((h, i) => (
                      <th key={h} style={{ ...thStyle, textAlign: i === 4 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingContent ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} style={tdStyle}><div style={{ height: 14, backgroundColor: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : content.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontFamily: MONO, fontSize: '0.6875rem' }}>
                        No hay contenido.
                      </td>
                    </tr>
                  ) : content.map(item => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>{item.type}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)' }}>{item.title || 'Sin título'}</span>
                      </td>
                      <td style={tdStyle}>
                        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)' }}>{item.author?.name || '—'}</p>
                        <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>{item.author?.email}</p>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                          {new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteContent(item.type, item.id, item.title || 'este contenido')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4451A', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.65'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
              <span>Página {contentPagination.page} de {contentPagination.totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PageBtn onClick={() => { const p = Math.max(1, contentPagination.page - 1); setContentPagination(prev => ({ ...prev, page: p })); fetchContent(p, contentType); }} disabled={contentPagination.page <= 1}><ArrowLeft size={13} /></PageBtn>
                <PageBtn onClick={() => { const p = Math.min(contentPagination.totalPages, contentPagination.page + 1); setContentPagination(prev => ({ ...prev, page: p })); fetchContent(p, contentType); }} disabled={contentPagination.page >= contentPagination.totalPages}><ArrowRight size={13} /></PageBtn>
              </div>
            </div>
          </section>
        )}

        {/* ── Students tab ── */}
        {activeTab === 'students' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)' }}>
                Verificaciones pendientes
              </h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Nombre', 'Email', 'Fecha solicitud', 'Documento', 'Acciones'].map((h, i) => (
                      <th key={h} style={{ ...thStyle, textAlign: i === 4 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} style={tdStyle}><div style={{ height: 14, backgroundColor: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : studentVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontFamily: MONO, fontSize: '0.6875rem' }}>
                        No hay solicitudes pendientes.
                      </td>
                    </tr>
                  ) : studentVerifications.map(v => (
                    <tr key={v.id}>
                      <td style={tdStyle}>
                        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{v.user?.name || 'Sin nombre'}</p>
                        <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>@{v.user?.username || 'n/a'}</p>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>{v.user?.email}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                          {new Date(v.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {v.documentUrl ? (
                          <a href={v.documentUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#C4451A', textDecoration: 'none' }}>
                            Ver imagen →
                          </a>
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                            {v.email ? `Email: ${v.email}` : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                          <button
                            onClick={() => handleApproveStudent(v.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4451A' }}
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRejectStudent(v.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', transition: 'color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#e05252'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
              <span>Página {studentPagination.page} de {studentPagination.totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PageBtn onClick={() => { const p = Math.max(1, studentPagination.page - 1); setStudentPagination(prev => ({ ...prev, page: p })); fetchStudents(p); }} disabled={studentPagination.page <= 1}><ArrowLeft size={13} /></PageBtn>
                <PageBtn onClick={() => { const p = Math.min(studentPagination.totalPages, studentPagination.page + 1); setStudentPagination(prev => ({ ...prev, page: p })); fetchStudents(p); }} disabled={studentPagination.page >= studentPagination.totalPages}><ArrowRight size={13} /></PageBtn>
              </div>
            </div>
          </section>
        )}

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <section>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)' }}>
                Gestión de usuarios
              </h2>
              <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
                <Search size={12} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar por email o usuario…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  style={{
                    width: '100%', paddingLeft: '1.25rem',
                    background: 'transparent', border: 'none', outline: 'none',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: SANS, fontSize: '0.875rem',
                    color: 'var(--text)', paddingBottom: '0.375rem',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Usuario', 'Email', 'Rol', 'Membresía', 'Estado', 'Acciones'].map((h, i) => (
                      <th key={h} style={{ ...thStyle, textAlign: i === 5 ? 'center' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={tdStyle}><div style={{ height: 14, backgroundColor: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontFamily: MONO, fontSize: '0.6875rem' }}>
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      {/* User — square avatar */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username || 'U')}&background=random`}
                            alt=""
                            style={{ width: 32, height: 32, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                          />
                          <div>
                            <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', fontWeight: 500 }}>{u.name || 'Sin nombre'}</p>
                            <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>@{u.username || 'n/a'}</p>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>{u.email}</span>
                      </td>

                      <td style={tdStyle}>
                        <SelectCell
                          value={u.role}
                          onChange={(v) => handleRoleChange(u.id, v)}
                          options={[['USER', 'USER'], ['ADMIN', 'ADMIN']]}
                          accent={u.role === 'ADMIN' ? '#C4451A' : undefined}
                        />
                      </td>

                      <td style={tdStyle}>
                        <SelectCell
                          value={u.subscriptionTier}
                          onChange={(v) => handleTierChange(u.id, v)}
                          options={['OBSERVER', 'STUDENT', 'RESEARCHER', 'VISIONARY', 'TEAM'].map(t => [t, t])}
                        />
                      </td>

                      <td style={tdStyle}>
                        <span style={{
                          fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                          border: `1px solid ${u.banned ? '#C4451A' : 'var(--border)'}`,
                          color: u.banned ? '#C4451A' : 'var(--muted)',
                          padding: '0.2rem 0.5rem', display: 'inline-block',
                        }}>
                          {u.banned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleBanToggle(u.id, u.banned)}
                          title={u.banned ? 'Restaurar acceso' : 'Suspender usuario'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: u.banned ? '#6dbf6d' : '#C4451A', transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.65'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          {u.banned ? 'Restaurar' : 'Suspender'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
              <span>Página {pagination.page} de {pagination.totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PageBtn onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1}><ArrowLeft size={13} /></PageBtn>
                <PageBtn onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))} disabled={pagination.page >= pagination.totalPages}><ArrowRight size={13} /></PageBtn>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;

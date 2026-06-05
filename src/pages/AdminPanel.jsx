import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Users, FileText, BookOpen, Search, ArrowLeft, ArrowRight, Ban, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

// ── Stat tile ────────────────────────────────────────────────────────────────
const StatTile = ({ label, value, sub }) => (
  <div style={{ border: '1px solid var(--border)', padding: '1.5rem' }}>
    <p className="font-sans text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>{label}</p>
    <p className="font-display" style={{ fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>{value}</p>
    {sub && <p className="font-sans text-xs mt-2" style={{ color: 'var(--muted)' }}>{sub}</p>}
  </div>
);

// ── AdminPanel ────────────────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  // Content tab state
  const [content, setContent] = useState([]);
  const [contentPagination, setContentPagination] = useState({ page: 1, totalPages: 1 });
  const [contentType, setContentType] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  // Students tab state
  const [studentVerifications, setStudentVerifications] = useState([]);
  const [studentPagination, setStudentPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingStudents, setLoadingStudents] = useState(false);

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
      const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStats(data.stats);
      else setError(data.message || 'Error al cargar métricas');
    } catch {
      setError('Error de conexión');
    } finally { setLoadingStats(false); }
  };

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      const res = await fetch(`${BACKEND_URL}/api/admin/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setPagination({ page: data.pagination.page, limit: data.pagination.limit, totalPages: data.pagination.totalPages || 1 });
      } else setError(data.message || 'Error al cargar usuarios');
    } catch {
      setError('Error de conexión');
    } finally { setLoadingUsers(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/role`, {
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
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/tier`, {
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
      const res = await fetch(`${BACKEND_URL}/api/admin/content?${params}`, { credentials: 'include' });
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
      const res = await fetch(`${BACKEND_URL}/api/admin/content/${type}/${id}`, {
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
      const res = await fetch(`${BACKEND_URL}/api/admin/student-verifications?page=${page}&limit=20`, { credentials: 'include' });
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
      const res = await fetch(`${BACKEND_URL}/api/admin/student-verifications/${id}/approve`, {
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
      const res = await fetch(`${BACKEND_URL}/api/admin/student-verifications/${id}/reject`, {
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
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/ban`, {
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
    (stats?.usersByTier?.VISIONARY || 0) +
    (stats?.usersByTier?.TEAM || 0);

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">

        {/* Header */}
        <div className="mb-12" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <span className="category-tag">Admin</span>
          <h1
            className="font-display mt-2"
            style={{ fontSize: '2rem', color: 'var(--text)' }}
          >
            Panel de Administrador
          </h1>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-8 flex items-center justify-between font-sans text-sm"
            style={{ padding: '0.875rem 1rem', border: '1px solid var(--accent)', color: 'var(--accent)' }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-0 mb-16"
          style={{ border: '1px solid var(--border)' }}
        >
          {[
            { label: 'Usuarios totales', value: loadingStats ? '…' : stats?.totalUsers || 0, sub: stats?.usersByTier ? Object.entries(stats.usersByTier).map(([k, v]) => `${k}: ${v}`).join(' · ') : '' },
            { label: 'Privilegiados', value: loadingStats ? '…' : privileged, sub: 'Researcher + Visionary + Team' },
            { label: 'Artículos', value: loadingStats ? '…' : stats?.totalArticles || 0, sub: 'Publicados en la plataforma' },
            { label: 'Blog posts', value: loadingStats ? '…' : stats?.totalBlogs || 0, sub: 'Entradas de blog y foro' },
          ].map(({ label, value, sub }, i, arr) => (
            <div key={label} style={{ borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <StatTile label={label} value={value} sub={sub} />
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-6 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'users', label: 'Usuarios' },
            { id: 'content', label: 'Contenido' },
            { id: 'students', label: studentPagination.total > 0 ? `Estudiantes (${studentPagination.total})` : 'Estudiantes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="font-sans text-xs uppercase tracking-wider pb-3 transition-colors duration-150"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content tab */}
        {activeTab === 'content' && (
          <section>
            <div
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}
            >
              <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Moderación de contenido
              </h2>
              <select
                value={contentType}
                onChange={e => { setContentType(e.target.value); setContentPagination(p => ({ ...p, page: 1 })); }}
                className="font-mono text-xs"
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.375rem 0.75rem', cursor: 'pointer', outline: 'none', borderRadius: 0 }}
              >
                <option value="">Todos los tipos</option>
                <option value="article">Artículos</option>
                <option value="research">Investigaciones</option>
                <option value="event">Eventos</option>
                <option value="blogpost">Blog posts</option>
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table-editorial">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Autor</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingContent ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j}><div style={{ height: 14, backgroundColor: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : content.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                        No hay contenido.
                      </td>
                    </tr>
                  ) : content.map(item => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td>
                        <span className="font-mono text-xs uppercase" style={{ color: 'var(--muted)' }}>
                          {item.type}
                        </span>
                      </td>
                      <td>
                        <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>
                          {item.title || 'Sin título'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-sans text-sm" style={{ color: 'var(--text)' }}>{item.author?.name || '—'}</p>
                          <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{item.author?.email}</p>
                        </div>
                      </td>
                      <td>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteContent(item.type, item.id, item.title || 'este contenido')}
                          className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-hover)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex items-center justify-between mt-6 pt-4 font-sans text-xs"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              <span>Página {contentPagination.page} de {contentPagination.totalPages}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const p = Math.max(1, contentPagination.page - 1); setContentPagination(prev => ({ ...prev, page: p })); fetchContent(p, contentType); }}
                  disabled={contentPagination.page <= 1}
                  className="btn btn-ghost"
                  style={{ padding: 0, opacity: contentPagination.page <= 1 ? 0.4 : 1 }}
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  onClick={() => { const p = Math.min(contentPagination.totalPages, contentPagination.page + 1); setContentPagination(prev => ({ ...prev, page: p })); fetchContent(p, contentType); }}
                  disabled={contentPagination.page >= contentPagination.totalPages}
                  className="btn btn-ghost"
                  style={{ padding: 0, opacity: contentPagination.page >= contentPagination.totalPages ? 0.4 : 1 }}
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Students tab */}
        {activeTab === 'students' && (
          <section>
            <div
              className="flex items-center justify-between mb-6"
              style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}
            >
              <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Verificaciones pendientes
              </h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table-editorial">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Fecha solicitud</th>
                    <th>Documento</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j}><div style={{ height: 14, backgroundColor: 'var(--surface)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : studentVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                        No hay solicitudes pendientes.
                      </td>
                    </tr>
                  ) : studentVerifications.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div>
                          <p className="font-sans text-sm" style={{ color: 'var(--text)', fontWeight: 500 }}>
                            {v.user?.name || 'Sin nombre'}
                          </p>
                          <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                            @{v.user?.username || 'n/a'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                          {v.user?.email}
                        </span>
                      </td>
                      <td>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(v.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        {v.documentUrl ? (
                          <a
                            href={v.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-sans text-xs"
                            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                          >
                            Ver imagen →
                          </a>
                        ) : (
                          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                            {v.email ? `Email: ${v.email}` : '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => handleApproveStudent(v.id)}
                            className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleRejectStudent(v.id)}
                            className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
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

            <div
              className="flex items-center justify-between mt-6 pt-4 font-sans text-xs"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              <span>Página {studentPagination.page} de {studentPagination.totalPages}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const p = Math.max(1, studentPagination.page - 1); setStudentPagination(prev => ({ ...prev, page: p })); fetchStudents(p); }}
                  disabled={studentPagination.page <= 1}
                  className="btn btn-ghost"
                  style={{ padding: 0, opacity: studentPagination.page <= 1 ? 0.4 : 1 }}
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  onClick={() => { const p = Math.min(studentPagination.totalPages, studentPagination.page + 1); setStudentPagination(prev => ({ ...prev, page: p })); fetchStudents(p); }}
                  disabled={studentPagination.page >= studentPagination.totalPages}
                  className="btn btn-ghost"
                  style={{ padding: 0, opacity: studentPagination.page >= studentPagination.totalPages ? 0.4 : 1 }}
                >
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Users table */}
        {activeTab === 'users' && <section>
          <div
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6"
            style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}
          >
            <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
              Gestión de usuarios
            </h2>

            {/* Search */}
            <div className="relative" style={{ width: '100%', maxWidth: 280 }}>
              <Search
                size={12}
                style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
              />
              <input
                type="text"
                placeholder="Buscar por email o usuario…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field"
                style={{ paddingLeft: '1.25rem' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table-editorial">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Membresía</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j}>
                          <div
                            style={{ height: 14, backgroundColor: 'var(--surface)', borderRadius: 0 }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    {/* User */}
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username || 'U')}&background=random`}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                        <div>
                          <p className="font-sans text-sm" style={{ color: 'var(--text)', fontWeight: 500 }}>
                            {u.name || 'Sin nombre'}
                          </p>
                          <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                            @{u.username || 'n/a'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>{u.email}</span>
                    </td>

                    {/* Role */}
                    <td>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="font-mono text-xs"
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          color: u.role === 'ADMIN' ? 'var(--accent)' : 'var(--text)',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer',
                          outline: 'none',
                          borderRadius: 0,
                        }}
                      >
                        <option style={{ backgroundColor: 'var(--bg)' }} value="USER">USER</option>
                        <option style={{ backgroundColor: 'var(--bg)' }} value="ADMIN">ADMIN</option>
                      </select>
                    </td>

                    {/* Tier */}
                    <td>
                      <select
                        value={u.subscriptionTier}
                        onChange={e => handleTierChange(u.id, e.target.value)}
                        className="font-mono text-xs"
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer',
                          outline: 'none',
                          borderRadius: 0,
                        }}
                      >
                        {['OBSERVER', 'STUDENT', 'RESEARCHER', 'VISIONARY', 'TEAM'].map(t => (
                          <option key={t} style={{ backgroundColor: 'var(--bg)' }} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>

                    {/* Status badge */}
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: u.banned ? 'transparent' : 'transparent',
                          border: `1px solid ${u.banned ? 'var(--accent)' : 'var(--border)'}`,
                          color: u.banned ? 'var(--accent)' : 'var(--muted)',
                        }}
                      >
                        {u.banned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleBanToggle(u.id, u.banned)}
                        title={u.banned ? 'Restaurar acceso' : 'Suspender usuario'}
                        className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: u.banned ? '#6dbf6d' : 'var(--accent)',
                        }}
                      >
                        {u.banned ? 'Restaurar' : 'Suspender'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="flex items-center justify-between mt-6 pt-4 font-sans text-xs"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <span>Página {pagination.page} de {pagination.totalPages}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
                className="btn btn-ghost"
                style={{ padding: 0, opacity: pagination.page <= 1 ? 0.4 : 1 }}
              >
                <ArrowLeft size={13} />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-ghost"
                style={{ padding: 0, opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}
              >
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>}
      </div>
    </div>
  );
};

export default AdminPanel;

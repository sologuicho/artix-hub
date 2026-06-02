import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';
import PricingModal from '../components/PricingModal';

const TIER_LABELS = {
  OBSERVER:   'Lector',
  STUDENT:    'Miembro',
  RESEARCHER: 'Pro',
  VISIONARY:  'Pro',
  TEAM:       'Equipo',
};

const TIER_FEATURES = {
  OBSERVER: [
    'Acceso a artículos y blog públicos',
    'Ver calendario de eventos',
    'Participar en discusiones',
    'Búsqueda de contenido',
  ],
  STUDENT: [
    'Todo lo del plan Lector',
    'Publicar artículos y blog posts',
    'Acceso a investigaciones completas',
    'Asistente de escritura con IA',
    'Seguir autores y recibir notificaciones',
  ],
  RESEARCHER: [
    'Todo lo del plan Miembro',
    'Colaboración en artículos e investigaciones',
    'Publicar eventos',
    'Estadísticas de tus publicaciones',
    'Soporte prioritario',
  ],
  VISIONARY: [
    'Todo lo del plan Miembro',
    'Colaboración en artículos e investigaciones',
    'Publicar eventos',
    'Estadísticas de tus publicaciones',
    'Soporte prioritario',
  ],
  TEAM: [
    'Todo lo del plan Pro',
    'Gestión de equipo',
    'Facturación centralizada',
    'Soporte dedicado',
  ],
};

const TIER_BADGE_CLASS = {
  OBSERVER:   'badge badge-observer',
  STUDENT:    'badge badge-observer',
  RESEARCHER: 'badge badge-researcher',
  VISIONARY:  'badge badge-visionary',
  TEAM:       'badge badge-team',
};

const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

const SubscriptionSettings = () => {
  const { user, refreshUser } = useAuth();
  const [status, setStatus]           = useState(null);
  const [loadingStatus, setLoading]   = useState(true);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [actionLoading, setActLoading] = useState(false);
  const [actionError, setActError]    = useState(null);
  const [invoices, setInvoices]       = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/subscription/status`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch {
      setActError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/subscription/invoices`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setInvoices(data.invoices || []);
    } catch {}
    finally { setLoadingInvoices(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCancel = async () => {
    if (!confirm('¿Confirmar cancelación de suscripción?')) return;
    setActError(null);
    setActLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/subscription/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) { await refreshUser(); await fetchStatus(); }
      else setActError(data.message || 'Error al cancelar suscripción');
    } catch { setActError('Error de conexión'); }
    finally { setActLoading(false); }
  };

  const handleReactivate = async () => {
    setActError(null);
    setActLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/subscription/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) { await refreshUser(); await fetchStatus(); }
      else setActError(data.message || 'Error al reactivar suscripción');
    } catch { setActError('Error de conexión'); }
    finally { setActLoading(false); }
  };

  const tier        = user?.subscriptionTier || 'OBSERVER';
  const tierLabel   = TIER_LABELS[tier] || tier;
  const features    = TIER_FEATURES[tier] || TIER_FEATURES.OBSERVER;
  const badgeClass  = TIER_BADGE_CLASS[tier] || 'badge badge-observer';
  const subStatus   = status?.status;
  const willCancel  = status?.cancelAtPeriodEnd;
  const periodEnd   = status?.currentPeriodEnd;

  if (loadingStatus) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16 flex items-center justify-center">
          <div style={{
            width: 28, height: 28,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">

        {/* Page header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
          <span className="category-tag">Cuenta</span>
          <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1 }}>
            Mi Suscripción
          </h1>
        </div>

        <div style={{ maxWidth: '600px' }}>

          {/* ── 1. Plan actual ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <p className="font-sans text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Plan actual
            </p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-4">
                <h2 className="font-display" style={{ fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>
                  {tierLabel}
                </h2>
                <span className={badgeClass}>{tierLabel}</span>
              </div>
              <button onClick={() => setPricingOpen(true)} className="btn btn-outline">
                Cambiar plan
              </button>
            </div>

            {willCancel && periodEnd && (
              <div className="flex items-center gap-2 mt-4">
                <Clock size={13} style={{ color: 'var(--muted)' }} />
                <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                  Suscripción se cancela el{' '}
                  <span style={{ color: 'var(--text)' }}>{formatDate(periodEnd)}</span>
                </p>
              </div>
            )}
            {!willCancel && subStatus === 'active' && periodEnd && (
              <div className="flex items-center gap-2 mt-4">
                <RefreshCw size={13} style={{ color: 'var(--muted)' }} />
                <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                  Próximo cobro:{' '}
                  <span style={{ color: 'var(--text)' }}>{formatDate(periodEnd)}</span>
                </p>
              </div>
            )}
          </section>

          {/* ── 2. Beneficios activos ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <p className="font-sans text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Beneficios activos
            </p>
            <ul className="flex flex-col gap-3">
              {features.map(feature => (
                <li
                  key={feature}
                  className="flex items-start gap-3 font-sans"
                  style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.55 }}
                >
                  <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>·</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          {/* ── 3. Historial de pagos ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <p className="font-sans text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Historial de pagos
            </p>
            {loadingInvoices ? (
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>Cargando…</p>
            ) : invoices.length === 0 ? (
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>Sin transacciones registradas.</p>
            ) : (
              <table className="table-editorial">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td><span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>{formatDate(inv.date)}</span></td>
                      <td><span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{inv.description}</span></td>
                      <td>
                        <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                          {inv.amount.toFixed(2)} {inv.currency}
                        </span>
                      </td>
                      <td>
                        <span className="font-sans text-xs uppercase tracking-wider" style={{ color: inv.status === 'paid' ? 'var(--accent)' : 'var(--muted)' }}>
                          {inv.status === 'paid' ? 'Pagado' : inv.status === 'open' ? 'Pendiente' : inv.status}
                        </span>
                      </td>
                      <td>
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-sans text-xs transition-colors duration-150"
                            style={{ color: 'var(--accent)' }}
                          >
                            Descargar →
                          </a>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── 4. Zona de peligro ── */}
          <section>
            <p className="font-sans text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Zona de peligro
            </p>
            {actionError && (
              <p className="font-sans text-sm mb-3" style={{ color: 'var(--accent)' }}>{actionError}</p>
            )}
            {willCancel ? (
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                className="font-sans text-sm"
                style={{
                  background: 'none', border: 'none', padding: 0,
                  cursor: actionLoading ? 'wait' : 'pointer',
                  color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                {actionLoading ? 'Reactivando…' : 'Reactivar suscripción'}
              </button>
            ) : tier !== 'OBSERVER' ? (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="font-sans text-sm"
                style={{
                  background: 'none', border: 'none', padding: 0,
                  cursor: actionLoading ? 'wait' : 'pointer',
                  color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                {actionLoading ? 'Cancelando…' : 'Cancelar suscripción'}
              </button>
            ) : (
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                No hay acciones disponibles para el plan gratuito.
              </p>
            )}
          </section>

        </div>
      </div>

      {pricingOpen && (
        <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      )}
    </div>
  );
};

export default SubscriptionSettings;

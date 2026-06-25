import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';
import PricingModal from '../components/PricingModal';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

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

const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const SectionLabel = ({ children }) => (
  <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.25rem' }}>
    {children}
  </p>
);

const SubscriptionSettings = () => {
  const { user, refreshUser }              = useAuth();
  const [status, setStatus]               = useState(null);
  const [loadingStatus, setLoading]       = useState(true);
  const [pricingOpen, setPricingOpen]     = useState(false);
  const [actionLoading, setActLoading]    = useState(false);
  const [actionError, setActError]        = useState(null);
  const [invoices, setInvoices]           = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/subscription/status`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch { setActError('Error de conexión'); }
    finally { setLoading(false); }
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

  useEffect(() => { fetchStatus();   }, [fetchStatus]);
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

  const tier       = user?.subscriptionTier || 'OBSERVER';
  const tierLabel  = TIER_LABELS[tier] || tier;
  const features   = TIER_FEATURES[tier] || TIER_FEATURES.OBSERVER;
  const subStatus  = status?.status;
  const willCancel = status?.cancelAtPeriodEnd;
  const periodEnd  = status?.currentPeriodEnd;

  if (loadingStatus) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="site-container py-16">

        {/* ── Page header ── */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4451A' }}>Cuenta</span>
          <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1, marginTop: '0.5rem' }}>
            Mi Suscripción
          </h1>
        </div>

        <div style={{ maxWidth: 600 }}>

          {/* ── 1. Plan actual ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Plan actual</SectionLabel>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>
                  {tierLabel}
                </h2>
                <span style={{
                  fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  border: '1px solid var(--border)', padding: '0.2rem 0.5rem', color: 'var(--muted)',
                }}>
                  {tierLabel}
                </span>
              </div>
              <button
                onClick={() => setPricingOpen(true)}
                style={{
                  fontFamily: MONO, fontSize: '0.6875rem', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--muted)', padding: '0.5rem 1rem',
                  cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              >
                Cambiar plan
              </button>
            </div>

            {willCancel && periodEnd && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <Clock size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                  Suscripción se cancela el{' '}
                  <span style={{ color: 'var(--text)' }}>{formatDate(periodEnd)}</span>
                </p>
              </div>
            )}
            {!willCancel && subStatus === 'active' && periodEnd && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <RefreshCw size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                  Próximo cobro:{' '}
                  <span style={{ color: 'var(--text)' }}>{formatDate(periodEnd)}</span>
                </p>
              </div>
            )}
          </section>

          {/* ── 2. Beneficios activos ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Beneficios activos</SectionLabel>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {features.map(feature => (
                <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ color: '#C4451A', flexShrink: 0, fontWeight: 700 }}>·</span>
                  <span style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.55 }}>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 3. Historial de pagos ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
            <SectionLabel>Historial de pagos</SectionLabel>
            {loadingInvoices ? (
              <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>Cargando…</p>
            ) : invoices.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)' }}>Sin transacciones registradas.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Fecha', 'Concepto', 'Monto', 'Estado', 'PDF'].map(h => (
                        <th key={h} style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', paddingBottom: '0.625rem', borderBottom: '1px solid var(--border)', paddingRight: '1.5rem' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1.5rem 0.75rem 0' }}>
                          <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>{formatDate(inv.date)}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1.5rem 0.75rem 0' }}>
                          <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)' }}>{inv.description}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1.5rem 0.75rem 0' }}>
                          <span style={{ fontFamily: MONO, fontSize: '0.875rem', color: 'var(--text)' }}>
                            {inv.amount.toFixed(2)} {inv.currency}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1.5rem 0.75rem 0' }}>
                          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: inv.status === 'paid' ? '#C4451A' : 'var(--muted)' }}>
                            {inv.status === 'paid' ? 'Pagado' : inv.status === 'open' ? 'Pendiente' : inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#C4451A', textDecoration: 'none' }}
                            >
                              Descargar →
                            </a>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontFamily: MONO, fontSize: '0.6875rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 4. Zona de peligro ── */}
          <section>
            <SectionLabel>Zona de peligro</SectionLabel>
            {actionError && (
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: '#C4451A', marginBottom: '0.75rem' }}>{actionError}</p>
            )}
            {willCancel ? (
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontFamily: SANS, fontSize: '0.875rem',
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
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontFamily: SANS, fontSize: '0.875rem',
                  cursor: actionLoading ? 'wait' : 'pointer',
                  color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3,
                }}
              >
                {actionLoading ? 'Cancelando…' : 'Cancelar suscripción'}
              </button>
            ) : (
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
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

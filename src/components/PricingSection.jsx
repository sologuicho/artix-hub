import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';
import TeamPricingCalculator from './TeamPricingCalculator';

const PLANS = [
  {
    id: 'lector',
    name: 'Lector',
    tier: 'OBSERVER',
    monthly: 0,
    yearly: 0,
    free: true,
    label: null,
    highlight: false,
    features: [
      'Leer artículos y blog públicos',
      'Ver eventos',
      'Participar en discusiones básicas',
      'Búsqueda de contenido',
    ],
    cta: 'Comenzar gratis',
    ctaAction: 'free',
  },
  {
    id: 'estudiante',
    name: 'Estudiante',
    tier: 'STUDENT',
    monthly: 0,
    yearly: 0,
    free: true,
    label: 'PARA ESTUDIANTES',
    highlight: true,
    priceCrossed: '$4',
    priceLabel: 'GRATIS',
    features: [
      'Todo lo del plan Lector',
      'Publicar artículos y blog posts',
      'Acceso a investigaciones completas',
      'Asistente de escritura con IA',
      'Seguir autores y recibir notificaciones',
    ],
    cta: 'Verificar que soy estudiante →',
    ctaAction: 'verify',
  },
  {
    id: 'miembro',
    name: 'Miembro',
    tier: 'STUDENT',
    monthly: 4,
    yearly: 38.4,
    free: false,
    label: '— MÁS POPULAR —',
    labelMuted: true,
    highlight: false,
    features: [
      'Todo lo del plan Estudiante',
      'Sin necesidad de verificación',
      'Soporte por email',
    ],
    cta: 'Comenzar con Miembro',
    ctaAction: 'pay',
  },
  {
    id: 'researcher',
    name: 'Researcher',
    tier: 'RESEARCHER',
    monthly: 9,
    yearly: 86.4,
    free: false,
    label: null,
    highlight: false,
    features: [
      'Todo lo del plan Miembro',
      'Colaboración en investigaciones',
      'Publicar eventos',
      'Estadísticas de publicaciones',
      'Soporte prioritario',
    ],
    cta: 'Comenzar con Researcher',
    ctaAction: 'pay',
  },
];

const COMPARISON = [
  { feature: 'Leer contenido', lector: true, estudiante: true, miembro: true, researcher: true },
  { feature: 'Publicar artículos', lector: false, estudiante: true, miembro: true, researcher: true },
  { feature: 'Acceso investigaciones', lector: false, estudiante: true, miembro: true, researcher: true },
  { feature: 'IA para escritura', lector: false, estudiante: true, miembro: true, researcher: true },
  { feature: 'Colaborar en research', lector: false, estudiante: false, miembro: false, researcher: true },
  { feature: 'Publicar eventos', lector: false, estudiante: false, miembro: false, researcher: true },
  { feature: 'Estadísticas', lector: false, estudiante: false, miembro: false, researcher: true },
];

const FAQS = [
  {
    q: '¿Cómo verifico que soy estudiante?',
    a: 'Puedes verificar con tu email institucional (.edu, .edu.mx, .unam.mx, etc.) y el plan se activa de inmediato. Si no tienes email institucional, sube una foto de tu credencial estudiantil o constancia de estudios — revisamos en 24-48 horas.',
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí. Puedes actualizar o cancelar tu suscripción desde Configuración → Suscripción en cualquier momento. Los cambios aplican al inicio del siguiente ciclo de facturación.',
  },
  {
    q: '¿Aceptan MercadoPago?',
    a: 'Sí, aceptamos MercadoPago para usuarios en México, Argentina, Colombia, Chile, Perú y otros países de Latinoamérica, además de tarjetas de crédito y débito vía Stripe.',
  },
];

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return null;
};

const PricingSection = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [planType, setPlanType] = useState('individual');
  const [openFaq, setOpenFaq] = useState(null);

  const isStudent = user?.subscriptionTier === 'STUDENT';
  const isResearcher = user?.subscriptionTier === 'RESEARCHER';

  const handleSelectPlan = async (plan) => {
    if (!user) { window.location.href = '/auth'; return; }

    if (plan.ctaAction === 'verify') {
      navigate('/student-verification');
      return;
    }

    if (plan.ctaAction === 'free') return;

    const price = annual ? plan.yearly : plan.monthly;
    const period = annual ? 'año' : 'mes';
    if (!confirm(`¿Confirmar cambio al plan ${plan.name} ($${price}/${period})?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ tier: plan.tier }),
      });
      const data = await res.json();
      if (res.ok) { await refreshUser?.(); alert('¡Plan actualizado correctamente!'); }
      else alert(data.message || 'Error al actualizar la suscripción');
    } catch { alert('Error de conexión al actualizar la suscripción'); }
    finally { setLoading(false); }
  };

  const isCurrent = (plan) => {
    if (!user) return false;
    if (plan.id === 'lector') return user.subscriptionTier === 'OBSERVER';
    if (plan.id === 'estudiante' || plan.id === 'miembro') return isStudent;
    if (plan.id === 'researcher') return isResearcher;
    return false;
  };

  const displayPrice = (plan) => {
    if (plan.free) return null;
    return annual ? (plan.yearly / 12).toFixed(1).replace('.0', '') : plan.monthly;
  };

  return (
    <section id="pricing" className="py-24" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="site-container">

        {/* Header */}
        <div className="mb-14">
          <span className="category-tag">Planes</span>
          <h2 className="font-display mt-2" style={{ fontSize: '2.25rem', color: 'var(--text)', lineHeight: 1.15 }}>
            Elige tu nivel de acceso
          </h2>
          <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '480px' }}>
            Desde lectura gratuita hasta herramientas de investigación completas.
          </p>
        </div>

        {/* Plan type tabs */}
        <div className="flex gap-0 mb-10 w-fit" style={{ borderBottom: '1px solid var(--border)' }}>
          {[{ id: 'individual', label: 'Individual' }, { id: 'team', label: 'Equipos' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPlanType(id)}
              className="btn btn-ghost"
              style={{
                paddingBottom: '0.75rem',
                color: planType === id ? 'var(--text)' : 'var(--muted)',
                borderBottom: planType === id ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: '0.8125rem',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Annual / Monthly toggle */}
        {planType === 'individual' && (
          <div className="flex items-center gap-4 mb-12">
            <span className="font-sans text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Facturación:
            </span>
            {[{ id: false, label: 'Mensual' }, { id: true, label: 'Anual' }].map(({ id, label }) => (
              <button
                key={label}
                onClick={() => setAnnual(id)}
                className="font-sans text-xs uppercase tracking-wider transition-colors"
                style={{ color: annual === id ? 'var(--text)' : 'var(--muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                {label}
                {id && <span style={{ marginLeft: '0.375rem', color: 'var(--accent)' }}>−20%</span>}
              </button>
            ))}
          </div>
        )}

        {/* Individual plans — 4 columns */}
        {planType === 'individual' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0" style={{ border: '1px solid var(--border)' }}>
              {PLANS.map((plan, idx) => {
                const current = isCurrent(plan);
                const price = displayPrice(plan);

                return (
                  <div
                    key={plan.id}
                    style={{
                      backgroundColor: plan.highlight ? 'var(--surface)' : 'var(--bg)',
                      borderLeft: plan.highlight ? '3px solid var(--accent)' : idx === 0 ? 'none' : '1px solid var(--border)',
                      borderRight: idx < PLANS.length - 1 && !plan.highlight ? 'none' : 'none',
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {/* Label */}
                    {plan.label && (
                      <span
                        className="font-sans"
                        style={{
                          fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: plan.highlight ? 'var(--accent)' : 'var(--muted)',
                          display: 'block', marginBottom: '0.75rem',
                        }}
                      >
                        {plan.label}
                      </span>
                    )}
                    {!plan.label && <div style={{ height: '1.375rem', marginBottom: '0.75rem' }} />}

                    {/* Plan name */}
                    <h3
                      className={plan.highlight ? 'font-display' : 'font-sans font-medium'}
                      style={{ fontSize: plan.highlight ? '1.5rem' : '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}
                    >
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mt-4 mb-1">
                      {plan.highlight ? (
                        <div className="flex items-baseline gap-2">
                          <span className="font-display" style={{ fontSize: '1.125rem', color: 'var(--muted)', textDecoration: 'line-through' }}>
                            {plan.priceCrossed}
                          </span>
                          <span className="font-display" style={{ fontSize: '2.25rem', color: 'var(--accent)', lineHeight: 1 }}>
                            {plan.priceLabel}
                          </span>
                        </div>
                      ) : plan.free ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-display" style={{ fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>$0</span>
                          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>/mes</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="font-display" style={{ fontSize: '2.5rem', color: 'var(--text)', lineHeight: 1 }}>
                            ${price}
                          </span>
                          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>/mes</span>
                        </div>
                      )}
                      {annual && !plan.free && (
                        <p className="font-sans text-xs mt-1" style={{ color: 'var(--accent)' }}>
                          ${plan.yearly}/año
                        </p>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '1.5rem 0', opacity: 0.5 }} />

                    {/* Features */}
                    <ul className="flex flex-col gap-3 flex-1 mb-8">
                      {plan.features.map(feat => (
                        <li
                          key={feat}
                          className="flex items-start gap-3 font-sans"
                          style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.55 }}
                        >
                          <span style={{ color: 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>·</span>
                          {feat}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={current || loading || (plan.id === 'lector' && !user) === false && plan.ctaAction === 'free' && !!user && user.subscriptionTier === 'OBSERVER'}
                      className={`btn w-full ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                      style={current ? {
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--muted)',
                        cursor: 'default',
                      } : undefined}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : current ? 'Plan actual' : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="mt-20 mb-6">
              <h3 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)', marginBottom: '1.5rem' }}>
                Comparar planes
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-editorial w-full">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Función</th>
                      <th style={{ textAlign: 'center' }}>Lector</th>
                      <th style={{ textAlign: 'center' }}>Estudiante</th>
                      <th style={{ textAlign: 'center' }}>Miembro</th>
                      <th style={{ textAlign: 'center' }}>Researcher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map(row => (
                      <tr key={row.feature}>
                        <td>
                          <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{row.feature}</span>
                        </td>
                        {['lector', 'estudiante', 'miembro', 'researcher'].map(col => (
                          <td key={col} style={{ textAlign: 'center' }}>
                            <span style={{ color: row[col] ? 'var(--accent)' : 'var(--muted)', fontWeight: row[col] ? 600 : 400 }}>
                              {row[col] ? '✓' : '—'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-16" style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
              <h3 className="font-display mb-8" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Preguntas frecuentes
              </h3>
              <div className="flex flex-col">
                {FAQS.map((faq, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full text-left flex items-center justify-between font-sans"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '1.25rem 0',
                        color: 'var(--text)', fontSize: '0.9375rem', fontWeight: 500,
                      }}
                    >
                      {faq.q}
                      <span style={{ color: 'var(--muted)', fontSize: '1.125rem', flexShrink: 0, marginLeft: '1rem' }}>
                        {openFaq === i ? '−' : '+'}
                      </span>
                    </button>
                    {openFaq === i && (
                      <p
                        className="font-sans text-sm pb-5"
                        style={{ color: 'var(--muted)', lineHeight: 1.75, maxWidth: '640px' }}
                      >
                        {faq.a}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Team pricing */}
        {planType === 'team' && (
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem' }}>
            <TeamPricingCalculator />
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;

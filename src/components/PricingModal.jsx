import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, CreditCard, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const PLANS = [
  {
    name: 'Lector',
    price: 0,
    tier: 'OBSERVER',
    description: 'Para explorar y descubrir contenido',
    features: [
      'Acceso a artículos y blog públicos',
      'Ver calendario de eventos',
      'Participar en discusiones',
      'Búsqueda de contenido'
    ]
  },
  {
    name: 'Miembro',
    price: 4,
    tier: 'STUDENT',
    recommended: true,
    description: 'Para publicar y aprender',
    features: [
      'Todo lo del plan Lector',
      'Publicar artículos y blog posts',
      'Acceso a investigaciones completas',
      'Asistente de escritura con IA',
      'Seguir autores y recibir notificaciones'
    ]
  },
  {
    name: 'Pro',
    price: 9,
    tier: 'VISIONARY',
    description: 'Para investigadores y profesionales',
    features: [
      'Todo lo del plan Miembro',
      'Colaboración en artículos e investigaciones',
      'Publicar eventos',
      'Estadísticas de tus publicaciones',
      'Soporte prioritario'
    ]
  }
];

const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

const PricingModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Estado de selección de plan — null o el objeto plan elegido
  const [selectedPlan, setSelectedPlan] = useState(null);
  // 'stripe' | 'mercadopago' | null — procesador activo cargando
  const [loadingProcessor, setLoadingProcessor] = useState(null);
  const [error, setError] = useState(null);

  if (user?.role === 'ADMIN' || user?.role === 'admin') return null;
  if (user && user.subscriptionTier !== 'OBSERVER') return null;
  if (!isOpen) return null;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectPlan = (plan) => {
    setError(null);

    if (!user) {
      setError('Inicia sesión para suscribirte.');
      return;
    }

    // OBSERVER es free — cerrar modal y redirigir
    if (plan.tier === 'OBSERVER') {
      onClose();
      navigate('/');
      return;
    }

    // Planes de pago — mostrar selector de procesador
    setSelectedPlan(plan);
  };

  const handlePayWithStripe = async () => {
    if (!selectedPlan) return;
    setError(null);
    setLoadingProcessor('stripe');

    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken()
        },
        body: JSON.stringify({ tier: selectedPlan.tier }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Error al crear la sesión de pago con Stripe.');
      }
    } catch (err) {
      console.error('[PricingModal] Stripe error:', err);
      setError('Error de conexión al iniciar pago con Stripe.');
    } finally {
      setLoadingProcessor(null);
    }
  };

  const handlePayWithMercadoPago = async () => {
    if (!selectedPlan) return;
    setError(null);
    setLoadingProcessor('mercadopago');

    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/mercadopago/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken()
        },
        body: JSON.stringify({ tier: selectedPlan.tier }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.message || 'Error al crear la preferencia de pago en MercadoPago.');
      }
    } catch (err) {
      console.error('[PricingModal] MercadoPago error:', err);
      setError('Error de conexión al iniciar pago con MercadoPago.');
    } finally {
      setLoadingProcessor(null);
    }
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);
    setError(null);
  };

  const isLoadingAny = loadingProcessor !== null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoadingAny ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Close */}
          <button
            onClick={onClose}
            disabled={isLoadingAny}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full z-10 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 md:p-12">
            {/* ── SELECTOR DE PROCESADOR ── */}
            <AnimatePresence mode="wait">
              {selectedPlan ? (
                <motion.div
                  key="processor-selector"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center gap-8 py-8"
                >
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Plan {selectedPlan.name}
                    </h2>
                    <p className="text-gray-400">
                      Elige cómo quieres pagar ${selectedPlan.price}/mes
                    </p>
                  </div>

                  {error && (
                    <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                    {/* Stripe */}
                    <button
                      onClick={handlePayWithStripe}
                      disabled={isLoadingAny}
                      className="flex-1 flex flex-col items-center gap-3 py-6 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-wait"
                    >
                      {loadingProcessor === 'stripe'
                        ? <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                        : <CreditCard className="w-7 h-7 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      }
                      <div className="text-center">
                        <p className="text-white font-semibold text-sm">Tarjeta Internacional</p>
                        <p className="text-gray-500 text-xs mt-0.5">Visa, Mastercard, Amex</p>
                      </div>
                    </button>

                    {/* MercadoPago */}
                    <button
                      onClick={handlePayWithMercadoPago}
                      disabled={isLoadingAny}
                      className="flex-1 flex flex-col items-center gap-3 py-6 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-wait"
                    >
                      {loadingProcessor === 'mercadopago'
                        ? <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                        : <Wallet className="w-7 h-7 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      }
                      <div className="text-center">
                        <p className="text-white font-semibold text-sm">MercadoPago</p>
                        <p className="text-gray-500 text-xs mt-0.5">LATAM · Métodos locales</p>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={handleBackToPlans}
                    disabled={isLoadingAny}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    ← Volver a los planes
                  </button>
                </motion.div>
              ) : (
                /* ── LISTA DE PLANES ── */
                <motion.div
                  key="plan-list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-white mb-4">Invest in the Future</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                      Subscriptions directly fund research grants, high-quality event production,
                      and the development of open-source tools for the community.
                    </p>
                    {error && (
                      <p className="text-red-500 mt-4 text-sm font-semibold">{error}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                      const isCurrent = user?.subscriptionTier === plan.tier;
                      return (
                        <div
                          key={plan.name}
                          className={`
                            relative flex flex-col p-6 rounded-2xl border transition-all duration-300
                            ${isCurrent
                              ? 'bg-white/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                        >
                          {isCurrent && (
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                              Current
                            </div>
                          )}
                          {plan.recommended && !isCurrent && (
                            <div className="absolute top-0 right-0 -mt-3 -mr-3 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                              Popular
                            </div>
                          )}

                          <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                          )}
                          <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold text-white">${plan.price}</span>
                            <span className="text-gray-500">/month</span>
                          </div>

                          <ul className="space-y-4 mb-8 flex-1">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrent}
                            className={`
                              w-full py-3 rounded-xl font-medium transition-all
                              ${isCurrent
                                ? 'bg-white/10 text-gray-400 cursor-default'
                                : 'bg-white text-black hover:bg-gray-200'
                              }
                            `}
                          >
                            {isCurrent
                              ? 'Plan Actual'
                              : plan.tier === 'OBSERVER'
                                ? 'Continuar gratis'
                                : 'Elegir plan'
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PricingModal;

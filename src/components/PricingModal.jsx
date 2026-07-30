import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, CreditCard, Wallet, GraduationCap, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const PLANS = [
  {
    name: 'Observer',
    price: 0,
    tier: 'OBSERVER',
    description: 'Para explorar la plataforma',
    features: [
      'Leer contenido público',
      'Likes y comentarios',
      'Publicar en el blog (ilimitado)',
      'Suscribirse a eventos gratuitos',
    ],
    limits: [
      'Sin acceso a research completa',
      'Sin artículos ni eventos premium',
    ],
  },
  {
    name: 'Member',
    price: 4,
    tier: 'MEMBER',
    description: 'Para consumir contenido premium',
    features: [
      'Todo lo de Observer',
      'Investigaciones completas',
      'Artículos premium',
      'Seguir autores y recibir notificaciones',
      'Eventos premium',
    ],
    limits: [
      'Sin publicar artículos académicos',
      'Sin publicar investigaciones',
    ],
  },
  {
    name: 'Student',
    price: 0,
    priceLabel: 'Gratis',
    tier: 'STUDENT',
    badge: '.edu',
    description: 'Para estudiantes verificados',
    features: [
      'Todo lo de Member',
      'Publicar artículos (hasta 5/mes)',
      'Colaborar en investigaciones',
      'Recursos académicos exclusivos',
    ],
    limits: [
      'Sin publicar research completa',
      'Sin organizar eventos',
    ],
  },
  {
    name: 'Researcher',
    price: 9,
    tier: 'RESEARCHER',
    recommended: true,
    description: 'Para investigadores y profesionales',
    features: [
      'Todo sin límites',
      'Publicar investigaciones completas',
      'Organizar y monetizar eventos',
      'Dashboard de analytics',
      'Asistente de escritura con IA',
      'Soporte prioritario',
    ],
    limits: [],
  },
  {
    name: 'Team',
    price: 9,
    priceNote: '+ $5/asiento',
    tier: 'TEAM',
    description: 'Para organizaciones y equipos',
    features: [
      'Todo lo de Researcher',
      'Múltiples miembros',
      'Perfil de organización',
      'Workspace compartido',
      'Analytics del equipo',
    ],
    limits: [],
  },
];

const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

const PricingModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingProcessor, setLoadingProcessor] = useState(null);
  const [error, setError] = useState(null);

  // Student verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('idle'); // idle | loading | approved | pending

  if (user?.role === 'ADMIN' || user?.role === 'admin') return null;
  if (!isOpen) return null;

  const handleSelectPlan = (plan) => {
    setError(null);
    setVerificationEmail('');
    setVerificationStatus('idle');

    if (!user) {
      setError('Inicia sesión para suscribirte.');
      return;
    }

    if (plan.tier === 'OBSERVER') {
      onClose();
      navigate('/');
      return;
    }

    setSelectedPlan(plan);
  };

  const handleStudentApply = async () => {
    if (!verificationEmail.trim()) {
      setError('Ingresa tu correo institucional.');
      return;
    }
    setError(null);
    setVerificationStatus('loading');

    try {
      const res = await fetch(`${BACKEND_URL}/api/student/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ institutionalEmail: verificationEmail.trim() }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setVerificationStatus('idle');
        setError(data.message || 'Error al verificar el correo.');
      } else if (data.autoApproved) {
        setVerificationStatus('approved');
        await refreshUser();
        setTimeout(() => { onClose(); navigate('/'); }, 2500);
      } else {
        setVerificationStatus('pending');
      }
    } catch {
      setVerificationStatus('idle');
      setError('Error de conexión. Intenta de nuevo.');
    }
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
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ tier: selectedPlan.tier }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Error al crear la sesión de pago con Stripe.');
      }
    } catch {
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
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ tier: selectedPlan.tier }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.message || 'Error al crear la preferencia de pago en MercadoPago.');
      }
    } catch {
      setError('Error de conexión al iniciar pago con MercadoPago.');
    } finally {
      setLoadingProcessor(null);
    }
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);
    setError(null);
    setVerificationEmail('');
    setVerificationStatus('idle');
  };

  const isLoadingAny = loadingProcessor !== null || verificationStatus === 'loading';

  const renderStudentVerification = () => {
    if (verificationStatus === 'approved') {
      return (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Plan Student Activo!</h2>
            <p className="text-gray-400 text-sm">Tu correo institucional fue verificado. Redirigiendo...</p>
          </div>
        </div>
      );
    }

    if (verificationStatus === 'pending') {
      return (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <Clock className="w-16 h-16 text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Solicitud en Revisión</h2>
            <p className="text-gray-400 text-sm max-w-sm">
              Revisaremos tu solicitud en 24-48h y recibirás un email cuando sea aprobada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white text-black rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Entendido
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-8 py-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            <h2 className="text-3xl font-bold text-white">Verificación Estudiantil</h2>
          </div>
          <p className="text-gray-400 text-sm max-w-md">
            Ingresa tu correo institucional. Si pertenece a una universidad reconocida,
            el plan Student se activa <strong className="text-white">gratis</strong> al instante.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="email"
            value={verificationEmail}
            onChange={e => setVerificationEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStudentApply()}
            placeholder="usuario@universidad.edu"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-500/50 focus:bg-white/8 transition-colors"
            autoFocus
          />
          <button
            onClick={handleStudentApply}
            disabled={verificationStatus === 'loading'}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {verificationStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            Verificar y activar gratis
          </button>
        </div>

        <p className="text-xs text-gray-600 max-w-sm text-center">
          Dominios válidos: .edu, .edu.mx, .tec.mx, .unam.mx y otros dominios institucionales latinoamericanos.
          Si tu institución no está listada, sube un documento de verificación.
        </p>

        <button
          onClick={handleBackToPlans}
          disabled={verificationStatus === 'loading'}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          ← Volver a los planes
        </button>
      </div>
    );
  };

  const renderPaymentProcessor = () => (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Plan {selectedPlan.name}
        </h2>
        <p className="text-gray-400">
          Elige cómo quieres pagar ${selectedPlan.price}/mes
          {selectedPlan.priceNote && (
            <span className="text-gray-500 text-sm ml-1">{selectedPlan.priceNote}</span>
          )}
        </p>
      </div>

      {error && (
        <div className="w-full max-w-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
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
    </div>
  );

  const renderPlanList = () => (
    <motion.div
      key="plan-list"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-white mb-3">Invest in the Future</h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm">
          Las suscripciones financian becas de investigación, eventos de alta calidad
          y el desarrollo de herramientas open-source para la comunidad.
        </p>
        {error && (
          <p className="text-red-500 mt-4 text-sm font-semibold">{error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = user?.subscriptionTier === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`
                relative flex flex-col p-5 rounded-2xl border transition-all duration-300
                ${isCurrent
                  ? 'bg-white/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }
              `}
            >
              {isCurrent && (
                <div className="absolute -top-3 -right-2 px-2.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg">
                  Actual
                </div>
              )}
              {plan.recommended && !isCurrent && (
                <div className="absolute -top-3 -right-2 px-2.5 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                  Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white">{plan.name}</h3>
                {plan.badge && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded-full border border-amber-500/30">
                    <GraduationCap className="w-2.5 h-2.5" />
                    {plan.badge}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-4">
                {plan.priceLabel
                  ? <span className="text-2xl font-bold text-amber-400">{plan.priceLabel}</span>
                  : <>
                      <span className="text-2xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-500 text-xs">/mes</span>
                    </>
                }
                {plan.priceNote && (
                  <span className="text-gray-600 text-[10px] ml-0.5">{plan.priceNote}</span>
                )}
              </div>

              <ul className="space-y-2.5 mb-4 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.limits.map((limit, i) => (
                  <li key={`limit-${i}`} className="flex items-start gap-2 text-xs text-gray-600">
                    <X className="w-3.5 h-3.5 text-gray-700 flex-shrink-0 mt-0.5" />
                    <span>{limit}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent}
                className={`
                  w-full py-2.5 rounded-xl font-medium text-sm transition-all
                  ${isCurrent
                    ? 'bg-white/10 text-gray-400 cursor-default'
                    : plan.tier === 'OBSERVER'
                      ? 'bg-white/10 text-gray-300 hover:bg-white/15'
                      : plan.tier === 'STUDENT'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        : 'bg-white text-black hover:bg-gray-200'
                  }
                `}
              >
                {isCurrent
                  ? 'Plan Actual'
                  : plan.tier === 'OBSERVER'
                    ? 'Continuar gratis'
                    : plan.tier === 'STUDENT'
                      ? 'Verificar con .edu'
                      : 'Elegir plan'
                }
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-600 mt-6">
        El plan Student es gratuito con correo institucional verificado (.edu).
      </p>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoadingAny ? onClose : undefined}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-7xl bg-[#0a0a0a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            disabled={isLoadingAny}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full z-10 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 md:p-10">
            <AnimatePresence mode="wait">
              {!selectedPlan ? (
                renderPlanList()
              ) : selectedPlan.tier === 'STUDENT' ? (
                <motion.div
                  key="student-verify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {renderStudentVerification()}
                </motion.div>
              ) : (
                <motion.div
                  key="processor-selector"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {renderPaymentProcessor()}
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

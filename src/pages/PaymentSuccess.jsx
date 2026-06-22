import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const PAID_TIERS = ['STUDENT', 'VISIONARY', 'TEAM'];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [settling, setSettling] = useState(false); // pago pendiente de webhook

  // Refetch del usuario al montar para sincronizar el tier
  useEffect(() => {
    doRefresh();
  }, []);

  const doRefresh = async () => {
    setLoading(true);
    try {
      await refreshUser();
    } catch (err) {
      console.error('[PaymentSuccess] Error refrescando usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  // Evaluar si el pago aún no fue procesado por el webhook
  useEffect(() => {
    if (!loading && user) {
      const isPaid = PAID_TIERS.includes(user.subscriptionTier);
      setSettling(!isPaid);
    }
  }, [loading, user]);

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) return;
    setRetrying(true);
    // Esperar antes del reintento — el webhook puede tardar unos segundos
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    await doRefresh();
    setRetryCount(prev => prev + 1);
    setRetrying(false);
  };

  // ─── ESTADO DE CARGA INICIAL ───────────────────────────────────────────────
  if (loading && retryCount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
          <p className="text-gray-400 text-lg">Verificando tu suscripción...</p>
        </div>
      </div>
    );
  }

  // ─── PAGO PENDIENTE DE WEBHOOK ─────────────────────────────────────────────
  if (settling) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Procesando tu pago</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Estamos procesando tu pago, en unos momentos se activará tu cuenta.
              Esto suele tomar menos de un minuto.
            </p>
          </div>

          {sessionId && (
            <p className="text-xs text-gray-600 font-mono truncate">
              Ref: {sessionId}
            </p>
          )}

          <button
            onClick={handleRetry}
            disabled={retrying || retryCount >= MAX_RETRIES}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              : <><RefreshCw className="w-4 h-4" /> Verificar ahora</>
            }
          </button>

          {retryCount >= MAX_RETRIES && (
            <p className="text-sm text-gray-500">
              Si el problema persiste, contacta soporte con tu referencia de pago.
            </p>
          )}

          <button
            onClick={() => navigate('/')}
            className="block w-full text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ─── PAGO CONFIRMADO ───────────────────────────────────────────────────────
  const tierLabels = {
    STUDENT:  'Miembro',
    VISIONARY: 'Pro',
    TEAM:     'Equipo'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícono de éxito */}
        <div className="w-24 h-24 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center animate-scale-in">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </div>

        {/* Mensaje principal */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">
            ¡Tu suscripción está activa!
          </h1>
          <p className="text-gray-400">
            Bienvenido al plan{' '}
            <span className="text-white font-semibold">
              {tierLabels[user?.subscriptionTier] || user?.subscriptionTier}
            </span>
            . Ya tienes acceso a todas las funcionalidades.
          </p>
        </div>

        {/* Badge del tier */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          {tierLabels[user?.subscriptionTier] || user?.subscriptionTier}
        </div>

        {/* CTA principal */}
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
        >
          Ir al Dashboard
        </button>

        <button
          onClick={() => navigate('/')}
          className="block w-full text-sm text-gray-600 hover:text-gray-400 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;

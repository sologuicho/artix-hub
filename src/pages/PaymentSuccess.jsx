import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const PAID_TIERS = ['STUDENT', 'VISIONARY', 'TEAM'];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const center = {
  backgroundColor: '#080808', minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1.5rem',
};

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => { doRefresh(); }, []);

  const doRefresh = async () => {
    setLoading(true);
    try { await refreshUser(); }
    catch (err) { console.error('[PaymentSuccess] Error refrescando usuario:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading && user) setSettling(!PAID_TIERS.includes(user.subscriptionTier));
  }, [loading, user]);

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) return;
    setRetrying(true);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    await doRefresh();
    setRetryCount(prev => prev + 1);
    setRetrying(false);
  };

  if (loading && retryCount === 0) {
    return (
      <div style={center}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 36, height: 36,
            border: '2px solid rgba(255,255,255,0.08)',
            borderTopColor: '#C4451A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Verificando suscripción…
          </p>
        </div>
      </div>
    );
  }

  if (settling) {
    return (
      <div style={center}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 2rem',
            border: '1px solid rgba(255,200,0,0.2)',
            backgroundColor: 'rgba(255,200,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={28} style={{ color: 'rgba(255,200,0,0.65)' }} />
          </div>

          <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem' }}>
            Procesando
          </p>
          <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#fff', marginBottom: '1rem' }}>
            Procesando tu pago
          </h1>
          <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: '2rem' }}>
            Estamos procesando tu pago, en unos momentos se activará tu cuenta.
            Esto suele tomar menos de un minuto.
          </p>

          {sessionId && (
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.15)', marginBottom: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Ref: {sessionId}
            </p>
          )}

          <button
            onClick={handleRetry}
            disabled={retrying || retryCount >= MAX_RETRIES}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              fontFamily: SANS, fontSize: '0.875rem', fontWeight: 500,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: retrying || retryCount >= MAX_RETRIES ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
              padding: '0.75rem 1.5rem',
              cursor: retrying || retryCount >= MAX_RETRIES ? 'not-allowed' : 'pointer',
              marginBottom: '1.5rem', transition: 'background-color 0.15s',
            }}
          >
            {retrying
              ? (<><div style={{ width: 13, height: 13, border: '1.5px solid rgba(255,255,255,0.15)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Verificando…</>)
              : (<><RefreshCw size={13} /> Verificar ahora</>)
            }
          </button>

          {retryCount >= MAX_RETRIES && (
            <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
              Si el problema persiste, contacta soporte con tu referencia de pago.
            </p>
          )}

          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', marginTop: '0.5rem' }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const tierLabels = { STUDENT: 'Miembro', VISIONARY: 'Pro', TEAM: 'Equipo' };

  return (
    <div style={center}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 2rem',
          border: '1px solid rgba(196,69,26,0.35)',
          backgroundColor: 'rgba(196,69,26,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={28} style={{ color: '#C4451A' }} />
        </div>

        <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem' }}>
          Activado
        </p>
        <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#fff', marginBottom: '1rem' }}>
          ¡Tu suscripción está activa!
        </h1>
        <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', lineHeight: 1.7 }}>
          Bienvenido al plan{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>
            {tierLabels[user?.subscriptionTier] || user?.subscriptionTier}
          </span>
          . Ya tienes acceso a todas las funcionalidades.
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          border: '1px solid rgba(196,69,26,0.35)',
          backgroundColor: 'rgba(196,69,26,0.07)',
          padding: '0.375rem 1rem', marginBottom: '2.5rem',
        }}>
          <CheckCircle2 size={12} style={{ color: '#C4451A' }} />
          <span style={{ fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4451A' }}>
            {tierLabels[user?.subscriptionTier] || user?.subscriptionTier}
          </span>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'block', width: '100%',
            fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600,
            backgroundColor: '#C4451A', color: '#fff',
            border: 'none', padding: '0.875rem',
            cursor: 'pointer', marginBottom: '1rem', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Ir al Dashboard
        </button>

        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;

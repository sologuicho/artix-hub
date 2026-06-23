import { useState, useEffect, useRef } from 'react';
import { Maximize2, Volume2, VolumeX, Loader } from 'lucide-react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const StreamViewer = ({ socket, eventId, broadcasterId, onEnded }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | live | ended | error
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!socket || !broadcasterId) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current && e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setStatus('live');
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('stream:ice', { to: broadcasterId, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') setStatus('error');
      if (pc.connectionState === 'disconnected') setStatus('ended');
    };

    const handleOffer = async ({ from, offer }) => {
      if (from !== broadcasterId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('stream:answer', { to: broadcasterId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
        setStatus('error');
      }
    };

    const handleIce = async ({ from, candidate }) => {
      if (from !== broadcasterId || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };

    const handleEnded = () => {
      setStatus('ended');
      if (videoRef.current) videoRef.current.srcObject = null;
      onEnded?.();
    };

    socket.on('stream:offer', handleOffer);
    socket.on('stream:ice', handleIce);
    socket.on('stream:ended', handleEnded);

    // Tell broadcaster we're ready to receive
    socket.emit('stream:viewer-ready', { eventId, broadcasterId });

    return () => {
      socket.off('stream:offer', handleOffer);
      socket.off('stream:ice', handleIce);
      socket.off('stream:ended', handleEnded);
      pc.close();
      pcRef.current = null;
    };
  }, [socket, eventId, broadcasterId, onEnded]);

  const toggleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  return (
    <div style={{ height: '100%', position: 'relative', backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />

      {/* Status overlays */}
      {status === 'connecting' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', backgroundColor: '#0a0a0a',
        }}>
          <Loader size={28} style={{ color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', margin: 0 }}>
            Conectando con la transmisión…
          </p>
        </div>
      )}

      {status === 'ended' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', backgroundColor: '#0a0a0a',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            La transmisión ha terminado
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem', margin: 0 }}>
            Puedes seguir en el chat del lobby
          </p>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0a0a0a',
        }}>
          <p style={{ color: '#f87171', fontSize: '0.875rem', textAlign: 'center', margin: 0, padding: '0 2rem' }}>
            Error de conexión. Recarga la página para reintentar.
          </p>
        </div>
      )}

      {/* Controls overlay (visible on hover) */}
      {status === 'live' && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0.75rem 1rem',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          opacity: 0, transition: 'opacity 0.2s',
        }}
          className="stream-controls"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              backgroundColor: '#ef4444', color: '#fff',
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em',
              padding: '0.15rem 0.5rem',
            }}>
              EN VIVO
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setMuted(m => !m)}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '0.4rem', cursor: 'pointer', display: 'flex', borderRadius: '50%' }}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={toggleFullscreen}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '0.4rem', cursor: 'pointer', display: 'flex', borderRadius: '50%' }}
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        div:hover .stream-controls { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default StreamViewer;

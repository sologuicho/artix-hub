import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Monitor, MicOff, Mic, VideoOff, Video, Square, Users } from 'lucide-react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const StreamBroadcaster = ({ socket, eventId, viewerCount, onStreamStart, onStreamEnd }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peersRef = useRef({}); // viewerId -> RTCPeerConnection
  const [mode, setMode] = useState(null); // null | 'camera' | 'screen' | 'both'
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [streaming, setStreaming] = useState(false);

  const createPeer = useCallback((viewerId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add all current tracks to this peer
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current);
      });
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('stream:ice', { to: viewerId, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        delete peersRef.current[viewerId];
      }
    };

    peersRef.current[viewerId] = pc;
    return pc;
  }, [socket]);

  // Handle new viewer joining
  useEffect(() => {
    if (!socket) return;

    const handleViewerJoined = async ({ viewerId }) => {
      if (!streamRef.current) return;
      const pc = createPeer(viewerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('stream:offer', { to: viewerId, offer });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error setting answer:', err);
      }
    };

    const handleIce = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };

    socket.on('stream:viewer-joined', handleViewerJoined);
    socket.on('stream:answer', handleAnswer);
    socket.on('stream:ice', handleIce);

    return () => {
      socket.off('stream:viewer-joined', handleViewerJoined);
      socket.off('stream:answer', handleAnswer);
      socket.off('stream:ice', handleIce);
    };
  }, [socket, createPeer]);

  const startStream = async (captureMode) => {
    setError(null);
    try {
      let mediaStream;

      if (captureMode === 'camera') {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else if (captureMode === 'screen') {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Add mic audio if screen share doesn't include system audio
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          mic.getAudioTracks().forEach(t => screen.addTrack(t));
        } catch (_) {}
        mediaStream = screen;
      } else {
        // Both: screen + camera overlay (use screen as primary, camera audio)
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const cam = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        cam.getAudioTracks().forEach(t => screen.addTrack(t));
        mediaStream = screen;
      }

      // When screen share stops via browser's native button
      mediaStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopStream();
      });

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setMode(captureMode);
      setStreaming(true);
      socket.emit('stream:ready', { eventId });
      onStreamStart?.();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso denegado. Debes permitir el acceso a la cámara/pantalla.');
      } else {
        setError('No se pudo iniciar la transmisión: ' + err.message);
      }
    }
  };

  const stopStream = useCallback(() => {
    // Stop all tracks
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    // Close all peer connections
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};

    socket.emit('stream:end', { eventId });
    setStreaming(false);
    setMode(null);
    onStreamEnd?.();
  }, [socket, eventId, onStreamEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streaming) stopStream();
    };
  }, [streaming, stopStream]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; });
    setVideoOff(v => !v);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
      {/* Video preview */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#0a0a0a' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {!streaming && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
              Elige cómo transmitir
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => startStream('camera')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', padding: '1.25rem 1.75rem', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <Camera size={24} />
                <span style={{ fontSize: '0.8125rem' }}>Cámara</span>
              </button>
              <button
                onClick={() => startStream('screen')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', padding: '1.25rem 1.75rem', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <Monitor size={24} />
                <span style={{ fontSize: '0.8125rem' }}>Pantalla</span>
              </button>
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: '0.8125rem', maxWidth: 280, textAlign: 'center', margin: 0 }}>
                {error}
              </p>
            )}
          </div>
        )}

        {streaming && (
          <>
            {/* Live badge */}
            <div style={{
              position: 'absolute', top: 12, left: 12,
              backgroundColor: '#ef4444', color: '#fff',
              fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em',
              padding: '0.2rem 0.5rem',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s infinite' }} />
              EN VIVO
            </div>

            {/* Viewer count */}
            <div style={{
              position: 'absolute', top: 12, right: 12,
              backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
              fontSize: '0.75rem', padding: '0.25rem 0.625rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <Users size={12} /> {viewerCount}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {streaming && (
        <div style={{
          padding: '0.75rem 1rem', backgroundColor: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={toggleMute}
            title={muted ? 'Activar micrófono' : 'Silenciar'}
            style={{
              background: muted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${muted ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              color: muted ? '#ef4444' : '#fff',
              padding: '0.5rem', cursor: 'pointer', display: 'flex', borderRadius: '50%',
            }}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={toggleVideo}
            title={videoOff ? 'Activar cámara' : 'Apagar cámara'}
            style={{
              background: videoOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${videoOff ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              color: videoOff ? '#ef4444' : '#fff',
              padding: '0.5rem', cursor: 'pointer', display: 'flex', borderRadius: '50%',
            }}
          >
            {videoOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          <button
            onClick={stopStream}
            title="Terminar transmisión"
            style={{
              backgroundColor: '#ef4444', border: 'none', color: '#fff',
              padding: '0.5rem 1.25rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontSize: '0.8125rem', fontWeight: 600,
            }}
          >
            <Square size={12} fill="#fff" /> Terminar
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default StreamBroadcaster;

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, Radio, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEventLobby } from '../hooks/useEventLobby';
import StreamBroadcaster from '../components/StreamBroadcaster';
import StreamViewer from '../components/StreamViewer';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [n, v] = c.trim().split('=');
    if (n === 'csrf') return v;
  }
  return null;
};

const Avatar = ({ user, size = 28 }) => {
  const initials = (user?.name || user?.username || '?').charAt(0).toUpperCase();
  return user?.avatar ? (
    <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--accent)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
};

const EventLobby = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    socket, messages, setMessages, participants, connected,
    sendMessage, broadcasterId, setBroadcasterId,
  } = useEventLobby(id, isAuthenticated());

  const isOrganizer = user && event && (
    user.id === event.creatorId || user.username === 'luisflores01'
  );

  // Load event + message history
  useEffect(() => {
    if (!isAuthenticated()) { navigate(`/events/${id}`); return; }

    Promise.all([
      fetch(`${BACKEND_URL}/api/events/${id}`, { credentials: 'include' }),
      fetch(`${BACKEND_URL}/api/events/${id}/lobby/messages`, { credentials: 'include' }),
    ]).then(async ([evRes, msgRes]) => {
      const [evData, msgData] = await Promise.all([evRes.json(), msgRes.json()]);
      if (evData.ok) setEvent(evData.event);
      if (msgData.ok) setMessages(msgData.messages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark event as live when organizer starts broadcasting
  const handleStreamStart = async () => {
    setIsBroadcasting(true);
    try {
      await fetch(`${BACKEND_URL}/api/events/${id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ isLive: true }),
      });
    } catch (_) {}
  };

  const handleStreamEnd = async () => {
    setIsBroadcasting(false);
    setBroadcasterId(null);
    try {
      await fetch(`${BACKEND_URL}/api/events/${id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ isLive: false }),
      });
    } catch (_) {}
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const isLive = isBroadcasting || !!broadcasterId;
  const viewerCount = participants.length;

  if (loading) {
    return (
      <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #333', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: '#111',
      }}>
        <button
          onClick={() => navigate(`/events/${id}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 0 }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isLive && (
              <span style={{
                backgroundColor: '#ef4444', color: '#fff',
                fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.1rem 0.4rem',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />
                EN VIVO
              </span>
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event?.title || 'Lobby'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {connected
            ? <Wifi size={13} style={{ color: '#22c55e' }} />
            : <WifiOff size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
          }
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
            <Users size={13} />
            <span className="font-mono">{viewerCount}</span>
          </div>
        </div>
      </div>

      {/* ── Body: Video + Chat ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Video panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#000' }}>

          {/* Stream area */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {isOrganizer ? (
              <StreamBroadcaster
                socket={socket}
                eventId={id}
                viewerCount={viewerCount}
                onStreamStart={handleStreamStart}
                onStreamEnd={handleStreamEnd}
              />
            ) : broadcasterId ? (
              <StreamViewer
                socket={socket}
                eventId={id}
                broadcasterId={broadcasterId}
                onEnded={() => setBroadcasterId(null)}
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem',
              }}>
                <Radio size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.375rem' }}>
                    Esperando transmisión
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8125rem', margin: 0 }}>
                    El organizador aún no ha iniciado
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
          backgroundColor: '#0f0f0f',
        }}>
          {/* Participants strip */}
          <div style={{
            padding: '0.625rem 0.875rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0,
          }}>
            {participants.slice(0, 8).map(p => (
              <div key={p.id} title={p.name || p.username} style={{ position: 'relative' }}>
                <Avatar user={p} size={24} />
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e',
                  border: '1px solid #0f0f0f',
                }} />
              </div>
            ))}
            {participants.length > 8 && (
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.25rem' }}>
                +{participants.length - 8}
              </span>
            )}
            {participants.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>Solo tú</span>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {messages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8125rem', textAlign: 'center', marginTop: '2rem' }}>
                Sé el primero en escribir
              </p>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.user?.id === user?.id;
              const prev = messages[i - 1];
              const showAuthor = !prev || prev.user?.id !== msg.user?.id;
              return (
                <div key={msg.id} style={{ marginBottom: showAuthor ? '0.75rem' : '0.2rem' }}>
                  {showAuthor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <Avatar user={msg.user} size={20} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isMine ? '#C4451A' : 'rgba(255,255,255,0.7)' }}>
                        {msg.user?.name || msg.user?.username}
                      </span>
                      <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div style={{ paddingLeft: showAuthor ? 0 : '26px' }}>
                    <span style={{
                      fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.625rem', borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', gap: '0.375rem', flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? 'Mensaje…' : 'Conectando…'}
              disabled={!connected}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff',
                padding: '0.5rem 0.625rem', fontSize: '0.875rem', lineHeight: 1.4,
                maxHeight: '80px', overflow: 'auto', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!connected || !input.trim()}
              style={{
                backgroundColor: connected && input.trim() ? '#C4451A' : 'rgba(255,255,255,0.06)',
                color: connected && input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                border: 'none', padding: '0.5rem 0.625rem', cursor: connected && input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
      `}</style>
    </div>
  );
};

export default EventLobby;

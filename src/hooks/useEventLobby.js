import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config/client';

export function useEventLobby(eventId, enabled = true) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [liveInfo, setLiveInfo] = useState(null);
  const [broadcasterId, setBroadcasterId] = useState(null);

  useEffect(() => {
    if (!eventId || !enabled) return;

    let cancelled = false;

    const connect = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/socket-token`, { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.ok || !data.token || cancelled) return;

        const s = io(BACKEND_URL, {
          auth: { token: data.token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = s;
        setSocket(s);

        s.on('connect', () => {
          setConnected(true);
          s.emit('lobby:join', { eventId });
        });

        s.on('disconnect', () => setConnected(false));
        s.on('lobby:message', (msg) => setMessages((prev) => [...prev, msg]));
        s.on('lobby:participants', (list) => setParticipants(list));
        s.on('lobby:joined', ({ user }) =>
          setParticipants((prev) => (prev.find((p) => p.id === user.id) ? prev : [...prev, user]))
        );
        s.on('lobby:left', ({ userId }) =>
          setParticipants((prev) => prev.filter((p) => p.id !== userId))
        );
        s.on('lobby:live', (info) => setLiveInfo(info));
        s.on('stream:broadcaster-online', ({ broadcasterId: bid }) => setBroadcasterId(bid));
        s.on('stream:ended', () => setBroadcasterId(null));
      } catch (_) {}
    };

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.emit('lobby:leave', { eventId });
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [eventId, enabled]);

  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !content.trim()) return;
    socketRef.current.emit('lobby:message', { eventId, content });
  }, [eventId]);

  return { socket, messages, setMessages, participants, connected, liveInfo, sendMessage, broadcasterId, setBroadcasterId };
}

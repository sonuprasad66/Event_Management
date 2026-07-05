import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

export function useSocket(
  onForceLogout: (data: { message: string; reason: string }) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((state) => state.token);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('force_logout', (data: { message: string; reason: string }) => {
      socket.disconnect();
      clearAuth();
      onForceLogout(data);
    });

    socket.on('connect_error', () => {
      // Intentionally ignored.
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [clearAuth, onForceLogout, token]);

  return socketRef.current;
}

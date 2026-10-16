import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_room', `role_${user.role}`);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('appointment:created', (data) => {
      toast.info(`New appointment booked for ${data.patientName || 'a patient'}`, {
        toastId: `appt-created-${data._id}`,
      });
      listenersRef.current['appointment:created']?.forEach((cb) => cb(data));
    });

    socket.on('appointment:updated', (data) => {
      listenersRef.current['appointment:updated']?.forEach((cb) => cb(data));
    });

    socket.on('appointment:cancelled', (data) => {
      toast.warning(`Appointment cancelled`, { toastId: `appt-cancelled-${data._id}` });
      listenersRef.current['appointment:cancelled']?.forEach((cb) => cb(data));
    });

    socket.on('appointment:arrived', (data) => {
      toast.success(`Patient arrived`, { toastId: `appt-arrived-${data._id}` });
      listenersRef.current['appointment:arrived']?.forEach((cb) => cb(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user]);

  const subscribe = (event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = new Set();
    }
    listenersRef.current[event].add(callback);
    return () => listenersRef.current[event]?.delete(callback);
  };

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ isConnected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

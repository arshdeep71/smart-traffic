import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Connect manually when authenticated
});

// Store current role to re-register on reconnect
let currentRoleData = null;

// Singleton connection manager
export const connectSocket = (roleData) => {
  if (roleData) {
    currentRoleData = roleData;
  }

  if (!socket.connected) {
    socket.connect();
  }
  
  const register = () => {
    if (!currentRoleData) return;
    if (currentRoleData.role === 'hospital_driver') {
      socket.emit('register-driver', currentRoleData);
    } else if (currentRoleData.role === 'citizen') {
      socket.emit('register-citizen', currentRoleData);
    } else if (['admin', 'super_admin', 'hospital_admin'].includes(currentRoleData.role)) {
      socket.emit('register-admin', currentRoleData);
    }
  };

  // Register immediately if already connected (or buffer it)
  register();

  // Re-register automatically on reconnects (like when the server restarts)
  socket.off('connect', register);
  socket.on('connect', register);
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

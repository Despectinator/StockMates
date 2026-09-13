import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
});

export const connectSocket = (token) => {
  if (!token) return;

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;

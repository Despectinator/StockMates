import { io } from "socket.io-client";

const token = localStorage.getItem("stockmates_token");

const socket = io("http://localhost:5000", {
  auth: {
    token,
  },
  withCredentials: true,
  autoConnect: true,
});

export default socket;

const jwt = require("jsonwebtoken");

const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (error) {
    console.error(
      "Socket JWT verification error:",
      error.name,
      error.message
    );

    next(new Error("Not authorized. Invalid or expired token"));
  }
};

module.exports = socketAuthMiddleware;

const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. No token provided",
      });
    }

    let token = authHeader.slice("Bearer ".length).trim();

    if (token.startsWith("Bearer ")) {
      token = token.slice("Bearer ".length).trim();
    }

    token = token.replace(/^['"]|['"]$/g, "");

    if (!token) {
      return res.status(401).json({
        message: "Not authorized. No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("JWT verification error:", error.name, error.message);

    return res.status(401).json({
      message: "Not authorized. Invalid or expired token",
    });
  }
};

module.exports = protect;

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Supported token locations:
  // - Authorization: Bearer <token> (case-insensitive)
  // - Authorization: <token> (raw token)
  // - x-auth-token / x-access-token headers
  // - query: ?token=<token> (fallback, useful for OAuth redirect flows)
  // - token cookie
  let tokenFromHeader = null;
  if (authHeader) {
    const trimmed = String(authHeader).trim();
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      tokenFromHeader = trimmed.substring("bearer ".length);
    } else {
      tokenFromHeader = trimmed;
    }
  }

  const tokenFromAltHeader =
    req.headers["x-auth-token"] || req.headers["x-access-token"];
  const tokenFromQuery =
    req.query && req.query.token ? String(req.query.token) : null;

  const token =
    tokenFromHeader || tokenFromAltHeader || tokenFromQuery || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { authMiddleware };


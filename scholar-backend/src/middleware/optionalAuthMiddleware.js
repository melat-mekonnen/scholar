const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/**
 * Attaches req.user when a valid Bearer/cookie token is present; otherwise continues without user.
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring("Bearer ".length) : null;
  const token = tokenFromHeader || req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  } catch {
    req.user = undefined;
  }
  return next();
}

module.exports = { optionalAuthMiddleware };

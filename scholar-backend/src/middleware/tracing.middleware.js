const crypto = require("crypto");
const observabilityService = require("../services/observability.service");

function hashIp(ip) {
  if (!ip) return "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 8);
}

const tracingMiddleware = (req, res, next) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID();
  req.id = requestId;

  // Add to response headers
  res.setHeader("X-Request-Id", requestId);

  const startTime = process.hrtime();
  const timestamp = new Date().toISOString();

  // Strip query params for cleaner endpoint tracking if desired, but let's keep them or just use baseUrl+path
  const endpoint = req.originalUrl || req.url;

  // Mask IP
  const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ipHash = hashIp(rawIp);

  // Hook into response finish
  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const responseTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
    
    const statusCode = res.statusCode;
    const errorFlag = statusCode >= 400;

    // Extract user info if authentication middleware ran
    const userRole = req.user?.role || "guest";
    const userId = req.user?.id || null;
    const planType = req.user?.planType || "free";

    const trace = {
      requestId,
      timestamp,
      method: req.method,
      endpoint,
      statusCode,
      responseTimeMs,
      userRole,
      userId,
      planType,
      ipHash,
      errorFlag
    };

    observabilityService.addTrace(trace);
  });

  next();
};

module.exports = { tracingMiddleware };

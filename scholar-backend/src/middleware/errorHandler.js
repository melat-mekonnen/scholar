function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";

  const body = { message };
  if (err.code) body.code = err.code;
  if (err.plan) body.plan = err.plan;
  if (err.used != null) body.used = err.used;
  if (err.limit != null) body.limit = err.limit;
  if (err.remaining != null) body.remaining = err.remaining;
  if (err.resetsAt) body.resetsAt = err.resetsAt;

  res.status(status).json(body);
}

module.exports = { errorHandler };


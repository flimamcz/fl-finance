"use strict";

const createRateLimiter = ({ limit, windowMs, keyGenerator }) => {
  const attempts = new Map();
  let requestsSinceCleanup = 0;

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);
    let bucket = attempts.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      attempts.set(key, bucket);
    }

    bucket.count += 1;
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 1000 || attempts.size > 10000) {
      for (const [storedKey, storedBucket] of attempts) {
        if (storedBucket.resetAt <= now) attempts.delete(storedKey);
      }
      while (attempts.size > 10000) {
        attempts.delete(attempts.keys().next().value);
      }
      requestsSinceCleanup = 0;
    }

    if (bucket.count > limit) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({
        error: true,
        message: "Muitas tentativas. Aguarde antes de tentar novamente.",
      });
    }
    return next();
  };
};

const getClientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";
const getNormalizedEmail = (req) => String(req.body?.email ?? "").trim().toLowerCase();

const limitLogin = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: getClientIp,
});
const limitRegister = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: getClientIp,
});
const limitRecoveryByIp = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  keyGenerator: getClientIp,
});
const limitRecoveryByEmail = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => getNormalizedEmail(req) || getClientIp(req),
});
const limitSetup = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  keyGenerator: getClientIp,
});

module.exports = {
  createRateLimiter,
  limitLogin,
  limitRegister,
  limitRecoveryByEmail,
  limitRecoveryByIp,
  limitSetup,
};

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("./rateLimit.middleware");

test("rate limiter blocks requests after configured threshold", () => {
  const middleware = createRateLimiter({
    limit: 2,
    windowMs: 60_000,
    keyGenerator: (req) => req.ip,
  });
  const makeResponse = () => ({
    statusCode: 200,
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let continued = false;
    middleware({ ip: "192.0.2.1" }, makeResponse(), () => { continued = true; });
    assert.equal(continued, true);
  }

  const response = makeResponse();
  middleware({ ip: "192.0.2.1" }, response, () => assert.fail("Request should be rate limited."));
  assert.equal(response.statusCode, 429);
  assert.ok(Number(response.headers["Retry-After"]) > 0);
});

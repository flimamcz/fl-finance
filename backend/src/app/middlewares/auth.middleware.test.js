"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const authService = require("../services/Auth.service");
const { authenticate } = require("./auth.middleware");

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("authenticated API requests reject bearer tokens without a session cookie", async () => {
  const req = {
    headers: { authorization: "Bearer valid-token" },
    method: "GET",
    get: () => undefined,
  };
  const res = makeResponse();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("state-changing requests require a matching CSRF cookie and header", async () => {
  const originalVerifyToken = authService.verifyToken;
  let verificationCalled = false;
  authService.verifyToken = async () => {
    verificationCalled = true;
    return { error: false, message: { id: 8 } };
  };

  try {
    const req = {
      headers: { cookie: "flfinance_session=signed; flfinance_csrf=expected" },
      method: "POST",
      get: () => "incorrect",
    };
    const res = makeResponse();

    await authenticate(req, res, () => assert.fail("request must not be authenticated"));

    assert.equal(res.statusCode, 401);
    assert.equal(verificationCalled, false);
  } finally {
    authService.verifyToken = originalVerifyToken;
  }
});

test("valid session and CSRF cookies authenticate the request", async () => {
  const originalVerifyToken = authService.verifyToken;
  authService.verifyToken = async (token) => ({
    error: false,
    message: { id: 8, email: "user@example.com", isAdmin: false, token },
  });

  try {
    const req = {
      headers: { cookie: "flfinance_session=signed; flfinance_csrf=csrf" },
      method: "PATCH",
      get: (name) => name === "X-CSRF-Token" ? "csrf" : undefined,
    };
    const res = makeResponse();
    let nextCalled = false;

    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 8);
    assert.equal(req.user.email, "user@example.com");
  } finally {
    authService.verifyToken = originalVerifyToken;
  }
});

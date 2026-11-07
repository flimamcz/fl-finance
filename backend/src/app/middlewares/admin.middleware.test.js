"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { requireAdmin } = require("./admin.middleware");

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

test("admin middleware rejects normal authenticated accounts", () => {
  const res = makeResponse();
  let nextCalled = false;
  requireAdmin({ user: { id: 8, isAdmin: false } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, true);
});

test("admin middleware permits verified administrator accounts", () => {
  const res = makeResponse();
  let nextCalled = false;
  requireAdmin({ user: { id: 1, isAdmin: true } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

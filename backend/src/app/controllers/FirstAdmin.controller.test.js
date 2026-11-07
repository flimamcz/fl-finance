"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesBootstrapToken } = require("./FirstAdmin.controller");

test("bootstrap token matching requires a sufficiently long configured secret", () => {
  const secret = "a".repeat(64);
  assert.equal(matchesBootstrapToken(secret, secret), true);
  assert.equal(matchesBootstrapToken("b".repeat(64), secret), false);
  assert.equal(matchesBootstrapToken(secret, "short"), false);
  assert.equal(matchesBootstrapToken(undefined, secret), false);
});

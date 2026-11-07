"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getCookie,
  setAuthCookies,
} = require("./AuthCookie.service");

test("session cookie is HttpOnly and CSRF cookie is separate", () => {
  const cookies = [];
  const response = {
    cookie: (name, value, options) => cookies.push({ name, value, options }),
  };
  const csrfToken = setAuthCookies(response, "signed-session", false, "csrf-value");

  assert.equal(csrfToken, "csrf-value");
  assert.equal(cookies.length, 2);
  assert.equal(cookies[0].name, "flfinance_session");
  assert.equal(cookies[0].value, "signed-session");
  assert.equal(cookies[0].options.httpOnly, true);
  assert.equal(cookies[0].options.maxAge, undefined);
  assert.equal(cookies[1].name, "flfinance_csrf");
  assert.equal(cookies[1].value, "csrf-value");
  assert.equal(cookies[1].options.httpOnly, false);
  assert.equal(cookies[1].options.sameSite, "lax");
});

test("cookie parser reads a named cookie and safely rejects malformed encoding", () => {
  const req = { headers: { cookie: "other=value; flfinance_session=abc%2Edef" } };
  assert.equal(getCookie(req, "flfinance_session"), "abc.def");
  assert.equal(getCookie(req, "missing"), null);
});

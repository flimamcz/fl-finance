"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("./auth.routes");

test("first-admin setup is not available as a public authentication route", () => {
  const paths = router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.equal(paths.includes("/setup"), false);
  assert.equal(paths.includes("/setup-status"), false);
  assert.equal(paths.includes("/first-admin"), true);
  assert.equal(paths.includes("/login"), true);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const adminService = require("../services/Admin.service");
const { editUser } = require("./Admin.controller");
const router = require("../routes/admin.routes");

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

test("admin edit controller forwards only the explicit profile and role allowlist", async () => {
  const originalEditUser = adminService.editUser;
  let received;
  adminService.editUser = async (...args) => {
    received = args;
    return { user: { id: 8, fullname: "Member", isAdmin: false } };
  };
  try {
    const req = {
      params: { id: "8" },
      user: { id: 1 },
      body: { fullname: "Member", username: "member", email: "member@example.com", isAdmin: false },
    };
    const res = makeResponse();
    await editUser(req, res);
    assert.deepEqual(received, [1, 8, req.body]);
    assert.equal(res.statusCode, 200);
  } finally {
    adminService.editUser = originalEditUser;
  }
});

test("admin edit controller rejects password and account-control fields", async () => {
  const originalEditUser = adminService.editUser;
  adminService.editUser = async () => assert.fail("invalid update must not reach service");
  try {
    const res = makeResponse();
    await editUser({
      params: { id: "8" },
      user: { id: 1 },
      body: {
        fullname: "Member",
        username: "member",
        email: "member@example.com",
        isAdmin: false,
        password: "unsafe",
      },
    }, res);
    assert.equal(res.statusCode, 400);
  } finally {
    adminService.editUser = originalEditUser;
  }
});

test("all admin routes are behind authentication and live-admin authorization", () => {
  const middlewareNames = router.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.name);
  assert.deepEqual(middlewareNames.slice(0, 2), ["authenticate", "requireAdmin"]);

  const editRoute = router.stack.find((layer) => layer.route?.path === "/users/:id");
  assert.ok(editRoute);
  assert.equal(editRoute.route.methods.patch, true);
});

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { User, sequelize } = require("../../models");
const AdminService = require("./Admin.service");

test("admin user listing returns only account management fields and pagination", async () => {
  const originals = { findAll: User.findAll, count: User.count };
  const counts = [];
  User.findAll = async (options) => {
    assert.deepEqual(options.attributes, [
      "id", "fullname", "username", "email", "isAdmin", "isBlocked", "createdAt",
    ]);
    assert.equal(options.limit, 20);
    assert.equal(options.offset, 20);
    return [{
      id: 5,
      fullname: "Member",
      username: "member",
      email: "member@example.com",
      isAdmin: false,
      isBlocked: true,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      password: "must-not-return",
    }];
  };
  User.count = async ({ where }) => {
    counts.push(where);
    if (where.isAdmin === true) return 1;
    return where.isBlocked === true ? 2 : where.isBlocked === false ? 8 : 10;
  };

  try {
    const result = await AdminService.listUsers({
      adminId: 3,
      query: "member",
      status: "blocked",
      page: 2,
      pageSize: 20,
    });
    assert.equal(result.users[0].isBlocked, true);
    assert.equal(result.users[0].isCurrentUser, false);
    assert.equal("password" in result.users[0], false);
    assert.deepEqual(result.pagination, { page: 2, pageSize: 20, total: 2, totalPages: 1 });
    assert.deepEqual(result.summary, { total: 10, active: 8, blocked: 2, admins: 1 });
    assert.equal(counts.length, 4);
  } finally {
    User.findAll = originals.findAll;
    User.count = originals.count;
  }
});

test("admin cannot block their own account", async () => {
  const originalTransaction = sequelize.transaction;
  sequelize.transaction = async () => {
    throw new Error("Transaction must not start for self-block");
  };
  try {
    const result = await AdminService.setUserBlocked(3, 3, true);
    assert.equal(result.error, "SELF_BLOCK");
  } finally {
    sequelize.transaction = originalTransaction;
  }
});

test("blocking or unblocking an account revokes its existing sessions", async () => {
  const originals = { findByPk: User.findByPk, transaction: sequelize.transaction };
  const user = {
    id: 12,
    fullname: "Member",
    username: "member",
    email: "member@example.com",
    isAdmin: false,
    isBlocked: false,
    sessionVersion: 4,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    async save({ fields }) {
      assert.deepEqual(fields, ["isBlocked", "sessionVersion"]);
    },
  };
  User.findByPk = async (_id, options) => {
    assert.ok(options.attributes.includes("sessionVersion"));
    return user;
  };
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await AdminService.setUserBlocked(3, 12, true);
    assert.equal(result.user.isBlocked, true);
    assert.equal(user.sessionVersion, 5);
    const unblocked = await AdminService.setUserBlocked(3, 12, false);
    assert.equal(unblocked.user.isBlocked, false);
    assert.equal(user.sessionVersion, 6);
  } finally {
    User.findByPk = originals.findByPk;
    sequelize.transaction = originals.transaction;
  }
});

test("admin cannot block the last active administrator", async () => {
  const originals = {
    findByPk: User.findByPk,
    findAll: User.findAll,
    transaction: sequelize.transaction,
  };
  const user = {
    id: 9,
    isAdmin: true,
    isBlocked: false,
    async save() {
      throw new Error("Last administrator must remain enabled");
    },
  };
  User.findByPk = async (_id, options) => {
    assert.ok(options.attributes.includes("sessionVersion"));
    return user;
  };
  User.findAll = async () => [{ id: 9 }];
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await AdminService.setUserBlocked(3, 9, true);
    assert.equal(result.error, "LAST_ADMIN");
  } finally {
    User.findByPk = originals.findByPk;
    User.findAll = originals.findAll;
    sequelize.transaction = originals.transaction;
  }
});

test("admin recovery code is stored hashed with a short expiry", async () => {
  const originalFindByPk = User.findByPk;
  const user = {
    id: 12,
    fullname: "Member",
    username: "member",
    email: "member@example.com",
    isAdmin: false,
    isBlocked: false,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    resetCodeHash: null,
    resetCodeHint: null,
    resetCodeExpiresAt: null,
    sessionVersion: 4,
    async save({ fields }) {
      assert.deepEqual(fields, ["resetCodeHash", "resetCodeHint", "resetCodeExpiresAt", "sessionVersion"]);
    },
  };
  User.findByPk = async (_id, options) => {
    assert.ok(options.attributes.includes("sessionVersion"));
    return user;
  };

  try {
    const result = await AdminService.generateRecoveryCode(3, 12);
    assert.match(result.recoveryCode, /^\d{6}$/);
    assert.equal(await bcrypt.compare(result.recoveryCode, user.resetCodeHash), true);
    assert.equal(user.resetCodeHint, `${result.recoveryCode.slice(0, 2)}***${result.recoveryCode.slice(-1)}`);
    assert.ok(new Date(result.expiresAt).getTime() > Date.now());
    assert.ok(new Date(result.expiresAt).getTime() <= Date.now() + 30 * 60 * 1000);
    assert.equal(user.sessionVersion, 5);
    assert.equal("resetCodeHash" in result.user, false);
    assert.equal("recoveryCode" in result.user, false);
  } finally {
    User.findByPk = originalFindByPk;
  }
});

test("admin cannot issue a recovery code for their own account from the admin panel", async () => {
  const result = await AdminService.generateRecoveryCode(3, 3);
  assert.equal(result.error, "SELF_RESET");
});

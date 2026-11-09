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
      "id", "fullname", "username", "email", "isAdmin", "isBlocked", "createdAt", "deletedAt",
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
      deletedAt: null,
      password: "must-not-return",
    }];
  };
  User.count = async ({ where }) => {
    counts.push(where);
    if (where.isAdmin === true) return 1;
    if (where.deletedAt) return 0;
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
    assert.deepEqual(result.summary, { total: 10, active: 8, blocked: 2, archived: 0, admins: 1 });
    assert.equal(counts.length, 5);
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

test("admin cannot archive their own account", async () => {
  const originalTransaction = sequelize.transaction;
  sequelize.transaction = async () => {
    throw new Error("Transaction must not start for self-archive");
  };
  try {
    const result = await AdminService.archiveUser(3, 3);
    assert.equal(result.error, "SELF_ARCHIVE");
  } finally {
    sequelize.transaction = originalTransaction;
  }
});

test("admin cannot archive the last active administrator", async () => {
  const originals = { findByPk: User.findByPk, findAll: User.findAll, transaction: sequelize.transaction };
  User.findByPk = async () => ({ id: 9, isAdmin: true, isBlocked: false });
  User.findAll = async () => [{ id: 9 }];
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await AdminService.archiveUser(3, 9);
    assert.equal(result.error, "LAST_ADMIN");
  } finally {
    User.findByPk = originals.findByPk;
    User.findAll = originals.findAll;
    sequelize.transaction = originals.transaction;
  }
});

test("archiving revokes sessions and marks the account reversible", async () => {
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
    deletedAt: null,
    async save({ fields }) {
      assert.deepEqual(fields, ["sessionVersion"]);
    },
    async destroy() {
      this.deletedAt = new Date();
    },
  };
  User.findByPk = async () => user;
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await AdminService.archiveUser(3, 12);
    assert.equal(user.sessionVersion, 5);
    assert.equal(result.user.isArchived, true);
    assert.ok(result.user.archivedAt);
  } finally {
    User.findByPk = originals.findByPk;
    sequelize.transaction = originals.transaction;
  }
});

test("restoring an archived user revokes old sessions", async () => {
  const originals = { findByPk: User.findByPk, transaction: sequelize.transaction };
  const user = {
    id: 12,
    fullname: "Member",
    username: "member",
    email: "member@example.com",
    isAdmin: false,
    isBlocked: false,
    sessionVersion: 5,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    deletedAt: new Date("2025-03-01T00:00:00.000Z"),
    async save({ fields }) {
      assert.deepEqual(fields, ["sessionVersion"]);
    },
    async restore() {
      this.deletedAt = null;
    },
  };
  User.findByPk = async (_id, options) => {
    assert.equal(options.paranoid, false);
    return user;
  };
  sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } });

  try {
    const result = await AdminService.restoreUser(3, 12);
    assert.equal(user.sessionVersion, 6);
    assert.equal(result.user.isArchived, false);
  } finally {
    User.findByPk = originals.findByPk;
    sequelize.transaction = originals.transaction;
  }
});

test("admin profile and role changes are limited to editable fields and revoke sessions", async () => {
  const originals = {
    findByPk: User.findByPk,
    findOne: User.findOne,
    transaction: sequelize.transaction,
  };
  const user = {
    id: 12,
    fullname: "Member",
    username: "member",
    email: "member@example.com",
    isAdmin: false,
    isBlocked: false,
    sessionVersion: 4,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    deletedAt: null,
    async save(options) {
      assert.deepEqual(options.fields, ["fullname", "username", "email", "isAdmin", "sessionVersion"]);
      assert.equal(options.transaction, transaction);
    },
  };
  const actor = {
    id: 3,
    isAdmin: true,
    isBlocked: false,
    password: bcrypt.hashSync("admin-current-password", 4),
  };
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  User.findByPk = async (id, options) => {
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return id === 3 ? actor : user;
  };
  User.findOne = async (options) => {
    assert.equal(options.transaction, transaction);
    assert.equal(options.paranoid, false);
    return null;
  };
  sequelize.transaction = async (callback) => callback(transaction);

  try {
    const result = await AdminService.editUser(3, 12, {
      fullname: " Member Updated ",
      username: "Member.2",
      email: "MEMBER2@example.com ",
      isAdmin: true,
      currentPassword: "admin-current-password",
    });
    assert.equal(result.user.fullname, "Member Updated");
    assert.equal(result.user.username, "member.2");
    assert.equal(result.user.email, "member2@example.com");
    assert.equal(result.user.isAdmin, true);
    assert.equal(user.sessionVersion, 5);
    assert.equal("password" in result.user, false);
  } finally {
    User.findByPk = originals.findByPk;
    User.findOne = originals.findOne;
    sequelize.transaction = originals.transaction;
  }
});

test("admin edit rejects self changes, invalid inputs, archived users, and duplicate identity", async () => {
  const originalTransaction = sequelize.transaction;
  sequelize.transaction = async () => {
    throw new Error("Transaction must not start for self-edit or invalid input");
  };
  try {
    const self = await AdminService.editUser(3, 3, {
      fullname: "Admin", username: "admin", email: "admin@example.com", isAdmin: true,
    });
    assert.equal(self.error, "SELF_EDIT");
    const invalid = await AdminService.editUser(3, 12, {
      fullname: "A", username: "valid-user", email: "member@example.com", isAdmin: false,
    });
    assert.equal(invalid.error, "INVALID_INPUT");
  } finally {
    sequelize.transaction = originalTransaction;
  }

  const originals = { findByPk: User.findByPk, findOne: User.findOne, transaction: sequelize.transaction };
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const user = {
    id: 12, fullname: "Member", username: "member", email: "member@example.com",
    isAdmin: false, isBlocked: false, sessionVersion: 0, createdAt: new Date(),
    deletedAt: new Date(),
  };
  User.findByPk = async () => user;
  User.findOne = async () => ({ id: 13 });
  sequelize.transaction = async (callback) => callback(transaction);
  try {
    const archived = await AdminService.editUser(3, 12, {
      fullname: "Member", username: "member", email: "member@example.com", isAdmin: false,
    });
    assert.equal(archived.error, "ARCHIVED");
    user.deletedAt = null;
    const duplicate = await AdminService.editUser(3, 12, {
      fullname: "Member", username: "member", email: "member@example.com", isAdmin: false,
    });
    assert.equal(duplicate.error, "DUPLICATE");
  } finally {
    User.findByPk = originals.findByPk;
    User.findOne = originals.findOne;
    sequelize.transaction = originals.transaction;
  }
});

test("admin cannot demote the last active administrator", async () => {
  const originals = {
    findByPk: User.findByPk,
    findOne: User.findOne,
    findAll: User.findAll,
    transaction: sequelize.transaction,
  };
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const actor = {
    id: 3,
    isAdmin: true,
    isBlocked: false,
    password: bcrypt.hashSync("admin-current-password", 4),
  };
  User.findByPk = async (id) => id === 3 ? actor : ({
    id: 9, fullname: "Admin", username: "admin", email: "admin@example.com",
    isAdmin: true, isBlocked: false, sessionVersion: 2, createdAt: new Date(), deletedAt: null,
  });
  User.findOne = async () => null;
  User.findAll = async (options) => {
    assert.deepEqual(options.where, { isAdmin: true, isBlocked: false });
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return [{ id: 9 }];
  };
  sequelize.transaction = async (callback) => callback(transaction);
  try {
    const result = await AdminService.editUser(3, 9, {
      fullname: "Admin", username: "admin", email: "admin@example.com", isAdmin: false,
      currentPassword: "admin-current-password",
    });
    assert.equal(result.error, "LAST_ADMIN");
  } finally {
    User.findByPk = originals.findByPk;
    User.findOne = originals.findOne;
    User.findAll = originals.findAll;
    sequelize.transaction = originals.transaction;
  }
});

test("admin role cannot be changed without the acting administrator's current password", async () => {
  const originals = { findByPk: User.findByPk, findOne: User.findOne, transaction: sequelize.transaction };
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const target = {
    id: 12, fullname: "Member", username: "member", email: "member@example.com",
    isAdmin: false, isBlocked: false, sessionVersion: 4, createdAt: new Date(), deletedAt: null,
  };
  const actor = {
    id: 3,
    isAdmin: true,
    isBlocked: false,
    password: bcrypt.hashSync("correct-admin-password", 4),
  };
  User.findByPk = async (id) => id === 3 ? actor : target;
  User.findOne = async () => null;
  sequelize.transaction = async (callback) => callback(transaction);

  try {
    const result = await AdminService.editUser(3, 12, {
      fullname: "Member",
      username: "member",
      email: "member@example.com",
      isAdmin: true,
      currentPassword: "wrong-password",
    });
    assert.equal(result.error, "REAUTH_REQUIRED");
    assert.equal(target.isAdmin, false);
    assert.equal(target.sessionVersion, 4);
  } finally {
    User.findByPk = originals.findByPk;
    User.findOne = originals.findOne;
    sequelize.transaction = originals.transaction;
  }
});

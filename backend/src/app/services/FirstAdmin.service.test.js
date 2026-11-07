"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { sequelize, SystemSetting, User } = require("../../models");
const { createFirstAdmin } = require("./FirstAdmin.service");

const createTransaction = () => ({
  LOCK: { UPDATE: "UPDATE" },
  finished: undefined,
  async commit() { this.finished = "commit"; },
  async rollback() { this.finished = "rollback"; },
});

test("first-admin creation stores a password hash and marks setup complete atomically", async () => {
  const originals = {
    transaction: sequelize.transaction,
    findByPk: SystemSetting.findByPk,
    count: User.count,
    findOne: User.findOne,
    create: User.create,
    update: SystemSetting.update,
  };
  const transaction = createTransaction();
  let createdUser;
  let markedComplete = false;
  sequelize.transaction = async () => transaction;
  SystemSetting.findByPk = async (_id, options) => {
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return { adminSetupComplete: false };
  };
  User.count = async () => 0;
  User.findOne = async () => null;
  User.create = async (data, options) => {
    assert.equal(options.transaction, transaction);
    createdUser = data;
  };
  SystemSetting.update = async (values, options) => {
    assert.deepEqual(values, { adminSetupComplete: true });
    assert.equal(options.transaction, transaction);
    markedComplete = true;
    return [1];
  };

  try {
    const result = await createFirstAdmin({
      fullname: "Admin User",
      username: "admin.user",
      email: "ADMIN@example.com",
      password: "a-secure-password",
    });
    assert.deepEqual(result, { error: null });
    assert.equal(createdUser.isAdmin, true);
    assert.equal(createdUser.username, "admin.user");
    assert.equal(createdUser.email, "admin@example.com");
    assert.equal(await bcrypt.compare("a-secure-password", createdUser.password), true);
    assert.equal(markedComplete, true);
    assert.equal(transaction.finished, "commit");
  } finally {
    sequelize.transaction = originals.transaction;
    SystemSetting.findByPk = originals.findByPk;
    User.count = originals.count;
    User.findOne = originals.findOne;
    User.create = originals.create;
    SystemSetting.update = originals.update;
  }
});

test("first-admin creation refuses weak passwords before opening a database transaction", async () => {
  const originalTransaction = sequelize.transaction;
  sequelize.transaction = async () => {
    throw new Error("Transaction should not start for invalid input");
  };
  try {
    const result = await createFirstAdmin({
      fullname: "Admin User",
      username: "admin.user",
      email: "admin@example.com",
      password: "short",
    });
    assert.deepEqual(result, { error: "INVALID_PASSWORD" });
  } finally {
    sequelize.transaction = originalTransaction;
  }
});

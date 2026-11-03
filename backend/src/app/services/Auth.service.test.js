"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User, SystemSetting, sequelize } = require("../../models");
const UserService = require("./User.service");
const AuthService = require("./Auth.service");

test("login accepts usernames and email addresses", async () => {
  const originalFindOne = User.findOne;
  const previousSecret = process.env.JWT_SECRET;
  const foundQueries = [];
  const user = {
    id: 8,
    fullname: "Test User",
    username: "test.user",
    email: "test@example.com",
    password: bcrypt.hashSync("test-password", 4),
    isAdmin: false,
  };
  User.findOne = async ({ where }) => {
    foundQueries.push(where);
    return user;
  };
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    for (const identifier of [" TEST.USER ", "TEST@EXAMPLE.COM"]) {
      const result = await AuthService.login(identifier, "test-password");
      assert.equal(result.error, false);
      assert.equal(result.message.user.username, "test.user");
      assert.equal(typeof result.message.token, "string");
    }

    assert.equal(foundQueries.length, 2);
    for (const where of foundQueries) {
      assert.equal(where[Op.or][0].email, where[Op.or][1].username);
    }
  } finally {
    User.findOne = originalFindOne;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("initial setup creates one admin account and then closes", async () => {
  const originals = {
    findByPk: SystemSetting.findByPk,
    update: SystemSetting.update,
    findAll: User.findAll,
    create: User.create,
    transaction: sequelize.transaction,
  };
  const previousSecret = process.env.JWT_SECRET;
  let setupComplete = false;
  let accountCount = 0;
  let savedAccount;

  SystemSetting.findByPk = async () => ({ adminSetupComplete: setupComplete });
  SystemSetting.update = async () => {
    if (setupComplete) return [0];
    setupComplete = true;
    return [1];
  };
  User.findAll = async () => [];
  User.create = async (data) => {
    savedAccount = data;
    accountCount += 1;
    return { id: 1, ...data, createdAt: new Date() };
  };
  sequelize.transaction = async (callback) => callback({});
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    const result = await AuthService.setupAdmin({
      username: "owner",
      email: "owner@example.com",
      password: "a-strong-password",
    });
    assert.equal(result.error, false);
    assert.equal(result.message.user.isAdmin, true);
    assert.equal(savedAccount.isAdmin, true);
    assert.notEqual(savedAccount.password, "a-strong-password");
    assert.equal(bcrypt.compareSync("a-strong-password", savedAccount.password), true);

    const repeated = await AuthService.setupAdmin({
      username: "another-admin",
      email: "another@example.com",
      password: "another-strong-password",
    });
    assert.equal(repeated.error, true);
    assert.equal(accountCount, 1);
  } finally {
    SystemSetting.findByPk = originals.findByPk;
    SystemSetting.update = originals.update;
    User.findAll = originals.findAll;
    User.create = originals.create;
    sequelize.transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("initial setup ignores only migration placeholder accounts", async () => {
  const originals = {
    findByPk: SystemSetting.findByPk,
    update: SystemSetting.update,
    findAll: User.findAll,
    create: User.create,
    transaction: sequelize.transaction,
  };
  const previousSecret = process.env.JWT_SECRET;
  let setupComplete = false;
  let createdUser;

  SystemSetting.findByPk = async () => ({ adminSetupComplete: setupComplete });
  SystemSetting.update = async () => {
    setupComplete = true;
    return [1];
  };
  User.findAll = async () => [{ id: 1, username: "legacy_1" }];
  User.create = async (data) => {
    createdUser = { id: 2, ...data, createdAt: new Date() };
    return createdUser;
  };
  sequelize.transaction = async (callback) => callback({});
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    const status = await AuthService.getSetupStatus();
    assert.equal(status.setupRequired, true);
    assert.equal(status.existingUsers, false);

    const result = await AuthService.setupAdmin({
      username: "owner",
      email: "owner@example.com",
      password: "a-strong-password",
    });

    assert.equal(result.error, false);
    assert.equal(createdUser.isAdmin, true);
    assert.equal(result.message.user.username, "owner");
  } finally {
    SystemSetting.findByPk = originals.findByPk;
    SystemSetting.update = originals.update;
    User.findAll = originals.findAll;
    User.create = originals.create;
    sequelize.transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("initial setup promotes an existing account only after password verification", async () => {
  const originals = {
    findByPk: SystemSetting.findByPk,
    update: SystemSetting.update,
    findAll: User.findAll,
    findOne: User.findOne,
    transaction: sequelize.transaction,
  };
  const previousSecret = process.env.JWT_SECRET;
  let setupComplete = false;
  const account = {
    id: 5,
    fullname: "Legacy User",
    username: "old.username",
    email: "legacy@example.com",
    password: bcrypt.hashSync("current-password", 4),
    isAdmin: false,
    async save() {},
  };
  User.findAll = async () => [{ id: account.id, username: account.username }];
  User.findOne = async ({ where }) => {
    if (where.email === account.email) return account;
    return null;
  };
  SystemSetting.findByPk = async () => ({ adminSetupComplete: setupComplete });
  SystemSetting.update = async () => {
    if (setupComplete) return [0];
    setupComplete = true;
    return [1];
  };
  sequelize.transaction = async (callback) =>
    callback({ LOCK: { UPDATE: "UPDATE" } });
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    const invalid = await AuthService.setupAdmin({
      username: "owner",
      email: account.email,
      password: "wrong-password",
    });
    assert.equal(invalid.error, true);
    assert.equal(setupComplete, false);

    const result = await AuthService.setupAdmin({
      username: "owner",
      email: account.email,
      password: "current-password",
    });
    assert.equal(result.error, false);
    assert.equal(account.username, "owner");
    assert.equal(account.isAdmin, true);
    assert.equal(result.message.user.isAdmin, true);
  } finally {
    SystemSetting.findByPk = originals.findByPk;
    SystemSetting.update = originals.update;
    User.findAll = originals.findAll;
    User.findOne = originals.findOne;
    sequelize.transaction = originals.transaction;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

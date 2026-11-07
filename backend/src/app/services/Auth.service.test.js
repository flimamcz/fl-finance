"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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
      assert.deepEqual(result.message.user, { authenticated: true });
      assert.equal(typeof result.message.token, "string");
      const decodedToken = jwt.decode(result.message.token);
      assert.equal(decodedToken.exp - decodedToken.iat, 8 * 60 * 60);
      assert.equal(decodedToken.email, undefined);
      assert.equal(decodedToken.username, undefined);
      assert.equal(decodedToken.name, undefined);
      assert.equal(decodedToken.isAdmin, false);
      assert.equal(decodedToken.ver, 3);
      assert.equal(decodedToken.sv, 0);
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

test("token verification rejects sessions older than eight hours", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    const token = jwt.sign(
      { id: 8, iat: Math.floor(Date.now() / 1000) - 9 * 60 * 60 },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    const result = await AuthService.verifyToken(token);
    assert.equal(result.error, true);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("blocked account cannot log in with otherwise valid credentials", async () => {
  const originalFindOne = User.findOne;
  const previousSecret = process.env.JWT_SECRET;
  User.findOne = async () => ({
    id: 8,
    username: "test.user",
    email: "test@example.com",
    password: bcrypt.hashSync("test-password", 4),
    isAdmin: false,
    isBlocked: true,
  });
  process.env.JWT_SECRET = "test-only-signing-secret";

  try {
    const result = await AuthService.login("test.user", "test-password");
    assert.equal(result.error, true);
    assert.equal(result.blocked, true);
    assert.equal(result.message, "Esta conta está bloqueada. Entre em contato com o suporte.");
  } finally {
    User.findOne = originalFindOne;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("session verification uses current account status and administrator role", async () => {
  const originalFindByPk = User.findByPk;
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-signing-secret";
  User.findByPk = async () => ({ id: 8, isAdmin: false, isBlocked: false, sessionVersion: 0 });

  try {
    const token = jwt.sign(
      { id: 8, isAdmin: true, ver: 3, sv: 0 },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const result = await AuthService.verifyToken(token);
    assert.equal(result.error, false);
    assert.deepEqual(result.message, { id: 8, isAdmin: false });

    User.findByPk = async () => ({ id: 8, isAdmin: true, isBlocked: true, sessionVersion: 0 });
    const blockedResult = await AuthService.verifyToken(token);
    assert.equal(blockedResult.error, true);

    User.findByPk = async () => ({ id: 8, isAdmin: false, isBlocked: false, sessionVersion: 1 });
    const revokedResult = await AuthService.verifyToken(token);
    assert.equal(revokedResult.error, true);
  } finally {
    User.findByPk = originalFindByPk;
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
    assert.deepEqual(result.message.user, { authenticated: true });
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
    assert.deepEqual(result.message.user, { authenticated: true });
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
    assert.deepEqual(result.message.user, { authenticated: true });
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

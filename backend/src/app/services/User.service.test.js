"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { User, sequelize } = require("../../models");
const UserService = require("./User.service");

test("user directory query excludes password and recovery credentials", async () => {
  const originalFindAll = User.findAll;
  let queryOptions;
  User.findAll = async (options) => {
    queryOptions = options;
    return [{ id: 1, username: "owner" }];
  };

  try {
    const result = await UserService.searchUsers();
    assert.equal(result.error, null);
    assert.deepEqual(queryOptions.attributes, ["id", "fullname", "username", "email", "isAdmin", "createdAt"]);
  } finally {
    User.findAll = originalFindAll;
  }
});

test("own profile query only selects fields used by the profile screen", async () => {
  const originalFindOne = User.findOne;
  let queryOptions;
  User.findOne = async (options) => {
    queryOptions = options;
    return {
      toJSON: () => ({
        fullname: "Owner",
        email: "owner@example.com",
        photo: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      }),
    };
  };

  try {
    const result = await UserService.getMyProfile(1);
    assert.equal(result.error, null);
    assert.deepEqual(queryOptions.attributes, ["fullname", "email", "photo", "createdAt"]);
    assert.equal("id" in result.message, false);
    assert.equal("isAdmin" in result.message, false);
    assert.equal("username" in result.message, false);
  } finally {
    User.findOne = originalFindOne;
  }
});

test("profile updates never return credentials or account administration fields", async () => {
  const originalFindOne = User.findOne;
  let queryOptions;
  const user = {
    id: 1,
    fullname: "Owner",
    username: "owner",
    email: "owner@example.com",
    photo: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    password: "password-hash",
    resetCodeHash: "recovery-hash",
    resetCodeHint: "12***6",
    isAdmin: true,
    async save() {},
  };
  User.findOne = async (options) => {
    queryOptions = options;
    return user;
  };

  try {
    const result = await UserService.updateMyProfile(1, { name: "Updated Owner" });
    assert.equal(result.error, null);
    assert.deepEqual(queryOptions.where, { id: 1 });
    assert.deepEqual(queryOptions.attributes, ["id", "fullname", "email", "photo", "createdAt"]);
    assert.deepEqual(Object.keys(result.message).sort(), [
      "createdAt",
      "email",
      "fullname",
      "joinedDate",
      "photo",
    ]);
    assert.equal(result.message.fullname, "Updated Owner");
  } finally {
    User.findOne = originalFindOne;
  }
});

test("password recovery rotates its code and consumes the previous one", async () => {
  const originals = {
    findOne: User.findOne,
    transaction: sequelize.transaction,
  };
  const user = {
    resetCodeHash: bcrypt.hashSync("123456", 4),
    resetCodeHint: "12***6",
    async save() {},
  };
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  User.findOne = async (options) => {
    assert.deepEqual(options.where, { email: "owner@example.com" });
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, transaction.LOCK.UPDATE);
    return user;
  };
  sequelize.transaction = async (callback) => callback(transaction);

  try {
    const result = await UserService.resetPassword("owner@example.com", "123456", "new-password");
    assert.equal(result.error, null);
    assert.match(result.recoveryCode, /^\d{6}$/);
    assert.equal(await bcrypt.compare("123456", user.resetCodeHash), false);
    assert.equal(await bcrypt.compare(result.recoveryCode, user.resetCodeHash), true);
    assert.equal(await bcrypt.compare("new-password", user.password), true);
  } finally {
    User.findOne = originals.findOne;
    sequelize.transaction = originals.transaction;
  }
});

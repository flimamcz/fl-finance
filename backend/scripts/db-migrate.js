"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const backendDirectory = path.resolve(__dirname, "..");
const rootEnvPath = path.resolve(backendDirectory, "..", ".env");
dotenv.config({ path: rootEnvPath });

const requiredVariables = [
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
];
const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required variables in ${rootEnvPath}: ${missingVariables.join(", ")}`
  );
}

async function migrateDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });

  try {
    const database = process.env.MYSQL_DATABASE.replace(/`/g, "``");
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }

  console.log(`Database "${process.env.MYSQL_DATABASE}" is ready.`);

  const sequelizeCli = require.resolve("sequelize-cli/lib/sequelize");
  const migration = spawnSync(
    process.execPath,
    [sequelizeCli, "db:migrate"],
    {
      cwd: backendDirectory,
      env: process.env,
      stdio: "inherit",
    }
  );

  if (migration.error) {
    throw migration.error;
  }

  if (migration.status !== 0) {
    process.exitCode = migration.status || 1;
  }
}

migrateDatabase().catch((error) => {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
});

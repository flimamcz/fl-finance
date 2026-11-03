
const fs = require("fs");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

const config = {
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  dialect: "mysql",
  logging: false,
};

// SSL somente em produção (Aiven)
if (isProduction) {
  let ca;

  if (process.env.DB_SSL_CA_PATH) {
    ca = fs.readFileSync(
      path.resolve(process.env.DB_SSL_CA_PATH),
      "utf8"
    );
  } else if (process.env.DB_SSL_CA) {
    ca = process.env.DB_SSL_CA;
  }

  if (!ca) {
    throw new Error(
      "Certificado SSL não configurado para produção."
    );
  }

  config.dialectOptions = {
    ssl: {
      ca,
      rejectUnauthorized: true,
    },
  };
}

module.exports = {
  development: config,
  test: config,
  production: config,
};

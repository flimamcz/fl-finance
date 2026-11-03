const config = {
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      ca: process.env.DB_SSL_CA,
      rejectUnauthorized: true
    }
  },
  logging: false
};

module.exports = {
  development: config,
  test: config,
  production: config
};
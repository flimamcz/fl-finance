require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3001;

const host = '192.168.0.10'

app.listen(port, () => {
  console.log(`✅ Backend rodando: http://${host}:${port}`);
  console.log(`📌 Transações:    http://${host}:${port}/transactions`);
  console.log(`📌 Tipos:         http://${host}:${port}/types`);
  console.log(`📌 Usuários:      http://${host}:${port}/users`);
});
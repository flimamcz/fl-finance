require("dotenv").config();
const app = require("./app");

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`✅ Backend rodando: http://localhost:${port}`);
  console.log(`📌 Transações:    http://localhost:${port}/transactions`);
  console.log(`📌 Tipos:         http://localhost:${port}/types`);
  console.log(`📌 Usuários:      http://localhost:${port}/users`);
});
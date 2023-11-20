const express = require("express");
const cors = require("cors");

const transactionsRouter = require("./src/app/routes/transactions.routes");
const userRouter = require("./src/app/routes/user.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRouter);
app.use("/transactions", transactionsRouter);

module.exports = app;

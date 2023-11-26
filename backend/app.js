const express = require("express");
const cors = require("cors");

const transactionsRouter = require("./src/app/routes/transactions.routes");
const userRouter = require("./src/app/routes/user.routes");
const typesRouter = require("./src/app/routes/type.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRouter);
app.use("/transactions", transactionsRouter);
app.use("/types", typesRouter);

module.exports = app;

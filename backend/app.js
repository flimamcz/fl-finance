const express = require("express");
const cors = require("cors");
const transactionsRouter = require("./src/app/routes/transactions.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/transactions", transactionsRouter);

module.exports = app;

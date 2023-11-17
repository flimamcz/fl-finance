const validateTransaction = (req, res, next) => {
  const requiredProperties = [
    "value",
    "typeId",
    "description",
    "date",
    "status",
  ];
  if (requiredProperties.every((property) => property in req.body)) {
    next();
  } else {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios" });
  }
};

module.exports = { validateTransaction };

const TypeService = require("../services/Type.service");

const searchTypesTransaction = async (req, res) => {
  const { error, message } = await TypeService.searchAllTypes();

  if (error) {
    return res.status(404).json(message);
  }

  return res.status(200).json(message);
};

module.exports = {
  searchTypesTransaction,
};

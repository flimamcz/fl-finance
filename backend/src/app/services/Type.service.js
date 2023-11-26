const { Type } = require("../../models");

const searchAllTypes = async () => {
  const allTypes = await Type.findAll();

  if (!allTypes) {
    return {
      error: "NOT FOUND",
      message: "Nenhum tipo de transação encontrada!",
    };
  }

  return { error: null, message: allTypes };
};

module.exports = {
  searchAllTypes,
};

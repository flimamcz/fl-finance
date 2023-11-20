const { User } = require("../../models");

const searchUsers = async () => {
  const users = await User.findAll();

  if (!users) {
    return { error: "NOT FOUND", message: "Nenhum usuário encontrado!" };
  }

  return { error: null, message: users };
};

const createUser = async (dataUser) => {
  const findUserByEmail = await User.findOne({
    where: { email: dataUser.email },
  });

  if (findUserByEmail) {
    return { error: "Bad Request", message: "Email já cadastrado!" };
  }

  const createUserRequest = await User.create(dataUser);

  if (!createUserRequest) {
    return { error: "Bad Request", message: "Erro ao criar conta!" };
  }
  return { error: null, message: createUserRequest };
};

module.exports = {
  createUser,
  searchUsers,
};

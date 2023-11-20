const userService = require("../services/User.service");

const searchUsers = async (req, res) => {
  const { error, message } = await userService.searchUsers();

  if (error) {
    return res.status(404).json(message);
  }

  return res.status(200).json(message);
};

const createUser = async (req, res) => {
  const {
    fullname,
    user_pf,
    email,
    password,
    positionWork,
    createdAt,
    updatedAt,
  } = req.body;
  const { error, message } = await userService.createUser({
    fullname,
    user_pf,
    email,
    password,
    positionWork,
    createdAt,
    updatedAt,
  });

  if (error) {
    return res.status(400).json({ message });
  }

  const createdUser = {
    message: "Usuário criado com sucesso!",
    operation: message,
  };

  return res.status(200).json(createdUser);
};

module.exports = {
  createUser,
  searchUsers,
};

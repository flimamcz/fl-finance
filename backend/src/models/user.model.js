const UserModel = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    userPF: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return User;
};

module.exports = UserModel;

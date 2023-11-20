const UserModel = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      fullname: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      user_pf: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        
      },

      createdAt: {
        field: "created_at",
        type: DataTypes.DATE,
      },
      updatedAt: {
        field: "updated_at",
        type: DataTypes.DATE,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { timestamp: true, underscored: true}
  );

  return User;
};

module.exports = UserModel;

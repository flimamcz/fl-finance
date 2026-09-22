const UserModel = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      fullname: {
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
      photo: {
        type: DataTypes.TEXT("medium"),
        allowNull: true,
      },
      resetCodeHash: {
        field: "reset_code_hash",
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetCodeHint: {
        field: "reset_code_hint",
        type: DataTypes.STRING(6),
        allowNull: true,
      },
    },
    { timestamp: true, underscored: true}
  );

  return User;
};

module.exports = UserModel;

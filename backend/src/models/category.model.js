// src/models/category.model.js - CORRIGIDO
const categoryModel = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category", // Nome do modelo
    {
      id: {
        allowNull: false,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING,
        defaultValue: "📄",
      },
      color: {
        type: DataTypes.STRING,
        defaultValue: "#94a3b8",
      },
    },
    {
      underscored: true,
      timestamps: false,
      tableName: 'Categories' // 🔥 NOME EXPLÍCITO DA TABELA
    }
  );

  Category.associate = (models) => {
    Category.hasMany(models.Transaction, {
      foreignKey: 'category_id',
      as: 'transactions'
    });
  };

  return Category;
};

module.exports = categoryModel;
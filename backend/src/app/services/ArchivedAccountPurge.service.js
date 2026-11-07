"use strict";

const { Op } = require("sequelize");
const {
  Debt,
  DebtInstallment,
  InvestmentMovement,
  Transaction,
  User,
  sequelize,
} = require("../../models");

const RETENTION_DAYS = 30;
const PURGE_BATCH_SIZE = 25;

const purgeExpiredArchivedAccounts = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  return sequelize.transaction(async (transaction) => {
    const expiredUsers = await User.findAll({
      paranoid: false,
      where: { deletedAt: { [Op.lte]: cutoff } },
      attributes: ["id"],
      order: [["deletedAt", "ASC"], ["id", "ASC"]],
      limit: PURGE_BATCH_SIZE,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const expiredUser of expiredUsers) {
      const debtRows = await Debt.findAll({
        where: { user_id: expiredUser.id },
        attributes: ["id"],
        transaction,
      });
      const debtIds = debtRows.map(({ id }) => id);
      const movementRows = await InvestmentMovement.findAll({
        where: { user_id: expiredUser.id },
        attributes: ["transaction_id"],
        transaction,
      });
      const movementTransactionIds = movementRows.map(({ transaction_id: transactionId }) => transactionId);
      const ownedTransactions = await Transaction.findAll({
        where: { user_id: expiredUser.id },
        attributes: ["id"],
        transaction,
      });
      const linkedTransactions = movementTransactionIds.length
        ? await Transaction.findAll({
          where: {
            id: { [Op.in]: movementTransactionIds },
            [Op.or]: [{ user_id: expiredUser.id }, { user_id: null }],
          },
          attributes: ["id"],
          transaction,
        })
        : [];
      const transactionIds = [
        ...new Set([
          ...ownedTransactions.map(({ id }) => id),
          ...linkedTransactions.map(({ id }) => id),
        ]),
      ];

      await InvestmentMovement.destroy({
        where: { user_id: expiredUser.id },
        transaction,
      });

      if (debtIds.length) {
        await DebtInstallment.destroy({
          where: { debt_id: { [Op.in]: debtIds } },
          transaction,
        });
        await Debt.destroy({
          where: { id: { [Op.in]: debtIds } },
          transaction,
        });
      }

      await Transaction.destroy({
        where: { id: { [Op.in]: transactionIds } },
        transaction,
      });

      const user = await User.findByPk(expiredUser.id, {
        paranoid: false,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (user && user.deletedAt && user.deletedAt <= cutoff) {
        await user.destroy({ force: true, transaction });
      }
    }

    return expiredUsers.length;
  });
};

module.exports = { RETENTION_DAYS, purgeExpiredArchivedAccounts };

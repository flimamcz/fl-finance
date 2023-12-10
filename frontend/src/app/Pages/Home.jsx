import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";
import IconInvestiment from "../../assets/INVESTIMENT.png";
import IconRecipes from "../../assets/RECIPES.png";
import IconExpenses from "../../assets/EXPENSE.png";
import { useContext, useEffect, useState } from "react";

import Checked from "../../assets/checked.png";
import Pending from "../../assets/pending.png";

import Moment from "moment";
import MyContext from "../Context/Context";

function Home() {
  const { transactions, typesTransactions, getAllTransactions, amounts } =
    useContext(MyContext);
  const [currentMonth, setCurrentMonth] = useState("");
  const [deletingById, setDeletingById] = useState(null);
  const [activeButtonQuestingDelete, setActiveButtonQuestingDelete] =
    useState(false);

  const years = ["2023", "2022", "2021"];
  Moment.updateLocale("pt", {
    months: [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ],
  });

  const date = Moment();

  const months = date._locale._months;

  const handleChangeDate = ({ target }) => {
    setCurrentMonth(target.value);
  };

  const formatDate = (date) => {
    return Moment(date).format("DD/MM/YYYY");
  };

  const formatCurrencyMoney = (money) => {
    return money.toLocaleString("pt-br", {
      style: "currency",
      currency: "BRL",
    });
  };

  const findTypeTransaction = (idTransaction) => {
    const type = typesTransactions ? typesTransactions.find(({ id }) => id === idTransaction).type : 0;
    return type;
  };

  const deleteTransaction = async ({ id }) => {
    await fetch(`http://localhost:3001/transactions/${id}`, {
      method: "DELETE",
    });
    setActiveButtonQuestingDelete(false);
    setDeletingById(null);
  };

  const confirmedDelete = (transaction) => {
    setActiveButtonQuestingDelete(true);
    setDeletingById(transaction);
  };

  useEffect(() => {
    getAllTransactions();
  }, [transactions]);

  const amountTotal = amounts.length
    ? Number(amounts[0].amount) - Number(amounts[1].amount).toFixed(2)
    : " Carregando saldo...";

  return (
    <div>
      <Header />
      <section>
        <div className="card-demonstrative balance">
          <span>
            <h2>Saldo atual</h2>
            <p>
              {"R$ "}
              <span>{amountTotal}</span>
            </p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>

        <div className="card-demonstrative recipes">
          <span>
            <h2>Entradas</h2>
            <p>
              R${" "}
              <span>
                {amounts.length
                  ? amounts[0].amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : 0}
              </span>
            </p>
          </span>
          <img src={IconRecipes} alt="Icone representando as entradas" />
        </div>

        <div className="card-demonstrative expenses">
          <span>
            <h2>Despesas</h2>
            <p>
              R${" "}
              <span>
                {amounts.length
                  ? amounts[1].amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : 0}
              </span>
            </p>
          </span>
          <img src={IconExpenses} alt="Icone representando as despesas" />
        </div>

        <div className="card-demonstrative investiment">
          <span>
            <h2>Investido</h2>
            <p>
              R${" "}
              <span>
                {amounts.length
                  ? amounts[2].amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : 0}
              </span>
            </p>
          </span>
          <img
            src={IconInvestiment}
            alt="Icone representando os investimentos"
          />
        </div>
      </section>

      <section>
        <form>
          <label className="month">
            <select
              name="date"
              id="date"
              value={currentMonth}
              onChange={handleChangeDate}
            >
              <option value="" disabled>
                Selecione um mês
              </option>
              {months &&
                months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}{" "}
              ;
            </select>
          </label>

          <label className="year">
            <select name="year" id="year" value={currentMonth}>
              <option value="" disabled>
                Selecione um ano
              </option>
              {years &&
                years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}{" "}
              ;
            </select>
          </label>
        </form>

        <table>
          <thead>
            <tr>
              <td>Situação</td>
              <td>Data</td>
              <td>Descrição</td>
              <td>Tipo</td>
              <td>Valor</td>
              <td>Ações</td>
              <td>Entradas/Saída/Investimento</td>
            </tr>
          </thead>

          <tbody>
            {transactions.length ? (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <img
                      width={24}
                      src={transaction.status ? Checked : Pending}
                      alt="Icone representando transação pendente ou efetivado"
                    />
                  </td>
                  <td>{formatDate(transaction.date)}</td>
                  <td>{transaction.description}</td>
                  <td>{findTypeTransaction(transaction.typeId)}</td>
                  <td>R$ {formatCurrencyMoney(transaction.value)}</td>
                  <td>
                    <button>Editar</button>
                    <button onClick={() => confirmedDelete(transaction)}>
                      Remover
                    </button>
                  </td>
                  <td>
                    <img
                      width={24}
                      src={
                        findTypeTransaction(transaction.typeId) === "RECEITA"
                          ? IconRecipes
                          : findTypeTransaction(transaction.typeId) ===
                            "DESPESA"
                          ? IconExpenses
                          : IconInvestiment
                      }
                      alt="Icone representando transação pendente ou efetivado"
                    />
                  </td>
                </tr>
              ))
            ) : (
              <p>Nenhuma transação encontrada!</p>
            )}

            <div>
              {activeButtonQuestingDelete && (
                <label>
                  <p>
                    Deseja realmente deletar a transação de ID{" "}
                    {`${deletingById.id}`}?
                  </p>
                  <button
                    className="confirm-delete"
                    onClick={() => deleteTransaction(deletingById)}
                  >
                    Sim
                  </button>
                  <button
                    className="confirm-delete"
                    onClick={() => setActiveButtonQuestingDelete(false)}
                  >
                    Não
                  </button>
                </label>
              )}
            </div>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Home;

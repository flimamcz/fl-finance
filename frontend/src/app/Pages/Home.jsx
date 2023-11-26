import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";
import IconInvestiment from "../../assets/INVESTIMENT.png";
import IconRecipes from "../../assets/RECIPES.png";
import IconExpenses from "../../assets/EXPENSE.png";
import { useContext, useState } from "react";

import Checked from "../../assets/checked.png";
import Pending from "../../assets/pending.png";

import Moment from "moment";
import MyContext from "../Context/Context";

function Home() {
  const [currentMonth, setCurrentMonth] = useState("");
  const { transactions, typesTransactions } = useContext(MyContext);
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
    return typesTransactions.find(({ id }) => id === idTransaction).type;
  };

  return (
    <div>
      <Header />
      <section>
        <div className="card-demonstrative balance">
          <span>
            <h2>Saldo atual</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>

        <div className="card-demonstrative recipes">
          <span>
            <h2>Entradas</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconRecipes} alt="Icone representando as entradas" />
        </div>

        <div className="card-demonstrative expenses">
          <span>
            <h2>Despesas</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconExpenses} alt="Icone representando as despesas" />
        </div>

        <div className="card-demonstrative investiment">
          <span>
            <h2>Investido</h2>
            <p>R$ 0,00</p>
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
            {transactions &&
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <img
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
                    <button>Remover</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Home;

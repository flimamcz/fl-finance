import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";
import IconInvestiment from "../../assets/INVESTIMENT.png";
import IconRecipes from "../../assets/RECIPES.png";
import IconExpenses from "../../assets/EXPENSE.png";
import { useState } from "react";

import Moment from "moment";

function Home() {
  Moment.locale("pt", {
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

  const years = ["2023", "2022", "2021"];
  const [currentMonth, setCurrentMonth] = useState("");
  const date = Moment();

  const months = date._locale._months;

  const handleChangeDate = ({ target }) => {
    setCurrentMonth(target.value);
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
            <select
              name="date"
              id="date"
              value={currentMonth}
              onChange={handleChangeDate}
            >
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
            <tr>
              <td>ICONE</td>
              <td>10/12/2023</td>
              <td>COMPRA NO CESTA</td>
              <td>Despesa</td>
              <td>R$ 542,56</td>
              <td>
                <button>Editar</button>
                <button>Remover</button>
              </td>
              <td>STATUS</td>
            </tr>

            <tr>
              <td>ICONE</td>
              <td>09/12/2023</td>
              <td>SALÁRIO DE NOVEMBRO</td>
              <td>Despesa</td>
              <td>R$ 542,56</td>
              <td>
                <button>Editar</button>
                <button>Remover</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Home;

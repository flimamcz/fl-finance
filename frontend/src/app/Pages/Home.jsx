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
  const [value, setValue] = useState("");
  const [deletingById, setDeletingById] = useState(null);
  const [activeButtonQuestingDelete, setActiveButtonQuestingDelete] =
    useState(false);
  const [compensate, setCompensate] = useState(null);
  const [typeTransaction, setTypeTransaction] = useState(1);
  const [dateTransaction, setDateTransaction] = useState("");
  const [modalActive, setModalActive] = useState(false);
  const [buttonCreateTransaction, setButtonCreateTransaction] = useState(true);

  const [descriptionTransaction, setDescriptionTransaction] = useState("");

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

  const verifyInputs = () => {
    const existDescription = descriptionTransaction.length >= 5;
    const existValue = Number(value) > 0;

    if (existDescription && existValue) {
      setButtonCreateTransaction(false);
    }
    if (!existDescription || !existValue) {
      setButtonCreateTransaction(true);
    }
  };

  const formatCurrencyMoney = (money) => {
    return money.toLocaleString("pt-br", {
      style: "currency",
      currency: "BRL",
    });
  };

  const findTypeTransaction = (idTransaction) => {
    const type = typesTransactions.length
      ? typesTransactions.find(({ id }) => id === idTransaction).type
      : 0;
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

  const handleChangeRadio = ({ target }) => {
    setCompensate(eval(target.value));
  };

  const handleChangeSelect = ({ target }) => {
    const auxValues = typesTransactions[target.value - 1];
    setTypeTransaction(auxValues.id);
  };

  const handleDate = ({ target }) => {
    setDateTransaction(target.value);
    verifyInputs();
  };

  const handleDescription = ({ target }) => {
    setDescriptionTransaction(target.value);
    verifyInputs();
  };

  const toggleModal = () => {
    setModalActive(!modalActive);
  };

  const handleValue = ({ target }) => {
    verifyInputs();
    setValue(target.value);
  };

  const createTransaction = () => {
    setModalActive(false);
  };

  useEffect(() => {
    getAllTransactions();
  }, [activeButtonQuestingDelete]);

  const amountTotal = amounts.length
    ? Number(amounts[0].amount) - Number(amounts[1].amount)
    : 0;

  return (
    <div>
      <Header />
      <section className="cards-balance">
        <div className="card-demonstrative balance">
          <span>
            <h2>Saldo atual</h2>
            <p>
              {"R$ "}
              <span>{amountTotal.toFixed(2)}</span>
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

          <div>
            <button type="button" onClick={() => toggleModal()}>
              + NOVA TRANSAÇÃO
            </button>
          </div>
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

      {modalActive && (
        <form className="modal-register-transaction">
          <h2>Nova transação</h2>

          <label htmlFor="value">
            <input
              type="text"
              placeholder="R$ 0.00"
              onChange={handleValue}
              value={value}
            />
          </label>

          <div>
            <label htmlFor="yes-compensate">
              Efetivado
              <input
                type="radio"
                name="compensate"
                id="yes-compensate"
                value={true}
                onChange={handleChangeRadio}
              />
            </label>

            <label htmlFor="not-compensate">
              Á compensar
              <input
                type="radio"
                name="compensate"
                id="not-compensate"
                value={false}
                onChange={handleChangeRadio}
              />
            </label>
          </div>

          <select
            name="type-transaction"
            id="type-transaction"
            value={typeTransaction}
            onChange={handleChangeSelect}
          >
            <option value="1" defaultValue>
              Entrada
            </option>

            <option value="2">Saída</option>

            <option value="3">Investimento</option>
          </select>
          <textarea
            name="description"
            id="description"
            cols="50"
            rows="2"
            value={descriptionTransaction}
            onChange={handleDescription}
            placeholder="Descrição"
          ></textarea>

          <label htmlFor="date">
            <input
              type="date"
              name="date"
              id="date"
              onChange={handleDate}
              value={dateTransaction}
            />
          </label>

          <label htmlFor="buttons">
            <button type="button" onClick={() => toggleModal()}>
              CANCELAR
            </button>
            <button
              type="button"
              disabled={buttonCreateTransaction}
              onClick={createTransaction}
            >
              SALVAR
            </button>
          </label>
        </form>
      )}
    </div>
  );
}

export default Home;

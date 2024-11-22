import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";
import IconInvestiment from "../../assets/INVESTIMENT.png";
import IconRecipes from "../../assets/RECIPES.png";
import IconExpenses from "../../assets/EXPENSE.png";
import Checked from "../../assets/checked.png";
import Pending from "../../assets/pending.png";
import { useContext, useEffect, useState } from "react";
import Moment from "moment";
import MyContext from "../Context/Context";
import "../Styles/Home.css";

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

  const handleChangeDate = ({ target }) => setCurrentMonth(target.value);

  const formatDate = (date) => Moment(date).format("DD/MM/YYYY");

  const verifyInputs = () => {
    const existDescription = descriptionTransaction.length >= 5;
    const existValue = Number(value) > 0;
    setButtonCreateTransaction(!(existDescription && existValue));
  };

  const formatCurrencyMoney = (money) =>
    money.toLocaleString("pt-br", {
      style: "currency",
      currency: "BRL",
    });

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

  const handleChangeRadio = ({ target }) => setCompensate(eval(target.value));

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

  const toggleModal = () => setModalActive(!modalActive);

  const handleValue = ({ target }) => {
    verifyInputs();
    setValue(target.value);
  };

  const createTransaction = () => setModalActive(false);

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
              R$ <span>{amountTotal.toFixed(2)}</span>
            </p>
          </span>
          <img src={IconBank} alt="Ícone de banco" />
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
          <img src={IconRecipes} alt="Ícone de entradas" />
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
          <img src={IconExpenses} alt="Ícone de despesas" />
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
          <img src={IconInvestiment} alt="Ícone de investimentos" />
        </div>
      </section>

      <section>
        <form>
          {/* <label className="month">
            <select
              name="date"
              id="date"
              value={currentMonth}
              onChange={handleChangeDate}
            >
              <option value="" disabled>
                Selecione um mês
              </option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label> */}

          {/* <label className="year">
            <select name="year" id="year" value={currentMonth}>
              <option value="" disabled>
                Selecione um ano
              </option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label> */}

          <button className="button-new-transaction" type="button" onClick={toggleModal}>
            + NOVA TRANSAÇÃO
          </button>
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
              <td>Categoria</td>
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
                      alt="Status"
                    />
                  </td>
                  <td>{formatDate(transaction.date)}</td>
                  <td>{transaction.description}</td>
                  <td>{findTypeTransaction(transaction.typeId)}</td>
                  <td>R$ {formatCurrencyMoney(transaction.value)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="edit-button">Editar</button>
                      <button
                        className="remove-button"
                        onClick={() => confirmedDelete(transaction)}
                      >
                        Remover
                      </button>
                    </div>
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
                      alt="Categoria"
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="not-transaction-paragraph" colSpan="7">Nenhuma transação encontrada!</td>
              </tr>
            )}

            {activeButtonQuestingDelete && (
              <div className="center-content">
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
              </div>
            )}
          </tbody>
        </table>
      </section>

      {modalActive && (
        <form className="modal-register-transaction">
          <h2>Nova transação</h2>
          <input
            type="text"
            placeholder="R$ 0.00"
            onChange={handleValue}
            value={value}
          />
          <div>
            <label>
              Efetivado
              <input
                type="radio"
                name="compensate"
                value={true}
                onChange={handleChangeRadio}
              />
            </label>
            <label>
              Á compensar
              <input
                type="radio"
                name="compensate"
                value={false}
                onChange={handleChangeRadio}
              />
            </label>
          </div>
          <select
            name="type-transaction"
            value={typeTransaction}
            onChange={handleChangeSelect}
          >
            <option value="" disabled>
              Escolha um tipo
            </option>
            {typesTransactions.map((type) => (
              <option key={type.id} value={type.id}>
                {type.type}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Descrição"
            value={descriptionTransaction}
            onChange={handleDescription}
          />
          <input type="date" value={dateTransaction} onChange={handleDate} />
          <button
            type="button"
            disabled={buttonCreateTransaction}
            onClick={createTransaction}
          >
            Criar
          </button>
        </form>
      )}
    </div>
  );
}

export default Home;

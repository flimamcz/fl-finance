import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";
import IconInvestiment from "../../assets/INVESTIMENT.png";
import IconRecipes from "../../assets/RECIPES.png";
import IconExpenses from "../../assets/EXPENSE.png";
import Checked from "../../assets/checked.png";
import Pending from "../../assets/pending.png";
import { Fragment, useContext, useEffect, useState } from "react";
import Moment from "moment";
import MyContext from "../Context/Context";
import "../Styles/Home.css";
import { requestPost } from "../Services/request";

function Home() {
  const { transactions, typesTransactions, getAllTransactions, amounts } =
    useContext(MyContext);
  // const [currentMonth, setCurrentMonth] = useState("");
  const [deletingById, setDeletingById] = useState(null);
  const [activeButtonQuestingDelete, setActiveButtonQuestingDelete] =
    useState(false);
  const [typeTransaction, setTypeTransaction] = useState(1);

  const [loading, setLoading] = useState(false);
  const [modalActive, setModalActive] = useState(false);
  const [modalRegister, setModalRegister] = useState(false);
  const [buttonCreateTransaction, setButtonCreateTransaction] = useState(true);

  const dataObjectModelTransaction = {
    value: String,
    description: String,
    date: Date,
    status: Boolean,
    typeId: 1,
  };
  const port_backend = 3002;

  const [transactionData, setTransactionData] = useState(
    dataObjectModelTransaction
  );

  const formatDate = (date) => Moment(date).format("DD/MM/YYYY");

  const verifyInputs = () => {
    const existDescription = transactionData.description.length >= 5;
    const existValue = Number(transactionData.value) > 0;
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
    console.log(id);

    await fetch(`http://localhost:${port_backend}/transactions/${id}`, {
      method: "DELETE",
    });
    setActiveButtonQuestingDelete(false);
    setDeletingById(null);
  };

  const confirmedDelete = (transaction) => {
    setActiveButtonQuestingDelete(true);
    setDeletingById(transaction);
  };

  const toggleModal = () => setModalActive(!modalActive);

  const handleChange = ({ target }) => {
    const { name, value, type } = target;

    if (type === "radio") {
      setTransactionData((prevData) => ({
        ...prevData,
        [name]: JSON.parse(value),
      }));
    } else if (name === "type-transaction") {
      setTypeTransaction(value);
    } else {
      setTransactionData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }

    verifyInputs();
  };


  const amountTotal = amounts.length
    ? Number(amounts[0].amount) - Number(amounts[1].amount)
    : 0;

  const createTransaction = async (e) => {
    setLoading(true);
    e.preventDefault();
    await requestPost("/transactions", transactionData);
    closeModalRegister();

    setTimeout(() => {
      setTransactionData(dataObjectModelTransaction);
      getAllTransactions();
      setLoading(false);
    }, 1200);
  };

  const closeModalRegister = () => {
    setModalActive(false);
    setTransactionData(dataObjectModelTransaction);
  };

  document.onkeydown = (e) => {
    if (e.key === "Escape") {
      setModalActive(false);
    }
  };

  useEffect(() => {
    getAllTransactions();
  }, [activeButtonQuestingDelete]);

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
          <button
            className="button-new-transaction"
            type="button"
            onClick={toggleModal}
          >
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
            {loading ? (
              <div className="loader"></div>
            ) : (
              <Fragment>
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
                            findTypeTransaction(transaction.typeId) ===
                            "RECEITA"
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
                    <td className="not-transaction-paragraph" colSpan="7">
                      Nenhuma transação encontrada!
                    </td>
                  </tr>
                )}
              </Fragment>
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
            placeholder="R$ 0.00 (USE PONTO (.) R$ 2.23)"
            name="value"
            onChange={handleChange}
            value={transactionData.value}
          />
          <div>
            <label>
              Efetivado
              <input
                type="radio"
                name="status"
                value={true}
                onChange={handleChange}
                checked={transactionData.status === true}
              />
            </label>
            <label>
              Á compensar
              <input
                type="radio"
                name="status"
                value={false}
                onChange={handleChange}
                checked={transactionData.status === false}
              />
            </label>
          </div>
          <select name="typeId" id="typeId" onChange={handleChange}>
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
            name="description"
            placeholder="Descrição"
            value={transactionData.description}
            onChange={handleChange}
          />
          <input
            type="date"
            name="date"
            value={Moment(transactionData.date).format("YYYY-MM-DD")}
            onChange={handleChange}
          />
          <div className="button-modal-register">
            <button
              type="button"
              disabled={buttonCreateTransaction}
              onClick={createTransaction}
            >
              Criar
            </button>
            <button onClick={closeModalRegister} type="button">
              Fechar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Home;

import { useState, useContext } from "react";
import {
  FiPlus,
  FiDownload,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiPieChart,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiTarget,
  FiAlertTriangle,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Moment from "moment";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import "../Styles/Home.css";

function Home() {
  const { transactions, typesTransactions, amounts, getAllTransactions } =
    useContext(MyContext);

  // Estados
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalActive, setModalActive] = useState(false);
  const [activeModalEdit, setActiveModalEdit] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [timeRange, setTimeRange] = useState("month");

  // Estados para modais
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const [transactionData, setTransactionData] = useState({
    value: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    status: true,
    typeId: 1,
  });

  // Dados para gráficos
  const chartData = transactions.map((t) => ({
    name: Moment(t.date).format("DD/MM"),
    value: parseFloat(t.value) || 0,
    type:
      t.typeId === 1 ? "Receita" : t.typeId === 2 ? "Despesa" : "Investimento",
  }));

  // Transformar transações para o gráfico de pizza
  const categoryData = (() => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const totals = {};

    transactions.forEach((transaction) => {
      const typeId = transaction.typeId;
      const value = parseFloat(transaction.value) || 0;

      if (!totals[typeId]) {
        totals[typeId] = 0;
      }

      totals[typeId] += value;
    });

    const result = [];

    if (totals[1]) {
      result.push({
        name: "Receitas",
        value: totals[1],
        color: "#10b981",
      });
    }

    if (totals[2]) {
      result.push({
        name: "Despesas",
        value: totals[2],
        color: "#ef4444",
      });
    }

    if (totals[3]) {
      result.push({
        name: "Investimentos",
        value: totals[3],
        color: "#8b5cf6",
      });
    }

    if (result.length === 0) {
      return [{ name: "Sem dados", value: 1, color: "#e2e8f0" }];
    }

    return result;
  })();

  // Função para formatar data em português
  const getFormattedDate = () => {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formatted = formatter.format(new Date());
    return formatted.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Funções auxiliares
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 1:
        return <FiTrendingUp className="icon-income" />;
      case 2:
        return <FiTrendingDown className="icon-expense" />;
      case 3:
        return <FiTarget className="icon-investment" />;
      default:
        return <FiDollarSign />;
    }
  };

  const getStatusIcon = (status) => {
    return status ? (
      <FiCheckCircle className="status-confirmed" />
    ) : (
      <FiClock className="status-pending" />
    );
  };

  const amountTotal = amounts.length
    ? Number(amounts[0]?.amount || 0) - Number(amounts[1]?.amount || 0)
    : 0;

  // Filtros
  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "income") return t.typeId === 1;
    if (activeFilter === "expense") return t.typeId === 2;
    if (activeFilter === "investment") return t.typeId === 3;
    return true;
  });

  // Função de exclusão com modais
  const deleteItem = async (endpoint, id) => {
    try {
      console.log("Deletando:", endpoint, id);

      const url = `http://192.168.0.10:3001/${endpoint}/${id}`;
      console.log("URL:", url);

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      await getAllTransactions();

      // Modal de sucesso
      setModalTitle("Sucesso!");
      setModalMessage("Transação excluída com sucesso!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erro ao excluir:", error);

      // Modal de erro
      setModalTitle("Erro");
      setModalMessage(`${error.message || "Falha ao excluir transação"}`);
      setShowErrorModal(true);
    }
  };

  // Função para iniciar exclusão
  const startDelete = (transaction) => {
    setSelectedTransaction(transaction);
    setModalTitle("Confirmar Exclusão");
    setModalMessage(`Deseja realmente excluir "${transaction.description}"?`);
    setShowConfirmModal(true);
  };

  const saveTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...transactionData,
        value: parseFloat(transactionData.value),
        typeId: parseInt(transactionData.typeId),
      };

      const response = await fetch("http://192.168.0.10:3001/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) throw new Error(`Erro ${response.status}`);

      setModalActive(false);
      setTransactionData({
        value: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        status: true,
        typeId: 1,
      });

      // Modal de sucesso para criação
      setModalTitle("Sucesso!");
      setModalMessage("Transação criada com sucesso!");
      setShowSuccessModal(true);

      // Atualiza a lista
      await getAllTransactions();
    } catch (error) {
      // Modal de erro para criação
      setModalTitle("Erro");
      setModalMessage(`${error.message || "Falha ao criar transação"}`);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Header />

      <div className="dashboard-content">
        {/* Banner Welcome */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h1>Bem-vindo de volta! 👋</h1>
            <p>Gerencie suas finanças de forma inteligente</p>
          </div>
          <div className="date-info">
            <span>{getFormattedDate()}</span>
          </div>
        </div>

        {/* Cards Resumo */}
        <div className="summary-cards">
          <div className="summary-card total-balance">
            <div className="card-header">
              <FiDollarSign className="card-icon" />
              <h3>Saldo Total</h3>
            </div>
            <div className="card-value">{formatCurrency(amountTotal)}</div>
            <div className="card-trend">
              <span className="trend-positive">
                <FiArrowUp /> 12% vs mês passado
              </span>
            </div>
          </div>

          <div className="summary-card income-card">
            <div className="card-header">
              <FiTrendingUp className="card-icon" />
              <h3>Receitas</h3>
            </div>
            <div className="card-value">
              {formatCurrency(amounts[0]?.amount || 0)}
            </div>
            <div className="card-trend">
              <span className="trend-positive">
                <FiArrowUp /> 8% este mês
              </span>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-header">
              <FiTrendingDown className="card-icon" />
              <h3>Despesas</h3>
            </div>
            <div className="card-value">
              {formatCurrency(amounts[1]?.amount || 0)}
            </div>
            <div className="card-trend">
              <span className="trend-negative">
                <FiArrowDown /> 5% vs mês passado
              </span>
            </div>
          </div>

          <div className="summary-card investment-card">
            <div className="card-header">
              <FiPieChart className="card-icon" />
              <h3>Investimentos</h3>
            </div>
            <div className="card-value">
              {formatCurrency(amounts[2]?.amount || 0)}
            </div>
            <div className="card-trend">
              <span className="trend-positive">
                <FiArrowUp /> 15% este ano
              </span>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="charts-section">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Fluxo Financeiro</h3>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="chart-filter"
              >
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
                <option value="year">Este ano</option>
              </select>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), "Valor"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Distribuição por Categoria</h3>
            </div>
            <div className="chart-container">
              {categoryData.length > 0 &&
              categoryData[0].name !== "Sem dados" ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) =>
                        `${entry.name}: ${formatCurrency(entry.value)}`
                      }
                      outerRadius={70}
                      innerRadius={30}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(name) => `Categoria: ${name}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  <p>Adicione transações para ver a distribuição</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Transações */}
        <div className="transactions-section">
          <div className="section-header">
            <h2>Transações Recentes</h2>
            <div className="section-actions">
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${
                    activeFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("all")}
                >
                  Todas
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "income" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("income")}
                >
                  Receitas
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "expense" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("expense")}
                >
                  Despesas
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "investment" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("investment")}
                >
                  Investimentos
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={() => setModalActive(true)}
              >
                <FiPlus /> Nova Transação
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
              <p>Carregando transações...</p>
            </div>
          ) : (
            <div className="transactions-container">
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <FiDollarSign size={48} />
                  <h3>Nenhuma transação encontrada</h3>
                  <p>Comece adicionando sua primeira transação</p>
                  <button
                    className="btn-primary"
                    onClick={() => setModalActive(true)}
                  >
                    <FiPlus /> Criar Transação
                  </button>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "transactions-grid"
                      : "transactions-list"
                  }
                >
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-card">
                      <div className="transaction-header">
                        <div className="transaction-icon">
                          {getTypeIcon(transaction.typeId)}
                        </div>
                        <div className="transaction-info">
                          <h4>{transaction.description}</h4>
                          <span className="transaction-date">
                            {Moment(transaction.date).format("DD/MM/YYYY")}
                          </span>
                        </div>
                        <div className="transaction-amount">
                          <span
                            className={`amount ${
                              transaction.typeId === 1 ? "positive" : "negative"
                            }`}
                          >
                            {transaction.typeId === 1 ? "+ " : "- "}
                            {formatCurrency(transaction.value)}
                          </span>
                        </div>
                      </div>

                      <div className="transaction-footer">
                        <div className="transaction-status">
                          {getStatusIcon(transaction.status)}
                          <span>
                            {transaction.status ? "Confirmado" : "Pendente"}
                          </span>
                        </div>
                        <div className="transaction-actions">
                          <button
                            className="btn-icon"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setActiveModalEdit(true);
                            }}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => startDelete(transaction)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredTransactions.length > 0 && (
            <div className="transactions-footer">
              <button className="btn-secondary">
                <FiDownload /> Exportar Extrato
              </button>
              <div className="pagination">
                <span>
                  Mostrando {filteredTransactions.length} de{" "}
                  {transactions.length} transações
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Transação */}
      {modalActive && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nova Transação</h2>
              <button
                className="btn-close"
                onClick={() => setModalActive(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={saveTransaction}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionData.value}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        value: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data</label>
                  <input
                    type="date"
                    value={transactionData.date}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        date: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo</label>
                  <select
                    value={transactionData.typeId}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        typeId: parseInt(e.target.value),
                      })
                    }
                    required
                  >
                    {typesTransactions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="status"
                        value="true"
                        checked={transactionData.status === true}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            status: e.target.value === "true",
                          })
                        }
                      />
                      <span className="radio-label">Confirmado</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="status"
                        value="false"
                        checked={transactionData.status === false}
                        onChange={(e) =>
                          setTransactionData({
                            ...transactionData,
                            status: e.target.value === "true",
                          })
                        }
                      />
                      <span className="radio-label">Pendente</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  placeholder="Descreva esta transação..."
                  value={transactionData.description}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      description: e.target.value,
                    })
                  }
                  rows="3"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalActive(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !transactionData.value || !transactionData.description
                  }
                >
                  {loading ? "Salvando..." : "Salvar Transação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm confirm-modal">
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button
                className="btn-close"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedTransaction(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirm-icon">
                <FiAlertTriangle size={48} color="#f59e0b" />
              </div>
              <p className="confirm-message">{modalMessage}</p>

              {selectedTransaction && (
                <div className="confirm-details">
                  <div className="transaction-preview">
                    <span className="preview-label">Valor:</span>
                    <span
                      className={`preview-value ${
                        selectedTransaction.typeId === 1
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {formatCurrency(selectedTransaction.value)}
                    </span>
                  </div>
                  <div className="transaction-preview">
                    <span className="preview-label">Data:</span>
                    <span className="preview-value">
                      {Moment(selectedTransaction.date).format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedTransaction(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-icon btn-danger"
                onClick={() => {
                  if (selectedTransaction) {
                    deleteItem("transactions", selectedTransaction.id);
                  }
                  setShowConfirmModal(false);
                  setSelectedTransaction(null);
                }}
                title="Excluir" // Tooltip para mobile
                aria-label="Excluir" // Acessibilidade
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm success-modal">
            <div className="modal-body">
              <div className="success-icon">
                <FiCheckCircle size={60} color="#10b981" />
              </div>
              <h3 className="success-title">{modalTitle}</h3>
              <p className="success-message">{modalMessage}</p>
            </div>

            <div className="modal-actions modal-actions-center">
              <button
                className="btn-primary"
                onClick={() => setShowSuccessModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-sm error-modal">
            <div className="modal-body">
              <div className="error-icon">
                <FiAlertCircle size={60} color="#ef4444" />
              </div>
              <h3 className="error-title">{modalTitle}</h3>
              <p className="error-message">{modalMessage}</p>
            </div>

            <div className="modal-actions modal-actions-center">
              <button
                className="btn-danger"
                onClick={() => setShowErrorModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

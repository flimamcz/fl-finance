import { useContext, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiEdit2,
  FiInfo,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import Header from "../Components/Header";
import EditTransactionModal from "../Components/EditTransactionModal";
import MyContext from "../Context/Context";
import "../Styles/Revenues.css";

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
};

const getDateKey = (value) => String(value ?? "").slice(0, 10);

const formatDate = (value) => {
  const dateKey = getDateKey(value);
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day, 12));
};

const formatMonth = (value) => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

const shiftMonth = (value, amount) => {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const initialForm = (isIncome) => ({
  value: "",
  description: "",
  date: getLocalDate(),
  status: true,
  isSalary: isIncome,
});

function Revenues({ mode = "income" }) {
  const isIncome = mode === "income";
  const transactionType = isIncome ? 1 : 2;
  const entryLabel = isIncome ? "receita" : "despesa";
  const entryLabelPlural = isIncome ? "receitas" : "despesas";
  const { transactions, typesTransactions, createTransaction, deleteTransaction } = useContext(MyContext);
  const [selectedMonth, setSelectedMonth] = useState(() => getLocalDate().slice(0, 7));
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => initialForm(isIncome));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) =>
      Number(transaction.typeId) === transactionType && getDateKey(transaction.date).startsWith(selectedMonth),
    ),
    [transactions, selectedMonth, transactionType],
  );

  const confirmedTransactions = monthlyTransactions.filter((transaction) => transaction.status === true);
  const pendingTransactions = monthlyTransactions.filter((transaction) => transaction.status !== true);
  const monthlyTotal = monthlyTransactions.reduce((sum, transaction) => sum + (Number(transaction.value) || 0), 0);
  const confirmedTotal = confirmedTransactions.reduce((sum, transaction) => sum + (Number(transaction.value) || 0), 0);
  const confirmedSalaryTotal = confirmedTransactions
    .filter((transaction) => transaction.isSalary === true)
    .reduce((sum, transaction) => sum + (Number(transaction.value) || 0), 0);
  const pendingTotal = pendingTransactions.reduce((sum, transaction) => sum + (Number(transaction.value) || 0), 0);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return monthlyTransactions
      .filter((transaction) => salaryFilter === "all" || (isIncome
        ? transaction.isSalary === (salaryFilter === "salary")
        : transaction.status === (salaryFilter === "confirmed")))
      .filter((transaction) => statusFilter === "all" || transaction.status === (statusFilter === "confirmed"))
      .filter((transaction) => !query || String(transaction.description ?? "").toLocaleLowerCase("pt-BR").includes(query))
      .sort((first, second) => getDateKey(second.date).localeCompare(getDateKey(first.date)));
  }, [monthlyTransactions, salaryFilter, statusFilter, search, isIncome]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      await createTransaction({
        value: Number(form.value),
        typeId: transactionType,
        description: form.description.trim(),
        date: form.date,
        status: form.status,
        isSalary: isIncome && form.isSalary,
      });
      setSelectedMonth(form.date.slice(0, 7));
      setForm(initialForm(isIncome));
      setNotice(`${isIncome ? "Receita" : "Despesa"} registrada e adicionada ao seu histórico.`);
    } catch (submitError) {
      setError(submitError.message || `Não foi possível registrar esta ${entryLabel}.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteTransaction(deleteCandidate.id);
      setNotice(`${isIncome ? "Receita" : "Despesa"} excluída. Os totais do sistema foram atualizados.`);
      setDeleteCandidate(null);
    } catch (deleteRequestError) {
      setDeleteError(deleteRequestError.message || `Não foi possível excluir esta ${entryLabel}.`);
    } finally {
      setDeleting(false);
    }
  };

  const monthLabel = formatMonth(selectedMonth);

  return (
    <div className={`revenues-page ${isIncome ? "" : "expenses-page"}`}>
      <Header />
      <main className="revenues-content" id="main-content">
        <header className="revenues-heading">
          <div>
            <p className="revenues-eyebrow">{isIncome ? "Entradas do seu orçamento" : "Saídas do seu orçamento"}</p>
            <h1>{isIncome ? "Receitas" : "Despesas"}</h1>
            <p className="revenues-subtitle">{isIncome
              ? "Acompanhe o que entrou, identifique salários e mantenha seus registros em dia."
              : "Registre seus gastos, acompanhe o que já foi pago e mantenha as contas sob controle."}</p>
          </div>
          <div className="revenues-heading-mark" aria-hidden="true">{isIncome ? <FiTrendingUp /> : <FiTrendingDown />}</div>
        </header>

        <section className="revenue-summary" aria-label={`Resumo de ${entryLabelPlural} de ${monthLabel}`}>
          <article className="revenue-summary-item revenue-summary-total">
            <span className="revenue-summary-icon"><FiDollarSign aria-hidden="true" /></span>
            <div><span>{isIncome ? "Receitas registradas" : "Despesas registradas"}</span><strong>{formatCurrency(monthlyTotal)}</strong><small>Confirmadas e pendentes</small></div>
          </article>
          <article className="revenue-summary-item">
            <span className="revenue-summary-icon salary-icon">{isIncome ? <FiTrendingUp aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}</span>
            <div><span>{isIncome ? "Salários confirmados" : "Despesas pagas"}</span><strong>{formatCurrency(isIncome ? confirmedSalaryTotal : confirmedTotal)}</strong></div>
          </article>
          <article className="revenue-summary-item">
            <span className="revenue-summary-icon pending-icon"><FiClock aria-hidden="true" /></span>
            <div><span>{isIncome ? "Aguardando recebimento" : "Despesas pendentes"}</span><strong>{formatCurrency(pendingTotal)}</strong></div>
          </article>
        </section>

        <div className="revenues-layout">
          <section className="revenue-history" aria-labelledby="revenue-history-title">
            <div className="revenue-section-heading">
              <div>
                <h2 id="revenue-history-title">Histórico de {entryLabelPlural}</h2>
                <p>{visibleTransactions.length} {visibleTransactions.length === 1 ? "lançamento" : "lançamentos"} em {monthLabel}</p>
              </div>
              <div className="revenue-month-control" aria-label="Selecionar mês">
                <button type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))} aria-label="Mês anterior">
                  <FiChevronLeft />
                </button>
                <span><FiCalendar aria-hidden="true" />{monthLabel}</span>
                <button type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))} aria-label="Próximo mês">
                  <FiChevronRight />
                </button>
              </div>
            </div>

            <div className="revenue-filters">
              <div className="revenue-filter-tabs" role="group" aria-label={`Filtrar ${entryLabelPlural}`}>
                <button type="button" className={salaryFilter === "all" ? "active" : ""} onClick={() => setSalaryFilter("all")}>Todas</button>
                {isIncome ? <>
                  <button type="button" className={salaryFilter === "salary" ? "active" : ""} onClick={() => setSalaryFilter("salary")}>Salários</button>
                  <button type="button" className={salaryFilter === "other" ? "active" : ""} onClick={() => setSalaryFilter("other")}>Outras</button>
                </> : <>
                  <button type="button" className={salaryFilter === "confirmed" ? "active" : ""} onClick={() => setSalaryFilter("confirmed")}>Pagas</button>
                  <button type="button" className={salaryFilter === "pending" ? "active" : ""} onClick={() => setSalaryFilter("pending")}>Pendentes</button>
                </>}
              </div>
              <label className="revenue-search">
                <FiSearch aria-hidden="true" />
                <span className="visually-hidden">Buscar descrição</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar ${entryLabel}`} />
              </label>
              {isIncome && <select aria-label="Filtrar por situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Todos os status</option>
                <option value="confirmed">Confirmadas</option>
                <option value="pending">Pendentes</option>
              </select>}
            </div>

            {visibleTransactions.length ? (
              <div className="revenue-table-wrap">
                <table className="revenue-table">
                  <thead><tr><th scope="col">Descrição</th><th scope="col">Data</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col"><span className="visually-hidden">Ações</span></th></tr></thead>
                  <tbody>
                    {visibleTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <div className="revenue-description">{transaction.description || `${isIncome ? "Receita" : "Despesa"} sem descrição`}</div>
                          {isIncome && transaction.isSalary && <span className="revenue-salary-tag">Salário</span>}
                        </td>
                        <td>{formatDate(transaction.date)}</td>
                        <td>
                          <span className={`revenue-status ${transaction.status === true ? "confirmed" : "pending"}`}>
                            {transaction.status === true ? <FiCheckCircle aria-hidden="true" /> : <FiClock aria-hidden="true" />}
                            {transaction.status === true ? (isIncome ? "Confirmada" : "Paga") : "Pendente"}
                          </span>
                        </td>
                        <td className="revenue-value">{formatCurrency(transaction.value)}</td>
                        <td>
                          <div className="revenue-row-actions">
                            <button className="revenue-edit-button" type="button" onClick={() => setEditingTransaction(transaction)} disabled={Boolean(transaction.investmentMovement || transaction.debtInstallment)} aria-label={`Editar ${transaction.description || entryLabel}`} title={transaction.investmentMovement || transaction.debtInstallment ? "Edite pela página de origem deste lançamento" : `Editar ${entryLabel}`}>
                              <FiEdit2 aria-hidden="true" />
                            </button>
                            <button className="revenue-edit-button danger" type="button" onClick={() => { setDeleteCandidate(transaction); setDeleteError(""); }} disabled={Boolean(transaction.investmentMovement || transaction.debtInstallment)} aria-label={`Excluir ${transaction.description || entryLabel}`} title={transaction.investmentMovement || transaction.debtInstallment ? "Exclua pela página de origem deste lançamento" : `Excluir ${entryLabel}`}>
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="revenue-empty-state">
                <FiDollarSign aria-hidden="true" />
                <h3>Nenhuma {entryLabel} neste filtro</h3>
                <p>Escolha outro mês ou registre uma {entryLabel} para começar seu histórico.</p>
              </div>
            )}
          </section>

          <aside className="revenue-side-column">
            <section className="revenue-form-panel" aria-labelledby="revenue-form-title">
              <div className="revenue-form-heading">
                <span><FiPlus aria-hidden="true" /></span>
                <div><h2 id="revenue-form-title">Registrar {entryLabel}</h2><p>{isIncome ? "Adicione uma entrada ao seu histórico." : "Adicione uma saída ao seu histórico."}</p></div>
              </div>
              {error && <p className="revenue-feedback error" role="alert">{error}</p>}
              {notice && <p className="revenue-feedback success" role="status">{notice}</p>}
              <form className="revenue-form" onSubmit={handleSubmit}>
                <label>Descrição
                  <input type="text" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={isIncome ? "Ex.: Salário mensal" : "Ex.: Conta de luz"} required maxLength={120} />
                </label>
                <div className="revenue-form-row">
                  <label>Valor (R$)
                    <input type="number" min="0.01" step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0,00" required />
                  </label>
                  <label>Data
                    <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                  </label>
                </div>
                {isIncome && <label className="revenue-salary-toggle">
                  <input type="checkbox" checked={form.isSalary} onChange={(event) => setForm({ ...form, isSalary: event.target.checked })} />
                  <span><strong>É salário</strong><small>Usado nas estimativas da página Investimentos.</small></span>
                </label>}
                <fieldset className="revenue-status-fieldset">
                  <legend>Situação</legend>
                  <label><input type="radio" name="revenue-status" checked={form.status} onChange={() => setForm({ ...form, status: true })} /><FiCheckCircle aria-hidden="true" /> {isIncome ? "Confirmada" : "Paga"}</label>
                  <label><input type="radio" name="revenue-status" checked={!form.status} onChange={() => setForm({ ...form, status: false })} /><FiClock aria-hidden="true" /> Pendente</label>
                </fieldset>
                <button className="revenue-submit" type="submit" disabled={saving || !form.value || !form.description.trim()}>
                  <FiPlus aria-hidden="true" />{saving ? "Registrando..." : `Registrar ${entryLabel}`}
                </button>
              </form>
            </section>

            <section className="revenue-tips" aria-labelledby="revenue-tips-title">
              <div className="revenue-tips-title"><FiInfo aria-hidden="true" /><h2 id="revenue-tips-title">{isIncome ? "Dicas para organizar" : "Dicas para controlar"}</h2></div>
              {isIncome ? <>
                <ul>
                  <li>Marque como salário apenas valores recorrentes de remuneração.</li>
                  <li>Registre a data em que o valor foi recebido, não a data em que foi previsto.</li>
                  <li>Mantenha receitas pendentes separadas do dinheiro já disponível.</li>
                </ul>
                <p>Os totais de salários consideram apenas entradas marcadas e confirmadas.</p>
              </> : <>
                <ul>
                  <li>Registre os gastos assim que acontecerem para manter o saldo atualizado.</li>
                  <li>Separe despesas pagas das que ainda estão pendentes.</li>
                  <li>Use descrições claras para reconhecer cobranças recorrentes no histórico.</li>
                </ul>
                <p>Despesas pendentes aparecem separadas das já confirmadas.</p>
              </>}
            </section>
          </aside>
        </div>
      </main>

      {deleteCandidate && (
        <div className="revenue-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleting) setDeleteCandidate(null);
        }}>
          <section className="revenue-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="revenue-delete-title" aria-describedby="revenue-delete-description">
            <button className="revenue-dialog-close" type="button" onClick={() => setDeleteCandidate(null)} disabled={deleting} aria-label="Fechar confirmação"><FiX /></button>
            <span className="revenue-delete-icon"><FiTrash2 aria-hidden="true" /></span>
            <h2 id="revenue-delete-title">Excluir esta {entryLabel}?</h2>
            <p id="revenue-delete-description">“{deleteCandidate.description || `${isIncome ? "Receita" : "Despesa"} sem descrição` }” será removida do histórico e dos totais vinculados.</p>
            {deleteError && <p className="revenue-feedback error" role="alert">{deleteError}</p>}
            <div className="revenue-delete-actions">
              <button type="button" onClick={() => setDeleteCandidate(null)} disabled={deleting}>Cancelar</button>
              <button type="button" className="confirm-delete" onClick={confirmDelete} disabled={deleting}>{deleting ? "Excluindo..." : `Excluir ${entryLabel}`}</button>
            </div>
          </section>
        </div>
      )}

      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        typesTransactions={typesTransactions}
        onClose={() => setEditingTransaction(null)}
        onUpdateSuccess={(message) => {
          setNotice(message);
          setEditingTransaction(null);
        }}
      />
    </div>
  );
}

export default Revenues;
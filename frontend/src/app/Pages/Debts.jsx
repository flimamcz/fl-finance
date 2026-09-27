import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import { API_BASE_URL } from "../Services/request";
import "../Styles/Debts.css";

const localDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatDate = (date) => {
  if (!date) return "Sem vencimento";
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const shiftMonth = (month, offset) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};

const formatMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    .replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
};

const initialForm = () => ({
  name: "",
  creditor: "",
  amount: "",
  firstDueDate: localDateString(),
  recurring: false,
  installmentCount: "2",
});

function Debts() {
  const { getAllTransactions } = useContext(MyContext);
  const [debts, setDebts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => localDateString().slice(0, 7));
  const [periodView, setPeriodView] = useState("month");
  const [monthStatus, setMonthStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyInstallment, setBusyInstallment] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!formOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setFormOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [formOpen]);

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...options.headers,
      },
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.message || "Não foi possível concluir a operação.");
    }
    return result;
  }, []);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/debts");
      setDebts(result.data || []);
      await getAllTransactions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, getAllTransactions]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const summary = useMemo(() => {
    const installments = debts.flatMap((debt) => debt.installments || []);
    const pending = installments.filter((installment) => installment.status === "pending");
    const paid = installments.filter((installment) => installment.status === "paid");
    return {
      pendingCount: pending.length,
      paidCount: paid.length,
      pendingAmount: pending.reduce((total, installment) => total + Number(installment.amount || 0), 0),
      paidAmount: paid.reduce((total, installment) => total + Number(installment.amount || 0), 0),
    };
  }, [debts]);

  const monthlyInstallments = useMemo(
    () => debts.flatMap((debt) => (debt.installments || [])
      .filter((installment) => installment.due_date?.slice(0, 7) === selectedMonth)
      .map((installment) => ({ ...installment, debt }))),
    [debts, selectedMonth]
  );

  const monthlySummary = useMemo(() => {
    const paid = monthlyInstallments.filter((item) => item.status === "paid");
    const pending = monthlyInstallments.filter((item) => item.status === "pending");
    return {
      total: monthlyInstallments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pending: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paid: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingCount: pending.length,
      paidCount: paid.length,
    };
  }, [monthlyInstallments]);

  const visibleDebts = useMemo(() => {
    const today = localDateString();
    return debts.map((debt) => {
      const installments = (debt.installments || []).filter((installment) => {
        if (periodView === "month" && installment.due_date?.slice(0, 7) !== selectedMonth) return false;
        if (periodView === "overdue") {
          return installment.status === "pending" && installment.due_date < today;
        }
        if (periodView === "all") return true;
        if (monthStatus === "pending") return installment.status === "pending";
        if (monthStatus === "paid") return installment.status === "paid";
        if (monthStatus === "overdue") {
          return installment.status === "pending" && installment.due_date < today;
        }
        return true;
      });
      return { ...debt, visibleInstallments: installments };
    }).filter((debt) => debt.visibleInstallments.length > 0);
  }, [debts, monthStatus, periodView, selectedMonth]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest("/debts", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          installmentCount: Number(form.installmentCount),
        }),
      });
      setDebts(result.data || []);
      setForm(initialForm());
      setFormOpen(false);
      setNotice("Dívida cadastrada.");
      await getAllTransactions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const payInstallment = async (installment) => {
    setBusyInstallment(installment.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/debts/installments/${installment.id}/pay`, {
        method: "POST",
      });
      setDebts(result.data || []);
      setNotice("Pagamento registrado no histórico de despesas.");
      await getAllTransactions();
    } catch (requestError) {
      setError(requestError.message);
      await loadDebts();
    } finally {
      setBusyInstallment(null);
    }
  };

  const deleteDebt = async (debt) => {
    if (!window.confirm(`Excluir a dívida “${debt.name}”?`)) return;
    setError("");
    setNotice("");
    try {
      await apiRequest(`/debts/${debt.id}`, { method: "DELETE" });
      await loadDebts();
      setNotice("Dívida excluída.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="debts-page">
      <Header />
      <main className="debts-content">
        <div className="debts-heading">
          <div>
            <p className="debts-eyebrow">FINANÇAS</p>
            <h1>Dívidas</h1>
            <p className="debts-subtitle">Acompanhe vencimentos e parcelas em um só lugar.</p>
          </div>
          <button className="debts-primary-button" onClick={() => setFormOpen(!formOpen)} type="button">
            {formOpen ? <FiX /> : <FiPlus />}
            {formOpen ? "Fechar" : "Nova dívida"}
          </button>
        </div>

        <section className="debts-summary" aria-label="Resumo das dívidas">
          <article className="debt-summary-item debt-summary-open">
            <span className="debt-summary-icon"><FiClock /></span>
            <div><span>Em aberto · todos os períodos</span><strong>{formatCurrency(summary.pendingAmount)}</strong><small>{summary.pendingCount} parcelas</small></div>
          </article>
          <article className="debt-summary-item debt-summary-paid">
            <span className="debt-summary-icon"><FiCheck /></span>
            <div><span>Já pagas · todos os períodos</span><strong>{formatCurrency(summary.paidAmount)}</strong><small>{summary.paidCount} parcelas</small></div>
          </article>
        </section>

        <section className="debt-period-section" aria-label="Período das parcelas">
          <div className="debt-period-tabs" role="tablist" aria-label="Período">
            <button aria-selected={periodView === "month"} className={periodView === "month" ? "active" : ""} onClick={() => setPeriodView("month")} role="tab" type="button">Por mês</button>
            <button aria-selected={periodView === "overdue"} className={periodView === "overdue" ? "active" : ""} onClick={() => setPeriodView("overdue")} role="tab" type="button">Vencidas</button>
            <button aria-selected={periodView === "all"} className={periodView === "all" ? "active" : ""} onClick={() => setPeriodView("all")} role="tab" type="button">Todas as datas</button>
          </div>

          {periodView === "month" && (
            <>
              <div className="debt-month-navigation">
                <div className="debt-month-stepper">
                  <button aria-label="Mês anterior" className="debts-icon-button" onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))} type="button"><FiChevronLeft /></button>
                  <div className="debt-month-title"><strong>{formatMonth(selectedMonth)}</strong>{selectedMonth === localDateString().slice(0, 7) && <span>Este mês</span>}</div>
                  <button aria-label="Próximo mês" className="debts-icon-button" onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))} type="button"><FiChevronRight /></button>
                </div>
                {selectedMonth !== localDateString().slice(0, 7) && (
                  <button className="debt-current-month-button" onClick={() => setSelectedMonth(localDateString().slice(0, 7))} type="button">Ir para este mês</button>
                )}
                <label className="debt-month-picker"><span className="sr-only">Selecionar mês</span><input aria-label="Selecionar mês" onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} type="month" value={selectedMonth} /></label>
              </div>
              <div className="debt-month-summary">
                <div><span>Total previsto</span><strong>{formatCurrency(monthlySummary.total)}</strong><small>{monthlyInstallments.length} parcelas</small></div>
                <div><span>Em aberto</span><strong>{formatCurrency(monthlySummary.pending)}</strong><small>{monthlySummary.pendingCount} parcelas</small></div>
                <div><span>Pagas</span><strong>{formatCurrency(monthlySummary.paid)}</strong><small>{monthlySummary.paidCount} parcelas</small></div>
              </div>
              <div className="debt-month-filters" aria-label="Filtrar parcelas deste mês">
                {[
                  ["all", "Todas"],
                  ["pending", "Em aberto"],
                  ["overdue", "Atrasadas"],
                  ["paid", "Pagas"],
                ].map(([value, label]) => (
                  <button className={monthStatus === value ? "active" : ""} key={value} onClick={() => setMonthStatus(value)} type="button">{label}</button>
                ))}
              </div>
            </>
          )}
          {periodView === "overdue" && <p className="debt-period-caption">Parcelas pendentes com vencimento anterior a hoje, em qualquer mês.</p>}
          {periodView === "all" && <p className="debt-period-caption">Histórico completo, incluindo parcelas futuras, pendentes e pagas.</p>}
        </section>

        {error && <div className="debts-message debts-error" role="alert"><FiAlertCircle />{error}</div>}
        {notice && <div className="debts-message debts-success" role="status"><FiCheck />{notice}</div>}

        {formOpen && (
          <div className="debt-modal-backdrop" onClick={() => setFormOpen(false)}>
          <section
            aria-labelledby="debt-modal-title"
            aria-modal="true"
            className="debt-form-section debt-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            tabIndex="-1"
          >
            <div className="debt-section-heading">
              <div><h2 id="debt-modal-title">Cadastrar dívida</h2><p>O valor informado é o valor de cada parcela.</p></div>
              <button aria-label="Fechar cadastro" className="debts-icon-button" onClick={() => setFormOpen(false)} type="button"><FiX /></button>
            </div>
            <form className="debt-form" onSubmit={handleSubmit}>
              <label className="debt-field">
                <span>Nome da dívida</span>
                <input maxLength="120" onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Empréstimo, aluguel" required value={form.name} />
              </label>
              <label className="debt-field">
                <span>Pessoa ou credor <small>Opcional</small></span>
                <input maxLength="120" onChange={(event) => setForm({ ...form, creditor: event.target.value })} placeholder="Ex.: Banco ou pessoa" value={form.creditor} />
              </label>
              <label className="debt-field">
                <span>Valor da parcela</span>
                <div className="debt-input-with-icon"><FiDollarSign /><input min="0.01" onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" required step="0.01" type="number" value={form.amount} /></div>
              </label>
              <label className="debt-field">
                <span>Primeiro vencimento</span>
                <div className="debt-input-with-icon"><FiCalendar /><input onChange={(event) => setForm({ ...form, firstDueDate: event.target.value })} required type="date" value={form.firstDueDate} /></div>
              </label>
              <label className="debt-recurring-toggle">
                <input checked={form.recurring} onChange={(event) => setForm({ ...form, recurring: event.target.checked })} type="checkbox" />
                <span><FiRefreshCw /><strong>Repetir mensalmente</strong><small>Gerar parcelas nos próximos meses</small></span>
              </label>
              {form.recurring && (
                <label className="debt-field debt-count-field">
                  <span>Quantidade de meses</span>
                  <input max="120" min="2" onChange={(event) => setForm({ ...form, installmentCount: event.target.value })} required type="number" value={form.installmentCount} />
                </label>
              )}
              <div className="debt-form-actions">
                <button className="debts-secondary-button" onClick={() => setFormOpen(false)} type="button">Cancelar</button>
                <button className="debts-primary-button" disabled={saving} type="submit">{saving ? "Salvando..." : "Salvar dívida"}</button>
              </div>
            </form>
          </section>
          </div>
        )}

        <section className="debt-list-section">
          <div className="debt-section-heading">
            <div><h2>{periodView === "month" ? `Parcelas de ${formatMonth(selectedMonth)}` : periodView === "overdue" ? "Parcelas vencidas" : "Todas as parcelas"}</h2><p>{visibleDebts.reduce((count, debt) => count + debt.visibleInstallments.length, 0)} parcelas</p></div>
            <button className="debts-icon-button" onClick={loadDebts} title="Atualizar lista" type="button"><FiRefreshCw /></button>
          </div>
          {loading ? (
            <div className="debts-empty-state">Carregando dívidas...</div>
          ) : visibleDebts.length === 0 ? (
            <div className="debts-empty-state"><FiDollarSign /><strong>{debts.length === 0 ? "Nenhuma dívida cadastrada" : "Nenhuma parcela neste período"}</strong><span>{debts.length === 0 ? "Adicione uma dívida para acompanhar suas parcelas." : "Experimente outro mês ou altere o filtro selecionado."}</span></div>
          ) : (
            <div className="debt-list">
              {visibleDebts.map((debt) => {
                const installments = [...(debt.visibleInstallments || [])].sort((a, b) => a.installment_number - b.installment_number);
                const nextInstallment = installments.find((installment) => installment.status === "pending");
                const paidCount = (debt.installments || []).filter((installment) => installment.status === "paid").length;
                return (
                  <article className="debt-card" key={debt.id}>
                    <div className="debt-card-main">
                      <div className="debt-card-title">
                        <span className="debt-card-icon"><FiDollarSign /></span>
                        <div><h3>{debt.name}</h3><p>{debt.creditor || (debt.recurring ? "Recorrente" : "Parcela única")}</p></div>
                      </div>
                      <div className="debt-card-amount"><strong>{formatCurrency(debt.amount)}</strong><span>por parcela</span></div>
                    </div>
                    <div className="debt-card-meta">
                      <span><FiCalendar />{nextInstallment ? `Vencimento ${formatDate(nextInstallment.due_date)}` : "Nenhuma parcela pendente nesta visualização"}</span>
                      <span>{paidCount} de {(debt.installments || []).length} pagas no total</span>
                    </div>
                    <details className="debt-installments-details" open={periodView !== "all"}>
                      <summary>Parcelas neste período <span>{installments.length}</span></summary>
                      <div className="debt-installment-list">
                        {installments.map((installment) => (
                          <div className="debt-installment" key={installment.id}>
                            <div className="debt-installment-date"><strong>{installment.installment_number}/{installments.length}</strong><span>{formatDate(installment.due_date)}</span></div>
                            <strong className="debt-installment-amount">{formatCurrency(installment.amount)}</strong>
                            {installment.status === "paid" ? (
                              <span className="debt-paid-label"><FiCheck />Paga</span>
                            ) : (
                              <button className="debt-pay-button" disabled={busyInstallment === installment.id} onClick={() => payInstallment(installment)} type="button">{busyInstallment === installment.id ? "Registrando..." : "Registrar pagamento"}</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                    {paidCount === 0 && (
                      <button className="debt-delete-button" onClick={() => deleteDebt(debt)} title="Excluir dívida" type="button"><FiTrash2 /><span>Excluir</span></button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Debts;
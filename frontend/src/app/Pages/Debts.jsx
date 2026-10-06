import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
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

const getDaysUntil = (dateString) => {
  const today = new Date(`${localDateString()}T00:00:00`);
  const targetDate = new Date(`${dateString}T00:00:00`);
  const diff = targetDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getDebtStatus = (debt, installments = debt.installments || []) => {
  const pending = installments.filter((installment) => installment.status === "pending");

  if (pending.length === 0) {
    const allInstallments = debt.installments || [];
    return allInstallments.length > 0 && allInstallments.every((installment) => installment.status === "paid")
      ? "paid"
      : "paidInPeriod";
  }

  const closest = [...pending].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const daysUntil = getDaysUntil(closest.due_date);

  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "dueToday";
  if (daysUntil <= 7) return "dueSoon";
  return "upcoming";
};

function Debts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getAllTransactions } = useContext(MyContext);
  const [debts, setDebts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => localDateString().slice(0, 7));
  const [periodView, setPeriodView] = useState("month");
  const [monthStatus, setMonthStatus] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("month");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyInstallment, setBusyInstallment] = useState(null);
  const [expandedDebtId, setExpandedDebtId] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [debtEditor, setDebtEditor] = useState(null);
  const [installmentEditor, setInstallmentEditor] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const handledDashboardEdit = useRef(null);

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

  const smartSummary = useMemo(() => {
    const activeInstallments = periodView === "month"
      ? monthlyInstallments
      : debts.flatMap((debt) => (debt.installments || []).map((installment) => ({ ...installment, debt })));

    const dueSoon = activeInstallments.filter((item) => item.status === "pending" && getDaysUntil(item.due_date) >= 0 && getDaysUntil(item.due_date) <= 7);
    const overdue = activeInstallments.filter((item) => item.status === "pending" && getDaysUntil(item.due_date) < 0);
    const paid = activeInstallments.filter((item) => item.status === "paid");

    return {
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      dueSoonAmount: dueSoon.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      overdueAmount: overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidAmount: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [debts, monthlyInstallments, periodView]);

  const timeFilteredInstallments = useMemo(() => {
    const today = new Date(`${localDateString()}T00:00:00`);
    return debts.flatMap((debt) => (debt.installments || []).map((installment) => ({ ...installment, debt }))).filter((item) => {
      if (timeFilter === "month") return item.due_date?.slice(0, 7) === selectedMonth;
      if (timeFilter === "week") {
        const dueDate = new Date(`${item.due_date}T00:00:00`);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return item.status === "pending" && diffDays >= 0 && diffDays <= 7;
      }
      if (timeFilter === "overdue") return item.status === "pending" && item.due_date < localDateString();
      return true;
    });
  }, [debts, selectedMonth, timeFilter]);

  const recentActivities = useMemo(
    () => debts
      .flatMap((debt) => (debt.installments || []).map((installment) => ({
        id: installment.id,
        debtName: debt.name,
        amount: Number(installment.amount || 0),
        date: installment.status === "paid" ? installment.paid_at || installment.updatedAt : installment.updatedAt || installment.due_date,
        type: installment.status === "paid" ? "payment" : "update",
        dueDate: installment.due_date,
      })))
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6),
    [debts]
  );

  const visibleDebts = useMemo(() => {
    const today = localDateString();
    return debts.map((debt) => {
      const installments = (debt.installments || []).filter((installment) => {
        if (timeFilter === "month" && installment.due_date?.slice(0, 7) !== selectedMonth) return false;
        if (timeFilter === "week") {
          const diffDays = getDaysUntil(installment.due_date);
          return installment.status === "pending" && diffDays >= 0 && diffDays <= 7;
        }
        if (timeFilter === "overdue") {
          return installment.status === "pending" && installment.due_date < today;
        }
        if (timeFilter === "all") return true;
        return true;
      });

      const filteredInstallments = installments.filter((installment) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "pending") return installment.status === "pending";
        if (statusFilter === "overdue") return installment.status === "pending" && getDaysUntil(installment.due_date) < 0;
        if (statusFilter === "paid") return installment.status === "paid";
        return true;
      });

      return { ...debt, periodInstallments: installments, visibleInstallments: filteredInstallments };
    }).filter((debt) => debt.visibleInstallments.length > 0);
  }, [debts, periodView, selectedMonth, statusFilter, timeFilter]);

  const debtStatusGroups = [
    { status: "overdue", title: "Vencidas" },
    { status: "dueToday", title: "Vencem hoje" },
    { status: "dueSoon", title: "Próximas dívidas" },
    { status: "upcoming", title: "Em dia" },
    { status: "paidInPeriod", title: "Pagas neste período" },
    { status: "paid", title: "Quitadas" },
  ].map((group) => ({
    ...group,
    debts: visibleDebts.filter((debt) => getDebtStatus(debt, debt.visibleInstallments) === group.status),
  })).filter((group) => group.debts.length > 0);

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

  const openPaymentDialog = (installment, debt) => {
    setPaymentDialog({
      installment,
      debt,
      paymentDate: localDateString(),
    });
    setError("");
    setNotice("");
  };

  const payInstallment = async (event) => {
    event.preventDefault();
    if (!paymentDialog?.paymentDate) {
      setError("Informe a data em que a parcela foi paga.");
      return;
    }

    const { installment, paymentDate } = paymentDialog;
    setBusyInstallment(installment.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/debts/installments/${installment.id}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentDate }),
      });
      setDebts(result.data || []);
      setPaymentDialog(null);
      setNotice(`Pagamento de ${formatDate(paymentDate)} registrado no histórico de despesas.`);
      await getAllTransactions();
    } catch (requestError) {
      setError(requestError.message);
      await loadDebts();
    } finally {
      setBusyInstallment(null);
    }
  };

  const unpayInstallment = async (installment) => {
    setBusyInstallment(installment.id);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`/debts/installments/${installment.id}/unpay`, {
        method: "POST",
      });
      setDebts(result.data || []);
      setNotice("Pagamento desfeito; a despesa foi removida do histórico.");
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

  const openDebtEditor = (debt) => {
    setDebtEditor({
      id: debt.id,
      name: debt.name,
      creditor: debt.creditor || "",
      amount: String(debt.amount ?? ""),
      firstDueDate: debt.first_due_date || (debt.installments?.[0]?.due_date || localDateString()),
      recurring: Boolean(debt.recurring),
      installmentCount: String(debt.installment_count || 1),
    });
    setError("");
    setNotice("");
  };

  const saveDebtChanges = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/debts/${debtEditor.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...debtEditor,
          amount: Number(debtEditor.amount),
          installmentCount: Number(debtEditor.installmentCount),
        }),
      });
      setDebtEditor(null);
      setNotice("Dívida atualizada.");
      await loadDebts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const openInstallmentEditor = (installment) => {
    setInstallmentEditor({
      id: installment.id,
      due_date: installment.due_date,
      amount: String(installment.amount ?? ""),
    });
    setError("");
    setNotice("");
  };

  useEffect(() => {
    const requestedInstallmentId = location.state?.editInstallmentId;
    const requestedDebtId = location.state?.editDebtId;
    const requestId = requestedInstallmentId ? `installment:${requestedInstallmentId}` : requestedDebtId ? `debt:${requestedDebtId}` : null;
    if (!requestId || loading) return;
    if (handledDashboardEdit.current === requestId) return;

    const requestedState = location.state;
    handledDashboardEdit.current = requestId;
    navigate(location.pathname, { replace: true, state: null });

    const openRequestedInstallment = async () => {
      if (requestedDebtId) {
        const debt = debts.find((item) => String(item.id) === String(requestedDebtId));
        if (!debt) {
          setError("Não foi possível encontrar a dívida vinculada a esta despesa.");
          return;
        }

        setTimeFilter("all");
        setStatusFilter("all");
        setExpandedDebtId(debt.id);

        const hasPaidInstallments = (debt.installments || []).some((item) => item.status === "paid");
        if (hasPaidInstallments) {
          setNotice("Para editar os dados gerais desta dívida, reabra primeiro cada parcela paga. Nenhum pagamento foi desfeito.");
          return;
        }

        openDebtEditor(debt);
        return;
      }

      const installment = debts
        .flatMap((debt) => (debt.installments || []).map((item) => ({ ...item, debt })))
        .find((item) => String(item.id) === String(requestedInstallmentId));

      if (!installment) {
        setError("Não foi possível encontrar a parcela vinculada a esta despesa.");
        return;
      }

      setSelectedMonth(installment.due_date.slice(0, 7));
      setTimeFilter("month");
      setStatusFilter("all");
      setExpandedDebtId(installment.debt.id);

      if (!requestedState.undoPaymentFirst) {
        openInstallmentEditor(installment);
        return;
      }

      setBusyInstallment(installment.id);
      try {
        await apiRequest(`/debts/installments/${installment.id}/unpay`, { method: "POST" });
        const result = await apiRequest("/debts");
        setDebts(result.data || []);
        openInstallmentEditor(installment);
        setNotice("Pagamento desfeito. Ajuste a parcela e registre o pagamento novamente.");
        try {
          await getAllTransactions();
        } catch (refreshError) {
          setError(`A parcela foi reaberta, mas não foi possível atualizar o extrato: ${refreshError.message}`);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setBusyInstallment(null);
      }
    };

    openRequestedInstallment();
  }, [apiRequest, debts, getAllTransactions, loading, location.pathname, location.state, navigate]);

  const saveInstallmentChanges = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/debts/installments/${installmentEditor.id}`, {
        method: "PUT",
        body: JSON.stringify({
          due_date: installmentEditor.due_date,
          amount: Number(installmentEditor.amount),
        }),
      });
      setInstallmentEditor(null);
      setNotice("Parcela atualizada.");
      await loadDebts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const settleDebt = async (debt) => {
    if (!window.confirm(`Liquidar todas as parcelas pendentes de “${debt.name}”?`)) return;
    setBusyInstallment(debt.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/debts/${debt.id}/settle`, { method: "POST" });
      setNotice("Dívida liquidada com sucesso.");
      await loadDebts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyInstallment(null);
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

        <section className="debt-period-section" aria-label="Filtro de parcelas">
          <div className="debt-filter-layout">
            <div className="debt-filter-group">
              <span className="debt-filter-label">Status</span>
              <div className="debt-filter-row" aria-label="Filtrar por status">
                {[
                  ["all", "Todas"],
                  ["pending", "Em aberto"],
                  ["overdue", "Atrasadas"],
                  ["paid", "Pagas"],
                ].map(([value, label]) => (
                  <button aria-pressed={statusFilter === value} className={statusFilter === value ? "active" : ""} data-filter={value} key={value} onClick={() => setStatusFilter(value)} type="button">{label}</button>
                ))}
              </div>
            </div>

            <div className="debt-filter-group">
              <span className="debt-filter-label">Período</span>
              <div className="debt-filter-row" aria-label="Filtrar por período">
                {[
                  ["month", "Este mês"],
                  ["week", "Próximos 7 dias"],
                  ["overdue", "Vencidas"],
                  ["all", "Todas"],
                ].map(([value, label]) => (
                  <button aria-pressed={timeFilter === value} className={timeFilter === value ? "active" : ""} data-filter={value} key={value} onClick={() => setTimeFilter(value)} type="button">{label}</button>
                ))}
              </div>
            </div>
          </div>

          {timeFilter === "month" && (
            <>
              <div className="debt-month-navigation">
                <div className="debt-month-stepper">
                  <button aria-label="Mês anterior" className="debts-icon-button" onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))} type="button"><FiChevronLeft /></button>
                  <div aria-live="polite" className="debt-month-title"><strong>{formatMonth(selectedMonth)}</strong>{selectedMonth === localDateString().slice(0, 7) && <span>Este mês</span>}</div>
                  <button aria-label="Próximo mês" className="debts-icon-button" onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))} type="button"><FiChevronRight /></button>
                </div>
                {selectedMonth !== localDateString().slice(0, 7) && (
                  <button className="debt-current-month-button" onClick={() => setSelectedMonth(localDateString().slice(0, 7))} type="button">Ir para este mês</button>
                )}
                <label className="debt-month-picker"><span><FiCalendar />Selecionar mês</span><input aria-label="Selecionar mês" onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} type="month" value={selectedMonth} /></label>
              </div>
              <div className="debt-month-summary">
                <div><span>Total previsto</span><strong>{formatCurrency(monthlySummary.total)}</strong><small>{monthlyInstallments.length} parcelas</small></div>
                <div><span>Em aberto</span><strong>{formatCurrency(monthlySummary.pending)}</strong><small>{monthlySummary.pendingCount} parcelas</small></div>
                <div><span>Pagas</span><strong>{formatCurrency(monthlySummary.paid)}</strong><small>{monthlySummary.paidCount} parcelas</small></div>
              </div>
            </>
          )}
          {timeFilter === "week" && <p className="debt-period-caption">Parcelas em aberto nos próximos 7 dias.</p>}
          {timeFilter === "overdue" && <p className="debt-period-caption">Parcelas pendentes com vencimento anterior a hoje.</p>}
          {timeFilter === "all" && <p className="debt-period-caption">Histórico completo de todas as parcelas, em qualquer período.</p>}
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

        {paymentDialog && (
          <div className="debt-modal-backdrop" onClick={() => setPaymentDialog(null)}>
            <section
              aria-labelledby="installment-payment-title"
              aria-modal="true"
              className="debt-form-section debt-modal debt-payment-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="debt-section-heading">
                <div className="debt-payment-heading">
                  <span className="debt-payment-heading-icon"><FiCheck /></span>
                  <span>
                  <h2 id="installment-payment-title">Registrar pagamento</h2>
                  <p>Confirme a data em que você pagou esta parcela.</p>
                  </span>
                </div>
                <button aria-label="Fechar registro de pagamento" className="debts-icon-button" onClick={() => setPaymentDialog(null)} type="button"><FiX /></button>
              </div>
              <div className="debt-payment-summary">
                <span className="debt-payment-summary-label">DÍVIDA</span>
                <strong>{paymentDialog.debt.name}</strong>
                <span className="debt-payment-sequence">Parcela {paymentDialog.installment.installment_number} de {paymentDialog.debt.installment_count}</span>
                <b>{formatCurrency(paymentDialog.installment.amount)}</b>
              </div>
              <form className="debt-form debt-payment-form" onSubmit={payInstallment}>
                <label className="debt-field">
                  <span>Data do pagamento</span>
                  <div className="debt-input-with-icon"><FiCalendar /><input autoFocus max={localDateString()} required type="date" value={paymentDialog.paymentDate} onChange={(event) => setPaymentDialog({ ...paymentDialog, paymentDate: event.target.value })} /></div>
                </label>
                <p className="debt-payment-helper">A data escolhida será usada no histórico de despesas e no saldo da dashboard.</p>
                <div className="debt-form-actions">
                  <button className="debts-secondary-button" onClick={() => setPaymentDialog(null)} type="button">Cancelar</button>
                  <button className="debts-primary-button" disabled={busyInstallment === paymentDialog.installment.id} type="submit">
                    {busyInstallment === paymentDialog.installment.id ? "Registrando..." : "Confirmar pagamento"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {debtEditor && (
          <div className="debt-modal-backdrop" onClick={() => setDebtEditor(null)}>
            <section className="debt-form-section debt-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="debt-edit-title">
              <div className="debt-section-heading">
                <div><h2 id="debt-edit-title">Editar dívida</h2><p>Atualize os dados principais da dívida.</p></div>
                <button className="debts-icon-button" onClick={() => setDebtEditor(null)} type="button" aria-label="Fechar edição"><FiX /></button>
              </div>
              <form className="debt-form" onSubmit={saveDebtChanges}>
                <label className="debt-field"><span>Nome da dívida</span><input maxLength="120" required value={debtEditor.name} onChange={(event) => setDebtEditor({ ...debtEditor, name: event.target.value })} /></label>
                <label className="debt-field"><span>Pessoa ou credor <small>Opcional</small></span><input maxLength="120" value={debtEditor.creditor} onChange={(event) => setDebtEditor({ ...debtEditor, creditor: event.target.value })} /></label>
                <label className="debt-field"><span>Valor da parcela</span><div className="debt-input-with-icon"><FiDollarSign /><input min="0.01" required step="0.01" type="number" value={debtEditor.amount} onChange={(event) => setDebtEditor({ ...debtEditor, amount: event.target.value })} /></div></label>
                <label className="debt-field"><span>Primeiro vencimento</span><div className="debt-input-with-icon"><FiCalendar /><input required type="date" value={debtEditor.firstDueDate} onChange={(event) => setDebtEditor({ ...debtEditor, firstDueDate: event.target.value })} /></div></label>
                <label className="debt-recurring-toggle">
                  <input checked={debtEditor.recurring} type="checkbox" onChange={(event) => setDebtEditor({ ...debtEditor, recurring: event.target.checked })} />
                  <span><FiRefreshCw /><strong>Repetir mensalmente</strong><small>Gerar parcelas nos próximos meses</small></span>
                </label>
                {debtEditor.recurring && (
                  <label className="debt-field debt-count-field"><span>Quantidade de parcelas</span><input max="120" min="1" type="number" value={debtEditor.installmentCount} onChange={(event) => setDebtEditor({ ...debtEditor, installmentCount: event.target.value })} /></label>
                )}
                <div className="debt-form-actions">
                  <button className="debts-secondary-button" type="button" onClick={() => setDebtEditor(null)}>Cancelar</button>
                  <button className="debts-primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {installmentEditor && (
          <div className="debt-modal-backdrop" onClick={() => setInstallmentEditor(null)}>
            <section className="debt-form-section debt-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="installment-edit-title">
              <div className="debt-section-heading">
                <div><h2 id="installment-edit-title">Editar parcela</h2><p>Atualize o vencimento e o valor desta parcela.</p></div>
                <button className="debts-icon-button" onClick={() => setInstallmentEditor(null)} type="button" aria-label="Fechar edição de parcela"><FiX /></button>
              </div>
              <form className="debt-form" onSubmit={saveInstallmentChanges}>
                <label className="debt-field"><span>Data de vencimento</span><div className="debt-input-with-icon"><FiCalendar /><input required type="date" value={installmentEditor.due_date} onChange={(event) => setInstallmentEditor({ ...installmentEditor, due_date: event.target.value })} /></div></label>
                <label className="debt-field"><span>Valor da parcela</span><div className="debt-input-with-icon"><FiDollarSign /><input min="0.01" required step="0.01" type="number" value={installmentEditor.amount} onChange={(event) => setInstallmentEditor({ ...installmentEditor, amount: event.target.value })} /></div></label>
                <div className="debt-form-actions">
                  <button className="debts-secondary-button" type="button" onClick={() => setInstallmentEditor(null)}>Cancelar</button>
                  <button className="debts-primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar parcela"}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="debt-list-section">
          <div className="debt-section-heading">
            <div><h2>{periodView === "month" ? `Parcelas de ${formatMonth(selectedMonth)}` : periodView === "overdue" ? "Parcelas vencidas" : "Todas as parcelas"}</h2><p>{visibleDebts.reduce((count, debt) => count + debt.visibleInstallments.length, 0)} parcelas</p></div>
            <div className="debt-list-tools">
              <button className="debt-history-trigger" onClick={() => setHistoryOpen(true)} type="button">
                Histórico <span>{recentActivities.length}</span>
              </button>
              <button className="debts-icon-button" onClick={loadDebts} title="Atualizar lista" type="button"><FiRefreshCw /></button>
            </div>
          </div>

          <div className="debt-quick-summary" aria-label="Resumo inteligente das dívidas">
            <div><span>Próximas 7 dias</span><strong>{formatCurrency(smartSummary.dueSoonAmount)}</strong><small>{smartSummary.dueSoonCount} parcelas</small></div>
            <div><span>Vencidas</span><strong>{formatCurrency(smartSummary.overdueAmount)}</strong><small>{smartSummary.overdueCount} parcelas</small></div>
            <div><span>Pagas</span><strong>{formatCurrency(smartSummary.paidAmount)}</strong><small>{smartSummary.paidCount} parcelas</small></div>
          </div>

          {historyOpen && (
            <div className="debt-modal-backdrop" onClick={() => setHistoryOpen(false)}>
              <section className="debt-form-section debt-modal debt-history-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="debt-history-title">
                <div className="debt-section-heading">
                  <div><h2 id="debt-history-title">Histórico de dívidas</h2><p>Últimas movimentações e pagamentos.</p></div>
                  <button className="debts-icon-button" onClick={() => setHistoryOpen(false)} type="button" aria-label="Fechar histórico"><FiX /></button>
                </div>
                <ul className="debt-history-list">
                  {recentActivities.length === 0 ? (
                    <li className="debt-history-empty">Ainda não há movimentações registradas.</li>
                  ) : (
                    recentActivities.map((activity) => (
                      <li className="debt-history-item" key={activity.id + activity.type}>
                        <span className={`debt-history-dot ${activity.type}`} />
                        <div>
                          <strong>{activity.type === "payment" ? "Pagamento registrado" : "Parcela atualizada"}</strong>
                          <small>{activity.debtName}</small>
                        </div>
                        <div className="debt-history-meta">
                          <span>{formatCurrency(activity.amount)}</span>
                          <small>{formatDate(activity.date?.slice(0, 10) || activity.date)}</small>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          )}

          {loading ? (
            <div className="debts-empty-state">Carregando dívidas...</div>
          ) : visibleDebts.length === 0 ? (
            <div className="debts-empty-state"><FiDollarSign /><strong>{debts.length === 0 ? "Nenhuma dívida cadastrada" : "Nenhuma parcela neste período"}</strong><span>{debts.length === 0 ? "Adicione uma dívida para acompanhar suas parcelas." : "Experimente outro mês ou altere o filtro selecionado."}</span></div>
          ) : (
            <div className="debt-list">
              {debtStatusGroups.map((group) => (
                <section className={`debt-status-group ${group.status}`} key={group.status}>
                  <div className="debt-status-group-heading">
                    <h3>{group.title}</h3>
                    <span>{group.debts.length}</span>
                  </div>
                  <div className="debt-status-group-list">
                    <div aria-hidden="true" className="debt-record-columns">
                      <span>Dívida</span>
                      <span>Valor no período</span>
                      <span>Próximo vencimento</span>
                      <span>Situação</span>
                    </div>
                    {group.debts.map((debt) => {
                      const installments = [...(debt.visibleInstallments || [])].sort((a, b) => a.installment_number - b.installment_number);
                      const nextInstallment = [...(debt.periodInstallments || installments)]
                        .filter((installment) => installment.status === "pending")
                        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
                      const paidCount = (debt.installments || []).filter((installment) => installment.status === "paid").length;
                      const debtStatus = getDebtStatus(debt, installments);
                      const allInstallments = debt.installments || [];
                      const periodInstallments = debt.periodInstallments || installments;
                      const periodAmounts = [...new Set(periodInstallments.map((item) => Math.round(Number(item.amount) * 100)))];
                      const installmentAmountLabel = periodAmounts.length > 1
                        ? "Valores variáveis"
                        : formatCurrency(periodInstallments[0]?.amount ?? debt.amount);
                      const totalDebtAmount = allInstallments.reduce((total, item) => total + Number(item.amount || 0), 0);
                      return (
                        <details
                          className="debt-record"
                          key={debt.id}
                          onToggle={(event) => setExpandedDebtId(event.currentTarget.open ? debt.id : null)}
                          open={expandedDebtId === debt.id}
                        >
                          <summary className="debt-record-summary">
                            <div className="debt-record-name">
                              <span className="debt-card-icon"><FiDollarSign /></span>
                              <span><strong>{debt.name}</strong><small>{debt.creditor || (debt.recurring ? "Recorrente" : "Parcela única")}</small></span>
                            </div>
                            <span className="debt-record-amount">
                              <strong>{installmentAmountLabel}</strong>
                              <small>Total {formatCurrency(totalDebtAmount)}</small>
                            </span>
                            <span className="debt-record-due">{nextInstallment ? <><FiCalendar />{formatDate(nextInstallment.due_date)}</> : "Sem parcelas em aberto neste período"}</span>
                            <span className={`debt-status-badge ${debtStatus}`}>{debtStatus === "overdue" ? "Vencida" : debtStatus === "dueToday" ? "Vence hoje" : debtStatus === "dueSoon" ? "Próxima" : debtStatus === "paidInPeriod" ? "Paga neste período" : debtStatus === "paid" ? "Quitada" : "Em dia"}</span>
                            <span aria-hidden="true" className="debt-record-chevron"><FiChevronRight /></span>
                          </summary>
                          <div className="debt-record-content">
                            <div className="debt-record-meta">
                              <span>{debt.installment_count} {debt.installment_count === 1 ? "parcela" : "parcelas"}</span>
                              <span>{paidCount} de {(debt.installments || []).length} pagas</span>
                              <span>Total da dívida: {formatCurrency(totalDebtAmount)}</span>
                            </div>
                            <div className="debt-card-actions">
                              <button className="debt-edit-button" onClick={() => openDebtEditor(debt)} type="button"><FiEdit3 />Editar dívida</button>
                              {(debt.installments || []).some((installment) => installment.status === "pending") && (
                                <button className="debt-settle-button" disabled={busyInstallment === debt.id} onClick={() => settleDebt(debt)} type="button">{busyInstallment === debt.id ? "Liquidando..." : "Liquidar dívida"}</button>
                              )}
                              <button
                                aria-label={paidCount > 0 ? "Desfaça os pagamentos antes de excluir esta dívida" : `Excluir dívida ${debt.name}`}
                                className="debt-delete-button"
                                disabled={paidCount > 0}
                                onClick={() => deleteDebt(debt)}
                                title={paidCount > 0 ? "Desfaça os pagamentos registrados antes de excluir a dívida." : "Excluir dívida"}
                                type="button"
                              >
                                <FiTrash2 /><span>Excluir dívida</span>
                              </button>
                            </div>
                            <div className="debt-record-installments-heading">
                              <h4>Parcelas neste período</h4>
                              <span>{installments.length}</span>
                            </div>
                            {installments.length > 0 ? (
                              <div className="debt-installment-list">
                                {installments.map((installment) => (
                                  <div className="debt-installment" key={installment.id}>
                                    <div className="debt-installment-date">
                                      {debt.recurring && <span className="debt-installment-sequence">{installment.installment_number}/{debt.installment_count}</span>}
                                      <span>{formatDate(installment.due_date)}</span>
                                    </div>
                                    <strong className="debt-installment-amount">{formatCurrency(installment.amount)}</strong>
                                    {installment.status === "paid" ? (
                                      <div className="debt-installment-actions">
                                        <span className="debt-paid-label"><FiCheck />Paga</span>
                                        <button className="debt-edit-button compact" disabled={busyInstallment === installment.id} onClick={() => unpayInstallment(installment)} type="button">
                                          {busyInstallment === installment.id ? "Desfazendo..." : "Desfazer pagamento"}
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="debt-installment-actions">
                                        <button className="debt-pay-button" disabled={busyInstallment === installment.id} onClick={() => openPaymentDialog(installment, debt)} type="button">Registrar pagamento</button>
                                        <button className="debt-edit-button compact" onClick={() => openInstallmentEditor(installment)} type="button">Editar</button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="debt-record-no-installments">Não há parcelas neste período com os filtros selecionados.</p>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Debts;
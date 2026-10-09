import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiDollarSign,
  FiInfo,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import "../Styles/TransactionAnalytics.css";

const getMonthKey = (value) => {
  return getDateKey(value).slice(0, 7);
};

const getDateKey = (value) => {
  const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getMonthKeys = (count) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - count + index + 1, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
};

const formatMonth = (monthKey, options = { month: "short" }) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", options).format(new Date(year, month - 1, 1));
};

const formatDate = (value) => {
  const dateKey = getDateKey(value);
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
};

const parseAmount = (value) => {
  const amount = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatCompactCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getPercentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

const getConfirmedMonthTotals = (transactions, monthKey, lastDay) => {
  const totals = { income: 0, expense: 0, investment: 0 };
  transactions.forEach((transaction) => {
    const dateKey = getDateKey(transaction.date);
    if (
      transaction.status !== true ||
      dateKey.slice(0, 7) !== monthKey ||
      Number(dateKey.slice(8, 10)) > lastDay
    ) return;

    const typeId = Number(transaction.typeId);
    if (typeId === 1) totals.income += parseAmount(transaction.value);
    if (typeId === 2) totals.expense += parseAmount(transaction.value);
    if (typeId === 3) totals.investment += parseAmount(transaction.value);
  });
  return totals;
};

const getTypeLabel = (typeId) => {
  if (Number(typeId) === 1) return "Receita";
  if (Number(typeId) === 2) return "Despesa";
  if (Number(typeId) === 3) return "Investimento";
  return "Outro";
};

function TransactionAnalytics() {
  const { transactions } = useContext(MyContext);
  const [monthsToShow, setMonthsToShow] = useState(6);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(8);

  const monthKeys = useMemo(() => getMonthKeys(monthsToShow), [monthsToShow]);
  const currentMonthKey = monthKeys[monthKeys.length - 1];
  const previousMonthKey = monthKeys[monthKeys.length - 2];
  const currentDay = new Date().getDate();
  const [previousYear, previousMonthNumber] = previousMonthKey.split("-").map(Number);
  const previousDayLimit = Math.min(currentDay, new Date(previousYear, previousMonthNumber, 0).getDate());

  const monthlyData = useMemo(() => {
    const buckets = new Map(monthKeys.map((monthKey) => [monthKey, {
      monthKey,
      month: formatMonth(monthKey),
      income: 0,
      expense: 0,
      investment: 0,
      pendingIncome: 0,
      pendingExpense: 0,
      pendingInvestment: 0,
      confirmedCount: 0,
      pendingCount: 0,
    }]));

    transactions.forEach((transaction) => {
      const dateKey = getDateKey(transaction.date);
      const transactionMonth = dateKey.slice(0, 7);
      const bucket = buckets.get(transactionMonth);
      if (!bucket) return;
      if (
        transaction.status === true &&
        transactionMonth === currentMonthKey &&
        Number(dateKey.slice(8, 10)) > currentDay
      ) return;
      const amount = parseAmount(transaction.value);
      const typeId = Number(transaction.typeId);
      const amountType = typeId === 1 ? "income" : typeId === 2 ? "expense" : typeId === 3 ? "investment" : null;
      if (amountType) {
        const target = transaction.status === true ? amountType : `pending${amountType[0].toUpperCase()}${amountType.slice(1)}`;
        bucket[target] += amount;
        bucket[transaction.status === true ? "confirmedCount" : "pendingCount"] += 1;
      }
    });

    return [...buckets.values()];
  }, [transactions, monthKeys, currentMonthKey, currentDay]);

  const currentMonth = monthlyData[monthlyData.length - 1] || {};
  const currentPeriodTotals = useMemo(
    () => getConfirmedMonthTotals(transactions, currentMonthKey, currentDay),
    [transactions, currentMonthKey, currentDay],
  );
  const previousPeriodTotals = useMemo(
    () => getConfirmedMonthTotals(transactions, previousMonthKey, previousDayLimit),
    [transactions, previousMonthKey, previousDayLimit],
  );
  const currentNet = currentPeriodTotals.income - currentPeriodTotals.expense - currentPeriodTotals.investment;
  const previousNet = previousPeriodTotals.income - previousPeriodTotals.expense - previousPeriodTotals.investment;
  const expenseRatio = currentPeriodTotals.income > 0
    ? (currentPeriodTotals.expense / currentPeriodTotals.income) * 100
    : null;
  const investmentRatio = currentPeriodTotals.income > 0
    ? (currentPeriodTotals.investment / currentPeriodTotals.income) * 100
    : null;
  const pendingOutflows = (currentMonth.pendingExpense || 0) + (currentMonth.pendingInvestment || 0);
  const financialInsights = [
    {
      key: "expense-share",
      title: "Despesas sobre receitas",
      value: expenseRatio === null ? "Sem base" : `${expenseRatio.toFixed(0)}%`,
      detail: expenseRatio === null
        ? "Ainda não há receita confirmada para comparar neste mês."
        : expenseRatio > 100
          ? "As despesas pagas superam as receitas confirmadas no período até agora."
          : "Compare esta proporção com meses completos antes de ajustar seu orçamento.",
      tone: expenseRatio !== null && expenseRatio > 100 ? "attention" : "neutral",
    },
    {
      key: "pending",
      title: "Saídas pendentes",
      value: formatCurrency(pendingOutflows),
      detail: `${formatCurrency(currentMonth.pendingExpense || 0)} em despesas e ${formatCurrency(currentMonth.pendingInvestment || 0)} em aportes pendentes; ${formatCurrency(currentMonth.pendingIncome || 0)} em receitas pendentes.`,
      tone: pendingOutflows > 0 ? "attention" : "neutral",
    },
    {
      key: "investments",
      title: "Aportes confirmados",
      value: investmentRatio === null ? formatCurrency(currentPeriodTotals.investment) : `${investmentRatio.toFixed(0)}% da receita`,
      detail: currentPeriodTotals.investment > 0
        ? `${formatCurrency(currentPeriodTotals.investment)} destinados a investimentos; aporte reduz o caixa disponível, mas não é despesa de consumo.`
        : "Aportes são mostrados separadamente das despesas para não confundir investimento com consumo.",
      tone: "neutral",
    },
    {
      key: "cashflow",
      title: "Fluxo líquido confirmado",
      value: formatCurrency(currentNet),
      detail: currentNet < 0
        ? "As saídas confirmadas superam as entradas até hoje; confira o peso de despesas e aportes separadamente."
        : "Diferença entre receitas, despesas e aportes confirmados até hoje.",
      tone: currentNet < 0 ? "attention" : "neutral",
    },
  ];

  const forecast = useMemo(() => {
    const sample = monthlyData.slice(0, -1).slice(-3).filter((month) => month.confirmedCount > 0);
    const sampleCount = sample.length;
    const available = sampleCount >= 2;
    const meanFor = (key) => available
      ? sample.reduce((total, month) => total + month[key], 0) / sampleCount
      : 0;
    const income = meanFor("income");
    const expense = meanFor("expense");
    const investment = meanFor("investment");
    return {
      income,
      expense,
      investment,
      net: available ? income - expense - investment : null,
      sampleCount,
      available,
    };
  }, [monthlyData]);

  const chartData = useMemo(() => {
    const currentMonthIndex = monthlyData.length - 1;
    const actual = monthlyData.map((month, index) => ({
      ...month,
      projectedNet: forecast.available && index === currentMonthIndex
        ? month.income - month.expense - month.investment
        : null,
    }));
    if (!forecast.available) return actual;
    const nextMonthDate = new Date(`${currentMonthKey}-01T12:00:00`);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
    actual.push({
      monthKey: nextMonthKey,
      month: formatMonth(nextMonthKey),
      income: null,
      expense: null,
      investment: null,
      confirmedCount: 0,
      pendingCount: 0,
      projectedNet: forecast.net,
    });
    return actual;
  }, [monthlyData, currentMonthKey, forecast.net, forecast.available]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return transactions
      .filter((transaction) => typeFilter === "all" || Number(transaction.typeId) === Number(typeFilter))
      .filter((transaction) => statusFilter === "all" || transaction.status === (statusFilter === "confirmed"))
      .filter((transaction) => !query || String(transaction.description ?? "").toLocaleLowerCase("pt-BR").includes(query))
      .sort((first, second) => getMonthKey(second.date).localeCompare(getMonthKey(first.date)) || String(second.date).localeCompare(String(first.date)));
  }, [transactions, typeFilter, statusFilter, search]);

  useEffect(() => {
    setTablePage(1);
  }, [typeFilter, statusFilter, search, tablePageSize]);

  const tablePageCount = Math.max(1, Math.ceil(filteredTransactions.length / tablePageSize));
  const visibleTablePage = Math.min(tablePage, tablePageCount);
  const recentTransactions = useMemo(() => {
    const firstItem = (visibleTablePage - 1) * tablePageSize;
    return filteredTransactions.slice(firstItem, firstItem + tablePageSize);
  }, [filteredTransactions, visibleTablePage, tablePageSize]);
  const currentTrends = [
    { key: "income", label: "Receitas confirmadas", current: currentPeriodTotals.income, previous: previousPeriodTotals.income, icon: FiTrendingUp, tone: "income" },
    { key: "expense", label: "Despesas pagas", current: currentPeriodTotals.expense, previous: previousPeriodTotals.expense, icon: FiTrendingDown, tone: "expense" },
    { key: "investment", label: "Aportes confirmados", current: currentPeriodTotals.investment, previous: previousPeriodTotals.investment, icon: FiDollarSign, tone: "investment" },
    { key: "net", label: "Fluxo líquido", current: currentNet, previous: previousNet, icon: FiArrowRight, tone: "net" },
  ];

  return (
    <div className="transaction-analytics-page">
      <Header />
      <main className="transaction-analytics-content" id="main-content">
        <header className="analytics-heading">
          <div>
            <p className="analytics-eyebrow">Visão financeira</p>
            <h1>Transações</h1>
            <p>Realizado até o dia {currentDay}; pendências ficam separadas dos valores confirmados.</p>
          </div>
          <label className="analytics-period-control">
            <FiCalendar aria-hidden="true" />
            <span>Período</span>
            <select value={monthsToShow} onChange={(event) => setMonthsToShow(Number(event.target.value))}>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
            </select>
          </label>
        </header>

        <section className="analytics-metrics" aria-label="Resumo do mês atual">
          {currentTrends.map(({ key, label, current, previous, icon: Icon, tone }) => {
            const change = getPercentageChange(current, previous);
            const isRising = change > 0;
            const changeLabel = change === null
              ? "Sem base no mês anterior"
              : change === 0
                ? "Sem variação vs. mês anterior"
                : `${Math.abs(change)}% vs. mesmo dia do mês anterior`;
            return (
              <article className={`analytics-metric ${tone}`} key={key}>
                <div className="analytics-metric-top">
                  <span>{label}</span>
                  <Icon aria-hidden="true" />
                </div>
                <strong>{formatCurrency(current)}</strong>
                <div className={`analytics-trend ${isRising ? "rising" : change < 0 ? "falling" : "steady"}`}>
                  {isRising ? <FiArrowUp aria-hidden="true" /> : change !== null && change < 0 ? <FiArrowDown aria-hidden="true" /> : null}
                  <span>{changeLabel}</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="analytics-insights" aria-labelledby="financial-insights-heading">
          <div className="analytics-insights-heading">
            <div><p className="analytics-eyebrow">Leitura do período</p><h2 id="financial-insights-heading">Pontos para acompanhar</h2></div>
            <span>Baseado em lançamentos confirmados</span>
          </div>
          <div className="analytics-insight-grid">
            {financialInsights.map((insight) => (
              <article className={`analytics-insight ${insight.tone}`} key={insight.key}>
                <div className="analytics-insight-top"><FiInfo aria-hidden="true" /><h3>{insight.title}</h3></div>
                <strong>{insight.value}</strong>
                <p>{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="analytics-main-grid">
          <article className="analytics-panel analytics-chart-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Movimentação mensal</h2>
                <p>Entradas confirmadas; pendências são exibidas à parte.</p>
              </div>
            </div>
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsIncomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16866d" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16866d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analyticsExpenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d35f55" stopOpacity={0.17} />
                      <stop offset="95%" stopColor="#d35f55" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analyticsInvestmentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c28b32" stopOpacity={0.17} />
                      <stop offset="95%" stopColor="#c28b32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--analytics-grid)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--analytics-muted)", fontSize: 11 }} />
                  <YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--analytics-muted)", fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => label} contentStyle={{ background: "var(--analytics-surface)", borderColor: "var(--analytics-border)", borderRadius: 6 }} />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Receitas" stroke="#16866d" fill="url(#analyticsIncomeFill)" strokeWidth={2} connectNulls={false} />
                  <Area type="monotone" dataKey="expense" name="Despesas" stroke="#d35f55" fill="url(#analyticsExpenseFill)" strokeWidth={2} connectNulls={false} />
                  <Area type="monotone" dataKey="investment" name="Investimentos" stroke="#c28b32" fill="url(#analyticsInvestmentFill)" strokeWidth={2} connectNulls={false} />
                  {forecast.available && <Line type="monotone" dataKey="projectedNet" name="Projeção do fluxo líquido" stroke="#354f6b" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <aside className="analytics-projection-panel">
            <div className="projection-panel-heading">
              <span className="projection-mark"><FiInfo aria-hidden="true" /></span>
              <div><h2>Próximo mês</h2><p>Estimativa de fluxo</p></div>
            </div>
            {forecast.available ? <>
              <strong className={`projection-value ${forecast.net < 0 ? "negative" : ""}`}>{formatCurrency(forecast.net)}</strong>
              <span className="projection-label">Fluxo líquido estimado</span>
              <div className="projection-breakdown">
                <div><span>Receitas médias</span><strong>{formatCurrency(forecast.income)}</strong></div>
                <div><span>Despesas médias</span><strong>{formatCurrency(forecast.expense)}</strong></div>
                <div><span>Investimentos médios</span><strong>{formatCurrency(forecast.investment)}</strong></div>
              </div>
              <p className="projection-disclaimer">
                Média de {forecast.sampleCount} meses completos com lançamentos confirmados. É uma referência matemática, não uma previsão garantida.
              </p>
            </> : (
              <div className="projection-unavailable" role="status">
                <strong>Histórico insuficiente</strong>
                <p>A estimativa aparece após haver lançamentos confirmados em pelo menos dois dos últimos três meses completos.</p>
              </div>
            )}
          </aside>
        </section>

        <section className="analytics-panel analytics-history-panel">
          <div className="analytics-panel-heading history-heading">
            <div>
              <h2>Lançamentos</h2>
              <p>{filteredTransactions.length} resultados encontrados</p>
            </div>
            <Link to="/home#transactions" className="analytics-all-link">Lista completa <FiArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="analytics-filters">
            <label className="analytics-search">
              <span className="visually-hidden">Buscar descrição</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar transação" />
            </label>
            <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="1">Receitas</option>
              <option value="2">Despesas</option>
              <option value="3">Investimentos</option>
            </select>
            <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos os status</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>
          {recentTransactions.length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <thead><tr><th scope="col">Descrição</th><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Status</th><th scope="col">Valor</th></tr></thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.description || "Sem descrição"}</td>
                      <td>{formatDate(transaction.date)}</td>
                      <td><span className={`analytics-type-tag type-${Number(transaction.typeId)}`}>{getTypeLabel(transaction.typeId)}</span></td>
                      <td><span className={`analytics-status ${transaction.status === true ? "confirmed" : "pending"}`}>{transaction.status === true ? "Confirmado" : "Pendente"}</span></td>
                      <td className={`analytics-table-value type-value-${Number(transaction.typeId)}`}>{Number(transaction.typeId) === 2 ? "− " : "+ "}{formatCurrency(parseAmount(transaction.value))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="analytics-empty-state">Nenhuma transação corresponde aos filtros.</div>
          )}
          {filteredTransactions.length > 0 && (
            <nav className="analytics-pagination" aria-label="Paginação das transações">
              <span aria-live="polite">
                Exibindo {(visibleTablePage - 1) * tablePageSize + 1}–{Math.min(visibleTablePage * tablePageSize, filteredTransactions.length)} de {filteredTransactions.length}
              </span>
              <div className="analytics-pagination-controls">
                <label className="analytics-page-size">
                  <span>Por página</span>
                  <select value={tablePageSize} onChange={(event) => setTablePageSize(Number(event.target.value))} aria-label="Transações por página">
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                  </select>
                </label>
                <button type="button" onClick={() => setTablePage(visibleTablePage - 1)} disabled={visibleTablePage <= 1} aria-label="Página anterior">
                  <FiChevronLeft aria-hidden="true" />
                </button>
                <span className="analytics-page-number">{visibleTablePage} / {tablePageCount}</span>
                <button type="button" onClick={() => setTablePage(visibleTablePage + 1)} disabled={visibleTablePage >= tablePageCount} aria-label="Próxima página">
                  <FiChevronRight aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}

export default TransactionAnalytics;
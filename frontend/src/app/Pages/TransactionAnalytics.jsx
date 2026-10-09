import { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiCalendar,
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
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const [, year, month, day] = match;
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
  if (previous === 0) return current === 0 ? 0 : current > 0 ? 100 : -100;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
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

  const monthKeys = useMemo(() => getMonthKeys(monthsToShow), [monthsToShow]);
  const currentMonthKey = monthKeys[monthKeys.length - 1];

  const monthlyData = useMemo(() => {
    const buckets = new Map(monthKeys.map((monthKey) => [monthKey, {
      monthKey,
      month: formatMonth(monthKey),
      income: 0,
      expense: 0,
      investment: 0,
      count: 0,
    }]));

    transactions.forEach((transaction) => {
      const bucket = buckets.get(getMonthKey(transaction.date));
      if (!bucket) return;
      const amount = parseAmount(transaction.value);
      const typeId = Number(transaction.typeId);
      if (typeId === 1) bucket.income += amount;
      if (typeId === 2) bucket.expense += amount;
      if (typeId === 3) bucket.investment += amount;
      bucket.count += 1;
    });

    return [...buckets.values()];
  }, [transactions, monthKeys]);

  const currentMonth = monthlyData[monthlyData.length - 1] || {};
  const previousMonth = monthlyData[monthlyData.length - 2] || {};
  const currentNet = (currentMonth.income || 0) - (currentMonth.expense || 0) - (currentMonth.investment || 0);
  const previousNet = (previousMonth.income || 0) - (previousMonth.expense || 0) - (previousMonth.investment || 0);

  const forecast = useMemo(() => {
    const sample = monthlyData.slice(0, -1).slice(-3);
    const sampleCount = sample.length;
    const meanFor = (key) => sampleCount
      ? sample.reduce((total, month) => total + month[key], 0) / sampleCount
      : 0;
    const income = meanFor("income");
    const expense = meanFor("expense");
    const investment = meanFor("investment");
    return {
      income,
      expense,
      investment,
      net: income - expense - investment,
      sampleCount,
    };
  }, [monthlyData]);

  const chartData = useMemo(() => {
    const currentMonthIndex = monthlyData.length - 1;
    const actual = monthlyData.map((month, index) => ({
      ...month,
      projectedNet: index === currentMonthIndex
        ? month.income - month.expense - month.investment
        : null,
    }));
    const nextMonthDate = new Date(`${currentMonthKey}-01T12:00:00`);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
    actual.push({
      monthKey: nextMonthKey,
      month: formatMonth(nextMonthKey),
      income: null,
      expense: null,
      investment: null,
      count: 0,
      projectedNet: forecast.net,
    });
    return actual;
  }, [monthlyData, currentMonthKey, forecast.net]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return transactions
      .filter((transaction) => typeFilter === "all" || Number(transaction.typeId) === Number(typeFilter))
      .filter((transaction) => statusFilter === "all" || transaction.status === (statusFilter === "confirmed"))
      .filter((transaction) => !query || String(transaction.description ?? "").toLocaleLowerCase("pt-BR").includes(query))
      .sort((first, second) => getMonthKey(second.date).localeCompare(getMonthKey(first.date)) || String(second.date).localeCompare(String(first.date)));
  }, [transactions, typeFilter, statusFilter, search]);

  const recentTransactions = filteredTransactions.slice(0, 8);
  const currentTrends = [
    { key: "income", label: "Receitas", current: currentMonth.income || 0, previous: previousMonth.income || 0, icon: FiTrendingUp, tone: "income" },
    { key: "expense", label: "Despesas", current: currentMonth.expense || 0, previous: previousMonth.expense || 0, icon: FiTrendingDown, tone: "expense" },
    { key: "investment", label: "Investimentos", current: currentMonth.investment || 0, previous: previousMonth.investment || 0, icon: FiDollarSign, tone: "investment" },
    { key: "net", label: "Saldo do período", current: currentNet, previous: previousNet, icon: FiArrowRight, tone: "net" },
  ];

  return (
    <div className="transaction-analytics-page">
      <Header />
      <main className="transaction-analytics-content" id="main-content">
        <header className="analytics-heading">
          <div>
            <p className="analytics-eyebrow">Visão financeira</p>
            <h1>Transações</h1>
            <p>Receitas, despesas e investimentos em um só lugar.</p>
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
            return (
              <article className={`analytics-metric ${tone}`} key={key}>
                <div className="analytics-metric-top">
                  <span>{label}</span>
                  <Icon aria-hidden="true" />
                </div>
                <strong>{formatCurrency(current)}</strong>
                <div className={`analytics-trend ${isRising ? "rising" : change < 0 ? "falling" : "steady"}`}>
                  {isRising ? <FiArrowUp aria-hidden="true" /> : change < 0 ? <FiArrowDown aria-hidden="true" /> : null}
                  <span>{Math.abs(change)}% vs. mês anterior</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="analytics-main-grid">
          <article className="analytics-panel analytics-chart-panel">
            <div className="analytics-panel-heading">
              <div>
                <h2>Movimentação mensal</h2>
                <p>Valores registrados por mês, incluindo lançamentos pendentes.</p>
              </div>
            </div>
            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Line type="monotone" dataKey="projectedNet" name="Projeção de saldo" stroke="#354f6b" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <aside className="analytics-projection-panel">
            <div className="projection-panel-heading">
              <span className="projection-mark"><FiInfo aria-hidden="true" /></span>
              <div><h2>Próximo mês</h2><p>Estimativa de fluxo</p></div>
            </div>
            <strong className={`projection-value ${forecast.net < 0 ? "negative" : ""}`}>{formatCurrency(forecast.net)}</strong>
            <span className="projection-label">Saldo mensal estimado</span>
            <div className="projection-breakdown">
              <div><span>Receitas médias</span><strong>{formatCurrency(forecast.income)}</strong></div>
              <div><span>Despesas médias</span><strong>{formatCurrency(forecast.expense)}</strong></div>
              <div><span>Investimentos médios</span><strong>{formatCurrency(forecast.investment)}</strong></div>
            </div>
            <p className="projection-disclaimer">
              Média dos {forecast.sampleCount} meses completos anteriores. É uma referência matemática baseada nos registros, não uma previsão garantida.
            </p>
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
          {filteredTransactions.length > recentTransactions.length && (
            <p className="analytics-table-footer">Exibindo {recentTransactions.length} de {filteredTransactions.length} transações.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default TransactionAnalytics;
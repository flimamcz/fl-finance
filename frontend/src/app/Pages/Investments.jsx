import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowDownLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiInfo,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import { requestGet, requestPost, setToken } from "../Services/request";
import "../Styles/Investments.css";

const currentLocalMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const currentLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const parseAmount = (value) => {
  const amount = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
};

const toCents = (value) => Math.round(Number(value) * 100);

const formatDate = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

const annualScenarios = [
  { label: "Sem rendimento (0% a.a.)", rate: 0 },
  { label: "Hipótese ilustrativa (5% a.a.)", rate: 0.05 },
  { label: "Hipótese ilustrativa (8% a.a.)", rate: 0.08 },
];

function projectMonthlyDeposits(monthlyDeposit, annualRate, months) {
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (monthlyRate === 0) return monthlyDeposit * months;
  return monthlyDeposit * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function Investments() {
  const { transactions, getAllTransactions } = useContext(MyContext);
  const [movements, setMovements] = useState([]);
  const [movementType, setMovementType] = useState("contribution");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDate, setMovementDate] = useState(currentLocalDate);
  const [movementDescription, setMovementDescription] = useState("");
  const [movementLoading, setMovementLoading] = useState(true);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState("");
  const [movementSuccess, setMovementSuccess] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentLocalMonth);
  const [savingsRate, setSavingsRate] = useState(20);
  const [projectionYears, setProjectionYears] = useState(5);
  const requestIdRef = useRef(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("darkMode");
    document.body.classList.toggle(
      "dark-mode",
      storedTheme ? JSON.parse(storedTheme) : false,
    );
  }, []);

  useEffect(() => {
    let active = true;
    const loadMovements = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente.");
        setToken(`Bearer ${token}`);
        const response = await requestGet("/investments");
        if (active) setMovements(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (active) {
          setMovementError(
            error.response?.data?.message || error.message || "Não foi possível carregar os investimentos.",
          );
        }
      } finally {
        if (active) setMovementLoading(false);
      }
    };

    loadMovements();
    return () => {
      active = false;
    };
  }, []);

  const movementTotals = useMemo(
    () =>
      movements.reduce(
        (totals, movement) => {
          const amount = toCents(movement.amount);
          if (movement.type === "contribution") totals.contributions += amount;
          else totals.withdrawals += amount;
          return totals;
        },
        { contributions: 0, withdrawals: 0 },
      ),
    [movements],
  );
  const investmentBalanceCents =
    movementTotals.contributions - movementTotals.withdrawals;
  const availableAtMovementDateCents = movements.reduce((balance, movement) => {
    if (movement.date > movementDate) return balance;
    const amount = toCents(movement.amount);
    return balance + (movement.type === "contribution" ? amount : -amount);
  }, 0);
  const investmentChart = useMemo(() => {
    const chronologicalMovements = [...movements].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
    );
    if (!chronologicalMovements.length) return [];

    const byDate = new Map();
    chronologicalMovements.forEach((movement) => {
      const current = byDate.get(movement.date) || 0;
      const amount = toCents(movement.amount);
      byDate.set(
        movement.date,
        current + (movement.type === "contribution" ? amount : -amount),
      );
    });

    let balance = 0;
    const history = [...byDate.entries()].map(([date, dailyChange]) => {
      balance += dailyChange;
      return { date: formatDate(date), balance: balance / 100 };
    });
    const [firstYear, firstMonth, firstDay] = chronologicalMovements[0].date
      .split("-")
      .map(Number);
    const previousDay = new Date(firstYear, firstMonth - 1, firstDay - 1);
    history.unshift({
      date: new Intl.DateTimeFormat("pt-BR").format(previousDay),
      balance: 0,
    });
    return history;
  }, [movements]);

  const submitMovement = async (event) => {
    event.preventDefault();
    setMovementError("");
    setMovementSuccess("");

    const amount = Number(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(movementAmount)) {
      setMovementError("Informe um valor maior que zero, com no máximo duas casas decimais.");
      return;
    }
    if (!movementDate || movementDate > currentLocalDate()) {
      setMovementError("Informe uma data válida que não seja futura.");
      return;
    }
    if (
      movementType === "withdrawal" &&
      toCents(movementAmount) > availableAtMovementDateCents
    ) {
      setMovementError("O saque não pode ser maior que o saldo investido disponível.");
      return;
    }

    const requestSignature = JSON.stringify([
      movementType,
      Number(amount.toFixed(2)).toFixed(2),
      movementDate,
      movementDescription.trim(),
    ]);
    if (!requestIdRef.current || requestIdRef.current.signature !== requestSignature) {
      requestIdRef.current = {
        signature: requestSignature,
        id: window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente.");
      setToken(`Bearer ${token}`);
      setSavingMovement(true);
      const response = await requestPost("/investments", {
        type: movementType,
        amount: Number(amount.toFixed(2)).toFixed(2),
        date: movementDate,
        description: movementDescription.trim(),
        requestId: requestIdRef.current.id,
      });
      requestIdRef.current = null;
      setMovements(Array.isArray(response.data) ? response.data : []);
      setMovementAmount("");
      setMovementDescription("");
      setMovementSuccess(
        movementType === "contribution"
          ? "Aporte registrado com sucesso."
          : "Saque registrado com sucesso.",
      );
      try {
        await getAllTransactions();
      } catch {
        setMovementError("A movimentação foi registrada, mas o extrato não pôde ser atualizado. Atualize a página para sincronizá-lo.");
      }
    } catch (error) {
      setMovementError(
        error.response?.data?.message || error.message || "Não foi possível registrar a movimentação.",
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const monthlySalary = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            Number(transaction.typeId) === 1 &&
            transaction.isSalary === true &&
            transaction.status === true &&
            String(transaction.date || "").slice(0, 7) === selectedMonth,
        )
        .reduce((total, transaction) => total + parseAmount(transaction.value), 0),
    [transactions, selectedMonth],
  );

  const hasMarkedSalary = monthlySalary > 0;
  const suggestedMonthlyAmount = hasMarkedSalary
    ? (monthlySalary * savingsRate) / 100
    : 0;
  const projectionMonths = Number(projectionYears) * 12;

  return (
    <div className="investment-page">
      <Header />
      <main className="investment-content" id="main-content">
        <header className="investment-heading">
          <div>
            <p className="investment-eyebrow">Planejamento educativo</p>
            <h1>Investimentos</h1>
            <p>
              Acompanhe aportes e resgates no histórico de investimentos e no
              extrato. As projeções são educativas e não recomendam produtos.
            </p>
          </div>
          <span className="investment-heading-icon" aria-hidden="true">
            <FiTrendingUp />
          </span>
        </header>

        <section className="investment-panel movement-panel" aria-labelledby="movement-heading">
          <div className="investment-panel-heading">
            <div>
              <h2 id="movement-heading">Saldo investido e movimentações</h2>
              <p>
                Acompanhe aportes e saques registrados. O saldo é o total aportado
                menos os saques, sem considerar rendimento ou valor de mercado.
              </p>
            </div>
          </div>

          <div className="investment-summary-grid movement-summary-grid">
            <article className="investment-summary-card highlighted">
              <span>Saldo investido (aportes líquidos)</span>
              <strong>{formatCurrency(investmentBalanceCents / 100)}</strong>
              <small>Não representa cotação, rentabilidade nem valor de resgate.</small>
            </article>
            <article className="investment-summary-card">
              <span>Total aportado</span>
              <strong>{formatCurrency(movementTotals.contributions / 100)}</strong>
              <small>
                Saques registrados: {formatCurrency(movementTotals.withdrawals / 100)}
              </small>
            </article>
          </div>

          <form className="movement-form" onSubmit={submitMovement}>
            <h3>Registrar movimentação</h3>
            <div className="movement-form-grid">
              <label>
                Tipo
                <select
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value)}
                >
                  <option value="contribution">Aporte</option>
                  <option value="withdrawal">Saque</option>
                </select>
              </label>
              <label>
                Valor (R$)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="9999999999.99"
                  required
                  value={movementAmount}
                  onChange={(event) => setMovementAmount(event.target.value)}
                  placeholder="0,00"
                />
              </label>
              <label>
                Data
                <input
                  type="date"
                  required
                  max={currentLocalDate()}
                  value={movementDate}
                  onChange={(event) => setMovementDate(event.target.value)}
                />
              </label>
              <label className="movement-description">
                Descrição <span>(opcional)</span>
                <input
                  type="text"
                  maxLength="255"
                  value={movementDescription}
                  onChange={(event) => setMovementDescription(event.target.value)}
                  placeholder="Ex.: aporte mensal"
                />
              </label>
              <button className="movement-submit" type="submit" disabled={savingMovement}>
                {savingMovement
                  ? "Salvando..."
                  : movementType === "contribution"
                    ? "Registrar aporte"
                    : "Registrar saque"}
              </button>
            </div>
            {movementType === "withdrawal" && (
              <p className="movement-available">
                Disponível para saque nesta data:{" "}
                <strong>{formatCurrency(availableAtMovementDateCents / 100)}</strong>
              </p>
            )}
            {movementError && (
              <p className="movement-feedback error" role="alert">{movementError}</p>
            )}
            {movementSuccess && (
              <p className="movement-feedback success" role="status">{movementSuccess}</p>
            )}
          </form>

          <div className="movement-history">
            <h3>Histórico do saldo investido</h3>
            <p className="movement-chart-note">
              Evolução por data dos aportes líquidos registrados; não inclui valorização
              ou desvalorização dos ativos.
            </p>
            {movementLoading ? (
              <p role="status">Carregando movimentações...</p>
            ) : movementError && movements.length === 0 ? (
              <p className="movement-empty" role="status">
                O histórico não pôde ser carregado. {movementError}
              </p>
            ) : investmentChart.length ? (
              <div className="movement-chart" role="img" aria-label="Gráfico do saldo investido ao longo do tempo">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={investmentChart} margin={{ top: 12, right: 20, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e2e8f0)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--chart-text, #64748b)", fontSize: 12 }} />
                    <YAxis
                      width={86}
                      tick={{ fill: "var(--chart-text, #64748b)", fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), "Saldo investido"]}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{
                        backgroundColor: "var(--bg-card, #fff)",
                        borderColor: "var(--border, #e2e8f0)",
                        color: "var(--text-primary, #1e293b)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="Saldo investido"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="movement-empty">
                Ainda não há movimentações. Registre seu primeiro aporte para iniciar
                o histórico.
              </p>
            )}

            <h3 className="movement-list-heading">Movimentações registradas</h3>
            {movementLoading ? (
              <p>Carregando histórico...</p>
            ) : movements.length ? (
              <div className="movement-table-wrap">
                <table className="movement-table">
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Movimentação</th>
                      <th scope="col">Descrição</th>
                      <th scope="col">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{formatDate(movement.date)}</td>
                        <td>
                          <span className={`movement-kind ${movement.type}`}>
                            {movement.type === "contribution" ? (
                              <FiArrowDownLeft aria-hidden="true" />
                            ) : (
                              <FiArrowUpRight aria-hidden="true" />
                            )}
                            {movement.type === "contribution" ? "Aporte" : "Saque"}
                          </span>
                        </td>
                        <td>{movement.description || "—"}</td>
                        <td className={movement.type === "withdrawal" ? "withdrawal-value" : ""}>
                          {movement.type === "withdrawal" ? "− " : "+ "}
                          {formatCurrency(movement.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>

        <section className="investment-panel" aria-labelledby="salary-heading">
          <div className="investment-panel-heading">
            <div>
              <h2 id="salary-heading">Estimativa mensal</h2>
              <p>Selecione o mês para consultar as entradas marcadas como salário.</p>
            </div>
            <label className="investment-month">
              <span>Mês de referência</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </label>
          </div>

          {hasMarkedSalary ? (
            <>
              <div className="investment-summary-grid">
                <article className="investment-summary-card">
                  <span>Salários confirmados no mês</span>
                  <strong>{formatCurrency(monthlySalary)}</strong>
                  <small>Somente entradas marcadas como salário e confirmadas.</small>
                </article>
                <article className="investment-summary-card highlighted">
                  <span>Estimativa para guardar por mês</span>
                  <strong>{formatCurrency(suggestedMonthlyAmount)}</strong>
                  <small>
                    {savingsRate}% do total salarial marcado neste mês.
                  </small>
                </article>
              </div>

              <div className="investment-control">
                <label htmlFor="savings-rate">
                  Percentual usado na estimativa: <strong>{savingsRate}%</strong>
                </label>
                <input
                  id="savings-rate"
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={savingsRate}
                  onChange={(event) => setSavingsRate(Number(event.target.value))}
                  aria-describedby="savings-rate-help"
                />
                <small id="savings-rate-help">
                  É apenas um ponto de partida ajustável, não uma regra. Considere
                  despesas essenciais, dívidas e uma reserva adequada à sua realidade.
                </small>
              </div>

              <div className="projection-header">
                <div>
                  <h3>Projeções ilustrativas</h3>
                  <p>
                    Aportes mensais constantes de {formatCurrency(suggestedMonthlyAmount)}.
                  </p>
                </div>
                <label className="investment-horizon">
                  <span>Horizonte</span>
                  <select
                    value={projectionYears}
                    onChange={(event) => setProjectionYears(event.target.value)}
                  >
                    {[1, 3, 5, 10].map((years) => (
                      <option key={years} value={years}>
                        {years} {years === 1 ? "ano" : "anos"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="projection-table-wrap">
                <table className="projection-table">
                  <caption>
                    Valores estimados após {projectionYears}{" "}
                    {Number(projectionYears) === 1 ? "ano" : "anos"} ({projectionMonths} aportes mensais)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Premissa anual hipotética</th>
                      <th scope="col">Total aportado</th>
                      <th scope="col">Montante estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualScenarios.map((scenario) => (
                      <tr key={scenario.rate}>
                        <th scope="row">{scenario.label}</th>
                        <td>{formatCurrency(suggestedMonthlyAmount * projectionMonths)}</td>
                        <td>
                          {formatCurrency(
                            projectMonthlyDeposits(
                              suggestedMonthlyAmount,
                              scenario.rate,
                              projectionMonths,
                            ),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="projection-assumptions">
                <FiInfo aria-hidden="true" />
                Cálculo ilustrativo: depósitos iguais ao fim de cada mês, taxa anual
                convertida em taxa efetiva mensal e sem considerar impostos, tarifas,
                inflação, oscilações ou períodos sem aporte. As taxas de 5% e 8% são
                hipóteses matemáticas, não previsões nem promessas de retorno. O
                resultado real pode ser menor, inclusive negativo.
              </p>
            </>
          ) : (
            <div className="salary-empty-state" role="status">
              <FiInfo aria-hidden="true" />
              <div>
                <h3>Nenhum salário confirmado marcado neste mês</h3>
                <p>
                  Para evitar uma estimativa sem base, não exibimos valores de
                  recomendação nem projeções. Ao registrar uma entrada do tipo
                  Receita, marque <strong>“Esta entrada é salário”</strong> e confirme
                  a transação. Também é possível editar uma entrada já existente e
                  marcá-la. A descrição não é usada para identificar salário.
                </p>
                <Link to="/home#transactions" className="investment-action-link">
                  Abrir transações para marcar salário <FiArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="investment-tips" aria-labelledby="tips-heading">
          <div className="investment-tips-title">
            <FiShield aria-hidden="true" />
            <div>
              <h2 id="tips-heading">Dicas para planejar com cuidado</h2>
              <p>Informações gerais para apoiar suas decisões, sem recomendação individual.</p>
            </div>
          </div>
          <ul>
            <li>Priorize conhecer seu orçamento e manter uma reserva para imprevistos antes de assumir riscos.</li>
            <li>Compare liquidez, custos, impostos e riscos; rentabilidade passada não garante resultados futuros.</li>
            <li>Evite investir dinheiro de despesas próximas e desconfie de promessas de retorno garantido.</li>
          </ul>
          <p className="investment-disclaimer">
            Conteúdo educativo. As projeções não são garantia de desempenho e não
            substituem uma avaliação financeira individual.
          </p>
        </section>
      </main>
    </div>
  );
}

export default Investments;

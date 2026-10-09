import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowDownLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiInfo,
  FiShield,
  FiTrendingUp,
  FiEdit2,
  FiTrash2,
  FiX,
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
import {
  requestDelete,
  requestGet,
  requestPost,
  requestUpdate,
  setToken,
} from "../Services/request";
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

const getLocalDateKey = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  // Finance dates are calendar dates. Preserve their YYYY-MM-DD component
  // instead of letting UTC parsing shift them across a local month boundary.
  const datePrefix = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (datePrefix) {
    const [, year, month, day] = datePrefix;
    const date = new Date(0);
    date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
    if (
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() + 1 === Number(month) &&
      date.getUTCDate() === Number(day)
    ) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
};

const getMonthRange = (month) => {
  const match = String(month ?? "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return null;
  const [, year, monthNumber] = match;
  const nextMonthNumber = Number(monthNumber) === 12 ? 1 : Number(monthNumber) + 1;
  const nextYear = Number(monthNumber) === 12
    ? String(Number(year) + 1).padStart(4, "0")
    : year;
  const nextMonthKey = `${nextYear}-${String(nextMonthNumber).padStart(2, "0")}-01`;
  return { start: `${year}-${monthNumber}-01`, end: nextMonthKey };
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

const formatMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
};

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
  const location = useLocation();
  const navigate = useNavigate();
  const [movements, setMovements] = useState([]);
  const [movementType, setMovementType] = useState("contribution");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDate, setMovementDate] = useState(currentLocalDate);
  const [movementDescription, setMovementDescription] = useState("");
  const [movementLoading, setMovementLoading] = useState(true);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError] = useState("");
  const [movementSuccess, setMovementSuccess] = useState("");
  const [editingMovement, setEditingMovement] = useState(null);
  const [deletingMovementId, setDeletingMovementId] = useState(null);
  const [selectedMovementIds, setSelectedMovementIds] = useState([]);
  const [deletingSelectedMovements, setDeletingSelectedMovements] = useState(false);
  const [movementDeleteConfirmation, setMovementDeleteConfirmation] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentLocalMonth);
  const [savingsRate, setSavingsRate] = useState(20);
  const [projectionYears, setProjectionYears] = useState(5);
  const requestIdRef = useRef(null);
  const handledDashboardAction = useRef(null);

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

  const monthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const periodMovements = useMemo(
    () =>
      monthRange
        ? movements.filter((movement) => {
            const dateKey = getLocalDateKey(movement.date);
            return dateKey && dateKey >= monthRange.start && dateKey < monthRange.end;
          })
        : [],
    [movements, monthRange],
  );
  const periodMovementIds = useMemo(
    () => periodMovements.map((movement) => String(movement.id)),
    [periodMovements],
  );
  const allPeriodMovementsSelected =
    periodMovementIds.length > 0 &&
    periodMovementIds.every((id) => selectedMovementIds.includes(id));

  useEffect(() => {
    const visibleIds = new Set(periodMovementIds);
    setSelectedMovementIds((selectedIds) =>
      selectedIds.filter((id) => visibleIds.has(id)),
    );
  }, [periodMovementIds]);
  const periodMovementTotals = useMemo(
    () =>
      periodMovements.reduce(
        (totals, movement) => {
          const amount = toCents(movement.amount);
          if (movement.type === "contribution") totals.contributions += amount;
          else totals.withdrawals += amount;
          return totals;
        },
        { contributions: 0, withdrawals: 0 },
      ),
    [periodMovements],
  );
  const openingBalanceCents = movements.reduce((balance, movement) => {
    const dateKey = getLocalDateKey(movement.date);
    if (!monthRange || !dateKey || dateKey >= monthRange.start) return balance;
    const amount = toCents(movement.amount);
    return balance + (movement.type === "contribution" ? amount : -amount);
  }, 0);
  const closingBalanceCents =
    openingBalanceCents +
    periodMovementTotals.contributions -
    periodMovementTotals.withdrawals;
  const availableAtMovementDateCents = movements.reduce((balance, movement) => {
    const dateKey = getLocalDateKey(movement.date);
    if (
      !dateKey ||
      dateKey > movementDate ||
      (editingMovement && Number(movement.id) === Number(editingMovement.id))
    ) return balance;
    const amount = toCents(movement.amount);
    return balance + (movement.type === "contribution" ? amount : -amount);
  }, 0);
  const investmentChart = useMemo(() => {
    if (!monthRange) return [];
    const relevantMovements = movements.filter((movement) => {
      const dateKey = getLocalDateKey(movement.date);
      return dateKey && dateKey < monthRange.end;
    });
    if (!relevantMovements.length) return [];

    const chronologicalMovements = [...periodMovements].sort((a, b) => {
      const dateDifference =
        getLocalDateKey(a.date).localeCompare(getLocalDateKey(b.date));
      return dateDifference || Number(a.id) - Number(b.id);
    });

    const history = [{
      date: "Abertura do mês",
      balance: openingBalanceCents / 100,
    }];
    let balance = openingBalanceCents;
    chronologicalMovements.forEach((movement) => {
      const dateKey = getLocalDateKey(movement.date);
      const amount = toCents(movement.amount);
      balance += movement.type === "contribution" ? amount : -amount;
      history.push({ date: formatDate(dateKey), balance: balance / 100 });
    });
    return history;
  }, [movements, monthRange, periodMovements, openingBalanceCents]);

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

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente.");
      setToken(`Bearer ${token}`);
      setSavingMovement(true);
      const movementData = {
        type: movementType,
        amount: Number(amount.toFixed(2)).toFixed(2),
        date: movementDate,
        description: movementDescription.trim(),
      };
      const wasEditing = Boolean(editingMovement);
      let response;
      if (editingMovement) {
        response = await requestUpdate(`/investments/${editingMovement.id}`, movementData);
      } else {
        const requestSignature = JSON.stringify([
          movementType,
          movementData.amount,
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
        response = await requestPost("/investments", {
          ...movementData,
          requestId: requestIdRef.current.id,
        });
        requestIdRef.current = null;
      }
      setMovements(Array.isArray(response.data) ? response.data : []);
      setEditingMovement(null);
      setMovementAmount("");
      setMovementDescription("");
      setMovementSuccess(
        wasEditing
          ? "Movimentação atualizada com sucesso."
          : movementType === "contribution"
            ? "Aporte registrado com sucesso."
            : "Saque registrado com sucesso.",
      );
      try {
        await getAllTransactions();
      } catch {
        setMovementError("A movimentação foi salva, mas o extrato não pôde ser atualizado. Atualize a página para sincronizá-lo.");
      }
    } catch (error) {
      setMovementError(
        error.response?.data?.message || error.message || "Não foi possível registrar a movimentação.",
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const beginMovementEdit = useCallback((movement) => {
    setEditingMovement(movement);
    setMovementType(movement.type);
    setMovementAmount(String(movement.amount));
    setMovementDate(getLocalDateKey(movement.date) || currentLocalDate());
    setMovementDescription(movement.description || "");
    setMovementError("");
    setMovementSuccess("");
    document.querySelector(".movement-form")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, []);

  const cancelMovementEdit = useCallback(() => {
    setEditingMovement(null);
    setMovementType("contribution");
    setMovementAmount("");
    setMovementDate(currentLocalDate());
    setMovementDescription("");
    setMovementError("");
    setMovementSuccess("");
  }, []);

  const removeMovement = useCallback((movement) => {
    setMovementDeleteConfirmation({ type: "single", movement });
    setMovementError("");
    setMovementSuccess("");
  }, []);

  const toggleMovementSelection = (movementId) => {
    const id = String(movementId);
    setSelectedMovementIds((selectedIds) =>
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    );
  };

  const toggleAllPeriodMovements = () => {
    setSelectedMovementIds((selectedIds) =>
      allPeriodMovementsSelected
        ? selectedIds.filter((id) => !periodMovementIds.includes(id))
        : [...new Set([...selectedIds, ...periodMovementIds])],
    );
  };

  const removeSelectedMovements = async () => {
    const selectedCount = selectedMovementIds.length;
    if (!selectedCount) return;
    setMovementError("");
    setMovementSuccess("");
    setMovementDeleteConfirmation({
      type: "bulk",
      ids: [...selectedMovementIds],
    });
  };

  const confirmMovementDeletion = async () => {
    if (!movementDeleteConfirmation) return;
    const confirmation = movementDeleteConfirmation;
    setMovementError("");
    setMovementSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente.");
      setToken(`Bearer ${token}`);
      if (confirmation.type === "single") setDeletingMovementId(confirmation.movement.id);
      else setDeletingSelectedMovements(true);
      const response = confirmation.type === "single"
        ? await requestDelete(`/investments/${confirmation.movement.id}`)
        : await requestPost("/investments/bulk-delete", {
          ids: confirmation.ids.map(Number),
        });
      setMovements(Array.isArray(response.data) ? response.data : []);
      if (confirmation.type === "bulk") {
        setSelectedMovementIds([]);
        if (
          editingMovement &&
          confirmation.ids.includes(String(editingMovement.id))
        ) cancelMovementEdit();
      } else if (Number(editingMovement?.id) === Number(confirmation.movement.id)) {
        cancelMovementEdit();
      }
      setMovementDeleteConfirmation(null);
      setMovementSuccess(confirmation.type === "single"
        ? "Movimentação excluída e saldo sincronizado."
        : `${response.deleted ?? confirmation.ids.length} movimentação(ões) excluída(s); saldo e extrato sincronizados.`);
      try {
        await getAllTransactions();
      } catch {
        setMovementError("A movimentação foi excluída, mas o extrato não pôde ser atualizado. Atualize a página para sincronizá-lo.");
      }
    } catch (error) {
      setMovementError(
        error.response?.data?.message || error.message || "Não foi possível excluir a movimentação.",
      );
    } finally {
      setDeletingMovementId(null);
      setDeletingSelectedMovements(false);
    }
  };

  useEffect(() => {
    if (!movementDeleteConfirmation) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !deletingMovementId && !deletingSelectedMovements) {
        setMovementDeleteConfirmation(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [movementDeleteConfirmation, deletingMovementId, deletingSelectedMovements]);

  useEffect(() => {
    if (movementLoading) return;
    const editId = location.state?.editInvestmentMovementId;
    const deleteId = location.state?.deleteInvestmentMovementId;
    const actionId = editId || deleteId;
    if (!actionId) {
      handledDashboardAction.current = null;
      return;
    }

    const actionKey = `${editId ? "edit" : "delete"}:${actionId}`;
    if (handledDashboardAction.current === actionKey) return;
    handledDashboardAction.current = actionKey;
    navigate(location.pathname, { replace: true, state: null });

    const movement = movements.find(
      (item) => String(item.id) === String(actionId),
    );
    if (!movement) {
      setMovementError("A movimentação vinculada não foi encontrada no histórico de investimentos.");
      return;
    }

    const movementMonth = getLocalDateKey(movement.date)?.slice(0, 7);
    if (movementMonth) setSelectedMonth(movementMonth);
    if (editId) beginMovementEdit(movement);
    else removeMovement(movement);
  }, [
    beginMovementEdit,
    location,
    movementLoading,
    movements,
    navigate,
    removeMovement,
  ]);

  const monthlySalary = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            Number(transaction.typeId) === 1 &&
            transaction.isSalary === true &&
            transaction.status === true &&
            monthRange &&
            (() => {
              const dateKey = getLocalDateKey(transaction.date);
              return dateKey && dateKey >= monthRange.start && dateKey < monthRange.end;
            })(),
        )
        .reduce((total, transaction) => total + parseAmount(transaction.value), 0),
    [transactions, monthRange],
  );

  const hasMarkedSalary = monthlySalary > 0;
  const suggestedMonthlyAmount = hasMarkedSalary
    ? (monthlySalary * savingsRate) / 100
    : 0;
  const projectionMonths = Number(projectionYears) * 12;
  const selectedMonthLabel = monthRange ? formatMonth(selectedMonth) : "mês selecionado";

  return (
    <div className="investment-page">
      <Header />
      <main className="investment-content" id="main-content">
        {movementDeleteConfirmation && (
          <div
            className="movement-delete-overlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !deletingMovementId &&
                !deletingSelectedMovements
              ) setMovementDeleteConfirmation(null);
            }}
          >
            <section
              className="movement-delete-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="movement-delete-title"
              aria-describedby="movement-delete-description"
            >
              <div className="movement-delete-icon">
                <FiTrash2 aria-hidden="true" />
              </div>
              <p className="movement-delete-eyebrow">Confirme a exclusão</p>
              <h2 id="movement-delete-title">
                {movementDeleteConfirmation.type === "single"
                  ? "Excluir movimentação?"
                  : `Excluir ${movementDeleteConfirmation.ids.length} movimentações?`}
              </h2>
              <p id="movement-delete-description" className="movement-delete-description">
                {movementDeleteConfirmation.type === "single"
                  ? `O ${movementDeleteConfirmation.movement.type === "contribution" ? "aporte" : "saque"} de ${formatCurrency(movementDeleteConfirmation.movement.amount)} será removido do histórico.`
                  : "As movimentações selecionadas serão removidas do histórico."}
                {" "}A transação correspondente também será removida do saldo e do extrato.
              </p>
              {movementDeleteConfirmation.type === "single" && (
                <div className="movement-delete-summary">
                  <span>
                    {movementDeleteConfirmation.movement.type === "contribution" ? "Aporte" : "Saque"}
                  </span>
                  <strong>{formatCurrency(movementDeleteConfirmation.movement.amount)}</strong>
                  <small>{formatDate(getLocalDateKey(movementDeleteConfirmation.movement.date))}</small>
                </div>
              )}
              {movementError && (
                <p className="movement-delete-error" role="alert">{movementError}</p>
              )}
              <div className="movement-delete-actions">
                <button
                  type="button"
                  className="movement-delete-cancel"
                  onClick={() => {
                    setMovementDeleteConfirmation(null);
                    setMovementError("");
                  }}
                  disabled={Boolean(deletingMovementId) || deletingSelectedMovements}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="movement-delete-confirm"
                  onClick={confirmMovementDeletion}
                  disabled={Boolean(deletingMovementId) || deletingSelectedMovements}
                >
                  <FiTrash2 aria-hidden="true" />
                  {deletingMovementId || deletingSelectedMovements ? "Excluindo..." : "Excluir movimentação"}
                </button>
              </div>
            </section>
          </div>
        )}
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

        <div className="investment-period-filter">
          <p>
            O período selecionado atualiza o saldo, o histórico e a estimativa
            salarial.
          </p>
          <label className="investment-month">
            <span>Mês de referência</span>
            <input
              type="month"
              required
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </label>
        </div>

        <section className="investment-panel movement-panel" aria-labelledby="movement-heading">
          <div className="investment-panel-heading">
            <div>
              <h2 id="movement-heading">Saldo investido e movimentações</h2>
              <p>
                Movimentações de {selectedMonthLabel}. O saldo líquido considera
                aportes menos saques, sem valorização ou valor de mercado.
              </p>
            </div>
          </div>

          <div className="investment-summary-grid movement-summary-grid">
            <article className="investment-summary-card">
              <span>Saldo líquido de abertura</span>
              <strong>{formatCurrency(openingBalanceCents / 100)}</strong>
              <small>Saldo acumulado até o início do mês selecionado.</small>
            </article>
            <article className="investment-summary-card">
              <span>Aportes no mês</span>
              <strong>{formatCurrency(periodMovementTotals.contributions / 100)}</strong>
              <small>
                Saques no período: {formatCurrency(periodMovementTotals.withdrawals / 100)}
              </small>
            </article>
            <article className="investment-summary-card highlighted">
              <span>Saldo líquido ao fim do mês</span>
              <strong>{formatCurrency(closingBalanceCents / 100)}</strong>
              <small>
                Abertura + aportes − saques. Não representa cotação ou rentabilidade.
              </small>
            </article>
          </div>

          <form className="movement-form" onSubmit={submitMovement}>
            <h3>{editingMovement ? "Editar movimentação" : "Registrar movimentação"}</h3>
            {editingMovement && (
              <p className="movement-editing-note">
                A edição também atualiza a transação correspondente no saldo e no extrato.
              </p>
            )}
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
              <div className="movement-form-actions">
                <button
                  className="movement-submit"
                  type="submit"
                  disabled={
                    savingMovement ||
                    deletingMovementId !== null ||
                    deletingSelectedMovements
                  }
                >
                  {deletingSelectedMovements
                    ? "Excluindo..."
                    : deletingMovementId !== null
                    ? "Excluindo..."
                    : savingMovement
                    ? "Salvando..."
                    : editingMovement
                      ? "Salvar alterações"
                      : movementType === "contribution"
                        ? "Registrar aporte"
                        : "Registrar saque"}
                </button>
                {editingMovement && (
                  <button
                    className="movement-cancel"
                    type="button"
                    onClick={cancelMovementEdit}
                    disabled={
                      savingMovement ||
                      deletingMovementId !== null ||
                      deletingSelectedMovements
                    }
                  >
                    <FiX aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
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
              Saldo acumulado na abertura e após as movimentações de {selectedMonthLabel}.
              Aportes elevam o saldo e saques reduzem; não inclui valorização ou
              desvalorização dos ativos.
            </p>
            {movementLoading ? (
              <p role="status">Carregando movimentações...</p>
            ) : movementError && movements.length === 0 ? (
              <p className="movement-empty" role="status">
                O histórico não pôde ser carregado. {movementError}
              </p>
            ) : investmentChart.length ? (
              <div className="movement-chart" role="img" aria-label={`Gráfico do saldo investido em ${selectedMonthLabel}`}>
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
                      formatter={(value) => [formatCurrency(value), "Saldo líquido"]}
                      labelFormatter={(label) => label === "Abertura do mês" ? label : `Data: ${label}`}
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
                Não há saldo nem movimentações até {selectedMonthLabel}. Registre um
                aporte para iniciar o histórico.
              </p>
            )}

            <h3 className="movement-list-heading">Movimentações registradas</h3>
            {movementLoading ? (
              <p>Carregando histórico...</p>
            ) : periodMovements.length ? (
              <>
                <div className="movement-selection-toolbar">
                  <label className="movement-select-all">
                    <input
                      type="checkbox"
                      checked={allPeriodMovementsSelected}
                      onChange={toggleAllPeriodMovements}
                      aria-label={`Selecionar todas as movimentações de ${selectedMonthLabel}`}
                    />
                    <span>
                      {allPeriodMovementsSelected
                        ? "Desmarcar todas"
                        : "Selecionar todas do mês"}
                    </span>
                  </label>
                  {selectedMovementIds.length > 0 && (
                    <div className="movement-bulk-actions">
                      <span>
                        {selectedMovementIds.length} selecionada(s)
                      </span>
                      <button
                        className="movement-bulk-delete"
                        type="button"
                        onClick={removeSelectedMovements}
                        disabled={
                          deletingSelectedMovements ||
                          deletingMovementId !== null ||
                          savingMovement
                        }
                      >
                        <FiTrash2 aria-hidden="true" />
                        {deletingSelectedMovements
                          ? "Excluindo..."
                          : "Excluir selecionadas"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="movement-table-wrap">
                <table className="movement-table">
                  <thead>
                    <tr>
                      <th scope="col" className="movement-checkbox-cell">
                        <span className="sr-only">Selecionar</span>
                      </th>
                      <th scope="col">Data</th>
                      <th scope="col">Movimentação</th>
                      <th scope="col">Descrição</th>
                      <th scope="col">Valor</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="movement-checkbox-cell">
                          <input
                            type="checkbox"
                            checked={selectedMovementIds.includes(String(movement.id))}
                            onChange={() => toggleMovementSelection(movement.id)}
                            aria-label={`Selecionar ${movement.type === "contribution" ? "aporte" : "saque"} de ${formatCurrency(movement.amount)} em ${formatDate(movement.date)}`}
                            disabled={savingMovement || deletingSelectedMovements || deletingMovementId !== null}
                          />
                        </td>
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
                        <td className="movement-actions-cell">
                          <button
                            className="movement-row-action"
                            type="button"
                            aria-label={`Editar ${movement.type === "contribution" ? "aporte" : "saque"} de ${formatCurrency(movement.amount)}`}
                            title="Editar movimentação"
                            onClick={() => beginMovementEdit(movement)}
                            disabled={savingMovement || deletingMovementId !== null || deletingSelectedMovements}
                          >
                            <FiEdit2 aria-hidden="true" />
                          </button>
                          <button
                            className="movement-row-action danger"
                            type="button"
                            aria-label={`Excluir ${movement.type === "contribution" ? "aporte" : "saque"} de ${formatCurrency(movement.amount)}`}
                            title="Excluir movimentação"
                            onClick={() => removeMovement(movement)}
                            disabled={savingMovement || deletingMovementId !== null || deletingSelectedMovements}
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            ) : (
              <p className="movement-empty">
                Nenhuma movimentação registrada em {selectedMonthLabel}.
              </p>
            )}
          </div>
        </section>

        <section className="investment-panel" aria-labelledby="salary-heading">
          <div className="investment-panel-heading">
            <div>
              <h2 id="salary-heading">Estimativa mensal</h2>
              <p>
                Baseada exclusivamente em salários marcados e confirmados em{" "}
                {selectedMonthLabel}.
              </p>
            </div>
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
                    {Number(projectionYears) === 1 ? "ano" : "anos"} ({projectionMonths} aportes mensais),
                    a partir de {selectedMonthLabel}
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
                <Link to="/revenues" className="investment-action-link">
                  Abrir Receitas para registrar ou editar salário <FiArrowRight aria-hidden="true" />
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

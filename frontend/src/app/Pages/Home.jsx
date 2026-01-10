import { useState, useContext, useEffect, useMemo, useCallback } from "react";
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
  FiCalendar,
  FiSun,
  FiMoon,
  FiPrinter,
  FiBarChart2,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiExternalLink,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import Moment from "moment";
import Header from "../Components/Header";
import MyContext from "../Context/Context";
import ExportModal from "../Components/ExportModal";
import EditTransactionModal from "../Components/EditTransactionModal";

import "../Styles/Home.css";

function Home() {
  const {
    transactions,
    typesTransactions,
    amounts,
    getAllTransactions,
    recalculateAmounts,
  } = useContext(MyContext);

  useEffect(() => {
    recalculateAmounts();
  }, [transactions, recalculateAmounts]);

  // Estados
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalActive, setModalActive] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [timeRange, setTimeRange] = useState("month");
  const [chartView, setChartView] = useState("bar");

  // Junto com os outros estados (procure por: // Estados)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [transactionToView, setTransactionToView] = useState(null);

  // Estados para modais
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessTooltip, setShowSuccessTooltip] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  // Estados para edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Export modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Estados para countdown dos tooltips
  const [countdown, setCountdown] = useState(3);
  const [isTooltipClosing, setIsTooltipClosing] = useState(false);

  // Tema claro/escuro
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Estado para mostrar/ocultar valores
  const [showValues, setShowValues] = useState(true);

  const [transactionData, setTransactionData] = useState({
    value: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    status: true,
    typeId: 1,
  });

  // Efeito para tema
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ========== FUNÇÕES AUXILIARES ==========

  // Função para formatar moeda
  const formatCurrency = useCallback((value) => {
    const numValue =
      typeof value === "string"
        ? parseFloat(value.replace(/[^\d.-]/g, ""))
        : Number(value) || 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  }, []);

  // Função para formatar data em português
  const getFormattedDate = useCallback(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const formatted = formatter.format(new Date());
    return formatted.replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  // Funções auxiliares
  const getTypeIcon = useCallback((typeId) => {
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
  }, []);

  const getStatusIcon = useCallback((status) => {
    return status ? (
      <FiCheckCircle className="status-confirmed" />
    ) : (
      <FiClock className="status-pending" />
    );
  }, []);

  // ========== FUNÇÕES PARA DADOS DO GRÁFICO ==========

  // Funções auxiliares puras para manipulação de datas
  const extractDateOnly = useCallback((dateString) => {
    if (!dateString) return "";
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateString;
  }, []);

  const formatToYMD = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Formata Date para DD/MM (formato brasileiro)
  const formatToDM = useCallback((date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  }, []);

  // Formata Date para DD/MM com dia da semana (formato brasileiro)
  const formatToDayDM = useCallback((date) => {
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dayOfWeek = daysOfWeek[date.getDay()];
    return `${dayOfWeek} ${formatToDM(date)}`;
  }, []);

  const createLocalDate = useCallback((dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }, []);

  const getStartOfWeek = useCallback((date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getStartOfMonth = useCallback((date) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const addDays = useCallback((date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }, []);

  // Funções específicas para cada período
  const getWeekData = useCallback(
    (transactions, now) => {
      const startOfWeek = getStartOfWeek(now);
      const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      // Criar mapa para os 7 dias da semana
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(startOfWeek, i);
        return {
          key: `${daysOfWeek[i]} ${formatToDM(date)}`, // Formato: "Seg 08/01"
          date: new Date(date),
          data: { income: 0, expense: 0, investment: 0, total: 0, balance: 0 },
        };
      });

      // Filtrar transações da semana
      const weekTransactions = transactions.filter((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        return transDate >= startOfWeek && transDate < addDays(startOfWeek, 7);
      });

      // Agrupar por dia
      weekTransactions.forEach((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        const dayIndex = Math.floor(
          (transDate - startOfWeek) / (1000 * 60 * 60 * 24)
        );

        if (dayIndex >= 0 && dayIndex < 7) {
          const dayData = weekDays[dayIndex].data;
          const value = parseFloat(t.value) || 0;

          switch (t.typeId) {
            case 1:
              dayData.income += value;
              dayData.total += value;
              dayData.balance += value;
              break;
            case 2:
              dayData.expense += value;
              dayData.total -= value;
              dayData.balance -= value;
              break;
            case 3:
              dayData.investment += value;
              dayData.total += value;
              dayData.balance += value;
              break;
          }
        }
      });

      return weekDays.map((day) => ({
        name: day.key,
        total: Math.abs(day.data.total),
        income: day.data.income,
        expense: day.data.expense,
        investment: day.data.investment,
        balance: day.data.balance,
        date: day.date,
      }));
    },
    [getStartOfWeek, addDays, formatToDM, createLocalDate, extractDateOnly]
  );

  const getMonthData = useCallback(
    (transactions, now) => {
      const startOfMonth = getStartOfMonth(now);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);

      // Filtrar transações do mês
      const monthTransactions = transactions.filter((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        return transDate >= startOfMonth && transDate <= endOfMonth;
      });

      // Agrupar por semana do mês
      const weekGroups = Array.from({ length: weeksInMonth }, (_, i) => ({
        key: `Sem ${i + 1}`,
        data: { income: 0, expense: 0, investment: 0, total: 0, balance: 0 },
      }));

      monthTransactions.forEach((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        const dayOfMonth = transDate.getDate();
        const weekIndex = Math.ceil(dayOfMonth / 7) - 1;

        if (weekIndex >= 0 && weekIndex < weeksInMonth) {
          const weekData = weekGroups[weekIndex].data;
          const value = parseFloat(t.value) || 0;

          switch (t.typeId) {
            case 1:
              weekData.income += value;
              weekData.total += value;
              weekData.balance += value;
              break;
            case 2:
              weekData.expense += value;
              weekData.total -= value;
              weekData.balance -= value;
              break;
            case 3:
              weekData.investment += value;
              weekData.total += value;
              weekData.balance += value;
              break;
          }
        }
      });

      return weekGroups.map((week) => ({
        name: week.key,
        total: Math.abs(week.data.total),
        income: week.data.income,
        expense: week.data.expense,
        investment: week.data.investment,
        balance: week.data.balance,
      }));
    },
    [getStartOfMonth, createLocalDate, extractDateOnly]
  );

  const getYearData = useCallback(
    (transactions, now) => {
      const months = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      // Filtrar transações do ano
      const yearTransactions = transactions.filter((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        return transDate.getFullYear() === now.getFullYear();
      });

      // Agrupar por mês
      const monthGroups = months.map((month, index) => ({
        key: month,
        index,
        data: { income: 0, expense: 0, investment: 0, total: 0, balance: 0 },
      }));

      yearTransactions.forEach((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        const monthIndex = transDate.getMonth();

        if (monthIndex >= 0 && monthIndex < 12) {
          const monthData = monthGroups[monthIndex].data;
          const value = parseFloat(t.value) || 0;

          switch (t.typeId) {
            case 1:
              monthData.income += value;
              monthData.total += value;
              monthData.balance += value;
              break;
            case 2:
              monthData.expense += value;
              monthData.total -= value;
              monthData.balance -= value;
              break;
            case 3:
              monthData.investment += value;
              monthData.total += value;
              monthData.balance += value;
              break;
          }
        }
      });

      return monthGroups.map((month) => ({
        name: month.key,
        total: Math.abs(month.data.total),
        income: month.data.income,
        expense: month.data.expense,
        investment: month.data.investment,
        balance: month.data.balance,
      }));
    },
    [createLocalDate, extractDateOnly]
  );

  const getLast30DaysData = useCallback(
    (transactions, now) => {
      const thirtyDaysAgo = addDays(now, -29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // Filtrar transações dos últimos 30 dias
      const recentTransactions = transactions.filter((t) => {
        const transDate = createLocalDate(extractDateOnly(t.date));
        return transDate >= thirtyDaysAgo && transDate <= now;
      });

      // Criar mapa para os últimos 30 dias
      const dailyMap = new Map();

      for (let i = 0; i < 30; i++) {
        const date = addDays(now, -i);
        const dateKey = formatToYMD(date);
        const displayKey = formatToDM(date);

        dailyMap.set(dateKey, {
          key: displayKey, // Formato DD/MM
          date: new Date(date),
          data: { income: 0, expense: 0, investment: 0, total: 0, balance: 0 },
        });
      }

      // Agrupar por dia
      recentTransactions.forEach((t) => {
        const transDate = extractDateOnly(t.date);
        const dayData = dailyMap.get(transDate);

        if (dayData) {
          const value = parseFloat(t.value) || 0;

          switch (t.typeId) {
            case 1:
              dayData.data.income += value;
              dayData.data.total += value;
              dayData.data.balance += value;
              break;
            case 2:
              dayData.data.expense += value;
              dayData.data.total -= value;
              dayData.data.balance -= value;
              break;
            case 3:
              dayData.data.investment += value;
              dayData.data.total += value;
              dayData.data.balance += value;
              break;
          }
        }
      });

      // Converter para array, ordenar e pegar últimos 15 dias
      return Array.from(dailyMap.values())
        .map((day) => ({
          name: day.key,
          total: Math.abs(day.data.total),
          income: day.data.income,
          expense: day.data.expense,
          investment: day.data.investment,
          balance: day.data.balance,
          date: day.date,
        }))
        .sort((a, b) => a.date - b.date)
        .slice(-15); // Últimos 15 dias
    },
    [addDays, createLocalDate, extractDateOnly, formatToYMD, formatToDM]
  );

  // Função principal para dados do gráfico
  const getFilteredChartData = useMemo(() => {
    if (
      !transactions ||
      !Array.isArray(transactions) ||
      transactions.length === 0
    ) {
      return [];
    }

    const now = new Date();
    now.setHours(12, 0, 0, 0); // Normalizar para meio-dia

    try {
      switch (timeRange) {
        case "week":
          return getWeekData(transactions, now);

        case "month":
          return getMonthData(transactions, now);

        case "year":
          return getYearData(transactions, now);

        default: // "all" ou "Últimos 30 dias"
          return getLast30DaysData(transactions, now);
      }
    } catch (error) {
      console.error("Erro ao processar dados do gráfico:", error);
      return [];
    }
  }, [
    transactions,
    timeRange,
    getWeekData,
    getMonthData,
    getYearData,
    getLast30DaysData,
  ]);

  // Transformar transações para o gráfico de pizza
  const categoryData = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const totals = transactions.reduce(
      (acc, transaction) => {
        const typeId = transaction.typeId;
        const value = parseFloat(transaction.value) || 0;

        switch (typeId) {
          case 1:
            acc.income += value;
            break;
          case 2:
            acc.expense += value;
            break;
          case 3:
            acc.investment += value;
            break;
        }
        return acc;
      },
      { income: 0, expense: 0, investment: 0 }
    );

    const result = [
      totals.income > 0 && {
        name: "Receitas",
        value: totals.income,
        color: "#10b981",
      },
      totals.expense > 0 && {
        name: "Despesas",
        value: totals.expense,
        color: "#ef4444",
      },
      totals.investment > 0 && {
        name: "Investimentos",
        value: totals.investment,
        color: "#f59e0b",
      },
    ].filter(Boolean);

    return result.length > 0
      ? result
      : [{ name: "Sem dados", value: 1, color: "#e2e8f0" }];
  }, [transactions]);

  // ========== FUNÇÕES PARA CALCULAR DADOS REAIS ==========

  // Calcular dados detalhados para porcentagens
  const calculateTrendDetails = useMemo(() => {
    if (
      !transactions ||
      !Array.isArray(transactions) ||
      transactions.length === 0
    ) {
      return {
        income: { current: 0, previous: 0, percentage: 0, diff: 0 },
        expense: { current: 0, previous: 0, percentage: 0, diff: 0 },
        investment: { current: 0, previous: 0, percentage: 0, diff: 0 },
        balance: { current: 0, previous: 0, percentage: 0, diff: 0 },
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Mês atual
    const currentMonthData = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });

    // Mês passado
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthData = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      );
    });

    // Ano atual
    const currentYearData = transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === currentYear;
    });

    // Ano passado
    const lastYearData = transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === currentYear - 1;
    });

    // Função para calcular totais por tipo
    const calculateTotal = (data, typeId) => {
      return data
        .filter((t) => t.typeId === typeId)
        .reduce((acc, t) => acc + (parseFloat(t.value) || 0), 0);
    };

    // Calcular valores
    const currentIncome = calculateTotal(currentMonthData, 1);
    const previousIncome = calculateTotal(lastMonthData, 1);
    const currentExpense = calculateTotal(currentMonthData, 2);
    const previousExpense = calculateTotal(lastMonthData, 2);
    const currentInvestment = calculateTotal(currentYearData, 3);
    const previousInvestment = calculateTotal(lastYearData, 3);

    // Calcular saldos
    const calculateBalance = (data) => {
      return data.reduce((acc, t) => {
        const value = parseFloat(t.value) || 0;
        if (t.typeId === 1) return acc + value;
        if (t.typeId === 2) return acc - value;
        if (t.typeId === 3) return acc + value;
        return acc;
      }, 0);
    };

    const currentBalance = calculateBalance(currentMonthData);
    const previousBalance = calculateBalance(lastMonthData);

    // Calcular porcentagens
    const calculatePercentage = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const incomePercentage = calculatePercentage(currentIncome, previousIncome);
    const expensePercentage = calculatePercentage(
      currentExpense,
      previousExpense
    );
    const investmentPercentage = calculatePercentage(
      currentInvestment,
      previousInvestment
    );
    const balancePercentage = calculatePercentage(
      currentBalance,
      previousBalance
    );

    return {
      income: {
        current: currentIncome,
        previous: previousIncome,
        percentage: parseFloat(incomePercentage.toFixed(1)),
        diff: currentIncome - previousIncome,
      },
      expense: {
        current: currentExpense,
        previous: previousExpense,
        percentage: parseFloat(expensePercentage.toFixed(1)),
        diff: currentExpense - previousExpense,
      },
      investment: {
        current: currentInvestment,
        previous: previousInvestment,
        percentage: parseFloat(investmentPercentage.toFixed(1)),
        diff: currentInvestment - previousInvestment,
      },
      balance: {
        current: currentBalance,
        previous: previousBalance,
        percentage: parseFloat(balancePercentage.toFixed(1)),
        diff: currentBalance - previousBalance,
      },
    };
  }, [transactions]);

  // ========== COMPONENTE PERCENTAGE TOOLTIP ==========
  const PercentageTooltip = ({
    title,
    current,
    previous,
    diff,
    type = "default",
  }) => {
    const isPositive = type === "expense" ? diff <= 0 : diff >= 0;

    return (
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 1000,
          minWidth: "220px",
          opacity: 0,
          visibility: "hidden",
          transition: "all 0.3s ease",
          pointerEvents: "none",
          fontSize: "13px",
        }}
        className="percentage-tooltip-simple"
      >
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>{title}</strong>
          <FiInfo size={12} style={{ color: "var(--text-muted)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Este período:
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
              {formatCurrency(current)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Período anterior:
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>
              {formatCurrency(previous)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Diferença:</span>
            <span
              style={{
                color: isPositive ? "var(--income)" : "var(--expense)",
                fontWeight: "600",
              }}
            >
              {diff >= 0 ? "+" : ""}
              {formatCurrency(diff)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ========== FUNÇÕES PARA DADOS E FILTROS ==========

  // Calcular valores
  const parsedAmounts = useMemo(() => {
    const parseAmount = (amount) => {
      if (typeof amount === "object" && amount !== null && "amount" in amount) {
        return parseFloat(amount.amount) || 0;
      }
      return parseFloat(amount) || 0;
    };

    const income = amounts.length > 0 ? parseAmount(amounts[0]) : 0;
    const expense = amounts.length > 1 ? parseAmount(amounts[1]) : 0;
    const investment = amounts.length > 2 ? parseAmount(amounts[2]) : 0;
    const balance = income - expense + investment;

    return { income, expense, investment, balance };
  }, [amounts]);

  // Filtros de transações
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "income") return t.typeId === 1;
      if (activeFilter === "expense") return t.typeId === 2;
      if (activeFilter === "investment") return t.typeId === 3;
      return true;
    });
  }, [transactions, activeFilter]);

  // Calcular totais filtrados
  const filteredTotals = useMemo(() => {
    let total = 0;
    let incomeTotal = 0;
    let expenseTotal = 0;
    let investmentTotal = 0;

    filteredTransactions.forEach((t) => {
      const value = parseFloat(t.value) || 0;

      if (t.typeId === 1) {
        incomeTotal += value;
        total += value;
      } else if (t.typeId === 2) {
        expenseTotal += value;
        total -= value;
      } else if (t.typeId === 3) {
        investmentTotal += value;
        total += value;
      }
    });

    return { total, incomeTotal, expenseTotal, investmentTotal };
  }, [filteredTransactions]);

  // ========== FUNÇÕES DE CRUD ==========

  // Função de exclusão
  const deleteItem = async (endpoint, id) => {
    try {
      const url = `http://192.168.0.10:3001/${endpoint}/${id}`;

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

      setModalTitle("Sucesso!");
      setModalMessage("Transação excluída com sucesso!");
      setShowSuccessTooltip(true);
      setCountdown(3);
      setIsTooltipClosing(false);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setModalTitle("Erro");
      setModalMessage(`${error.message || "Falha ao excluir transação"}`);
      setShowErrorTooltip(true);
      setCountdown(3);
      setIsTooltipClosing(false);
    }
  };

  // Função para iniciar exclusão
  const startDelete = (transaction) => {
    setSelectedTransaction(transaction);
    setModalTitle("Confirmar Exclusão");
    setModalMessage(`Deseja realmente excluir "${transaction.description}"?`);
    setShowConfirmModal(true);
  };

  // Função para fechar tooltip com animação
  const closeTooltipWithAnimation = useCallback(() => {
    setIsTooltipClosing(true);
    setTimeout(() => {
      setShowSuccessTooltip(false);
      setShowErrorTooltip(false);
      setIsTooltipClosing(false);
      setCountdown(3);
    }, 300);
  }, []);

  // Efeito para o countdown dos tooltips
  useEffect(() => {
    if (
      (showSuccessTooltip || showErrorTooltip) &&
      countdown > 0 &&
      !isTooltipClosing
    ) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (
      (showSuccessTooltip || showErrorTooltip) &&
      countdown === 0 &&
      !isTooltipClosing
    ) {
      closeTooltipWithAnimation();
    }
  }, [
    showSuccessTooltip,
    showErrorTooltip,
    countdown,
    isTooltipClosing,
    closeTooltipWithAnimation,
  ]);

  // Salvar transação
  const saveTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar dados
      if (!transactionData.value || !transactionData.description) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const dataToSend = {
        ...transactionData,
        value: parseFloat(transactionData.value),
        typeId: parseInt(transactionData.typeId),
        // Mantém a data como YYYY-MM-DD (já está nesse formato do input date)
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

      setModalTitle("Sucesso!");
      setModalMessage("Transação criada com sucesso!");
      setShowSuccessTooltip(true);
      setCountdown(3);
      setIsTooltipClosing(false);

      await getAllTransactions();
    } catch (error) {
      setModalTitle("Erro");
      setModalMessage(`${error.message || "Falha ao criar transação"}`);
      setShowErrorTooltip(true);
      setCountdown(3);
      setIsTooltipClosing(false);
    } finally {
      setLoading(false);
    }
  };

  // Função de impressão
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .card { padding: 15px; border-radius: 8px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório Financeiro</h1>
          <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>
        <div class="cards">
          <div class="card">
            <h3>Saldo Total</h3>
            <p>${formatCurrency(parsedAmounts.balance)}</p>
          </div>
          <div class="card">
            <h3>Receitas</h3>
            <p>${formatCurrency(parsedAmounts.income)}</p>
          </div>
          <div class="card">
            <h3>Despesas</h3>
            <p>${formatCurrency(parsedAmounts.expense)}</p>
          </div>
          <div class="card">
            <h3>Investimentos</h3>
            <p>${formatCurrency(parsedAmounts.investment)}</p>
          </div>
        </div>
        <h2>Transações (${filteredTransactions.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions
              .map(
                (t) => `
              <tr>
                <td>${Moment(t.date).format("DD/MM/YYYY")}</td>
                <td>${t.description}</td>
                <td>${
                  t.typeId === 1
                    ? "Receita"
                    : t.typeId === 2
                    ? "Despesa"
                    : "Investimento"
                }</td>
                <td>${t.typeId === 2 ? "-" : "+"} ${formatCurrency(
                  t.value
                )}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Função para abrir modal de edição
  const handleEditClick = (transaction) => {
    setTransactionToEdit(transaction);
    setEditModalOpen(true);
  };

  const handleViewClick = (transaction) => {
    setTransactionToView(transaction);
    setViewModalOpen(true);
  };

  return (
    <div className="dashboard-container">
      <Header />

      {/* Botão de Tema */}
      <div className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? (
          <FiSun className="sun-icon" />
        ) : (
          <FiMoon className="moon-icon" />
        )}
      </div>

      <div className="dashboard-content">
        {/* Banner Welcome */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h1>Bem-vindo de volta! 👋</h1>
            <p>Gerencie suas finanças de forma inteligente</p>
            <div className="quick-stats">
              <span className="stat-item">
                <FiTrendingUp />{" "}
                {transactions.filter((t) => t.typeId === 1).length} receitas
              </span>
              <span className="stat-item">
                <FiTrendingDown />{" "}
                {transactions.filter((t) => t.typeId === 2).length} despesas
              </span>
              <span className="stat-item">
                <FiTarget /> {transactions.filter((t) => t.typeId === 3).length}{" "}
                investimentos
              </span>
            </div>
          </div>
          <div className="welcome-actions">
            <div className="date-info">
              <FiCalendar /> {getFormattedDate()}
            </div>
            <button
              className="btn-eye"
              onClick={() => setShowValues(!showValues)}
              title={showValues ? "Ocultar valores" : "Mostrar valores"}
            >
              {showValues ? <FiEye /> : <FiEyeOff />}
            </button>
          </div>
        </div>

        {/* Cards Resumo COM TOOLTIPS */}
        <div className="summary-cards">
          {/* Card Saldo Total - ATUALIZADO */}
          <div className="summary-card total-balance">
            <div className="card-header">
              <FiDollarSign className="card-icon" />
              <div>
                <h3>Saldo Total</h3>
                <span className="card-subtitle">Disponível</span>
              </div>
            </div>
            <div className="card-value">
              {showValues ? formatCurrency(parsedAmounts.balance) : "••••••"}
            </div>
            <div className="card-trend">
              <div className="trend-with-tooltip">
                <span
                  className={`trend ${
                    calculateTrendDetails.balance.diff >= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {calculateTrendDetails.balance.diff >= 0 ? (
                    <FiArrowUp />
                  ) : (
                    <FiArrowDown />
                  )}
                  {showValues
                    ? `${Math.abs(calculateTrendDetails.balance.percentage)}%`
                    : "•••"}{" "}
                  vs mês passado
                </span>
                <PercentageTooltip
                  title="Variação do Saldo"
                  current={calculateTrendDetails.balance.current}
                  previous={calculateTrendDetails.balance.previous}
                  diff={calculateTrendDetails.balance.diff}
                />
              </div>
            </div>
          </div>

          {/* Card Receitas - ATUALIZADO */}
          <div className="summary-card income-card">
            <div className="card-header">
              <FiTrendingUp className="card-icon" />
              <div>
                <h3>Receitas</h3>
                <span className="card-subtitle">Entradas</span>
              </div>
            </div>
            <div className="card-value">
              {showValues ? formatCurrency(parsedAmounts.income) : "••••••"}
            </div>
            <div className="card-trend">
              <div className="trend-with-tooltip">
                <span
                  className={`trend ${
                    calculateTrendDetails.income.diff >= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {calculateTrendDetails.income.diff >= 0 ? (
                    <FiArrowUp />
                  ) : (
                    <FiArrowDown />
                  )}
                  {showValues
                    ? `${Math.abs(calculateTrendDetails.income.percentage)}%`
                    : "•••"}{" "}
                  vs mês passado
                </span>
                <PercentageTooltip
                  title="Variação de Receitas"
                  current={calculateTrendDetails.income.current}
                  previous={calculateTrendDetails.income.previous}
                  diff={calculateTrendDetails.income.diff}
                />
              </div>
            </div>
          </div>

          {/* Card Despesas - ATUALIZADO */}
          <div className="summary-card expense-card">
            <div className="card-header">
              <FiTrendingDown className="card-icon" />
              <div>
                <h3>Despesas</h3>
                <span className="card-subtitle">Saídas</span>
              </div>
            </div>
            <div className="card-value">
              {showValues ? formatCurrency(parsedAmounts.expense) : "••••••"}
            </div>
            <div className="card-trend">
              <div className="trend-with-tooltip expense-tooltip">
                <span
                  className={`trend ${
                    calculateTrendDetails.expense.diff <= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {calculateTrendDetails.expense.diff <= 0 ? (
                    <FiArrowDown />
                  ) : (
                    <FiArrowUp />
                  )}
                  {showValues
                    ? `${calculateTrendDetails.expense.percentage}%`
                    : "•••"}{" "}
                  vs mês passado
                </span>
                <PercentageTooltip
                  title="Variação de Despesas"
                  current={calculateTrendDetails.expense.current}
                  previous={calculateTrendDetails.expense.previous}
                  diff={calculateTrendDetails.expense.diff}
                  type="expense"
                />
              </div>
            </div>
          </div>

          {/* Card Investimentos - ATUALIZADO */}
          <div className="summary-card investment-card">
            <div className="card-header">
              <FiTarget className="card-icon" />
              <div>
                <h3>Investimentos</h3>
                <span className="card-subtitle">Crescimento</span>
              </div>
            </div>
            <div className="card-value">
              {showValues ? formatCurrency(parsedAmounts.investment) : "••••••"}
            </div>
            <div className="card-trend">
              <div className="trend-with-tooltip">
                <span
                  className={`trend ${
                    calculateTrendDetails.investment.diff >= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {calculateTrendDetails.investment.diff >= 0 ? (
                    <FiArrowUp />
                  ) : (
                    <FiArrowDown />
                  )}
                  {showValues
                    ? `${Math.abs(
                        calculateTrendDetails.investment.percentage
                      )}%`
                    : "•••"}{" "}
                  vs ano passado
                </span>
                <PercentageTooltip
                  title="Variação de Investimentos"
                  current={calculateTrendDetails.investment.current}
                  previous={calculateTrendDetails.investment.previous}
                  diff={calculateTrendDetails.investment.diff}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="charts-section">
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>Fluxo Financeiro</h3>
                <span className="chart-subtitle">
                  {timeRange === "week"
                    ? "Esta semana"
                    : timeRange === "month"
                    ? "Este mês"
                    : timeRange === "year"
                    ? "Este ano"
                    : "Últimos 30 dias"}
                </span>
              </div>
              <div className="chart-controls">
                <div className="view-toggle">
                  <button
                    className={`view-btn ${
                      chartView === "bar" ? "active" : ""
                    }`}
                    onClick={() => setChartView("bar")}
                    title="Gráfico de barras"
                  >
                    <FiBarChart2 />
                  </button>
                  <button
                    className={`view-btn ${
                      chartView === "area" ? "active" : ""
                    }`}
                    onClick={() => setChartView("area")}
                    title="Gráfico de área"
                  >
                    <FiTrendingUp />
                  </button>
                  <button
                    className={`view-btn ${
                      chartView === "line" ? "active" : ""
                    }`}
                    onClick={() => setChartView("line")}
                    title="Gráfico de linha"
                  >
                    <FiTrendingDown />
                  </button>
                </div>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="chart-filter"
                >
                  <option value="week">Esta semana</option>
                  <option value="month">Este mês</option>
                  <option value="year">Este ano</option>
                  <option value="all">Últimos 30 dias</option>
                </select>
              </div>
            </div>

            <div className="chart-container">
              {getFilteredChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  {chartView === "bar" ? (
                    <BarChart data={getFilteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis
                        stroke="#64748b"
                        tickFormatter={(value) =>
                          showValues
                            ? `R$ ${value.toLocaleString("pt-BR", {
                                maximumFractionDigits: 0,
                              })}`
                            : "••••"
                        }
                      />
                      <RechartsTooltip
                        formatter={(value) =>
                          showValues
                            ? [formatCurrency(value), "Valor"]
                            : ["••••", "Valor"]
                        }
                        labelFormatter={(label) => `Período: ${label}`}
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        name="Total"
                      />
                    </BarChart>
                  ) : chartView === "area" ? (
                    <AreaChart data={getFilteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis
                        stroke="#64748b"
                        tickFormatter={(value) =>
                          showValues
                            ? `R$ ${value.toLocaleString("pt-BR", {
                                maximumFractionDigits: 0,
                              })}`
                            : "••••"
                        }
                      />
                      <RechartsTooltip
                        formatter={(value) =>
                          showValues
                            ? [formatCurrency(value), "Valor"]
                            : ["••••", "Valor"]
                        }
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        fill="#6366f1"
                        stroke="#6366f1"
                        fillOpacity={0.3}
                        name="Total"
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={getFilteredChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis
                        stroke="#64748b"
                        tickFormatter={(value) =>
                          showValues
                            ? `R$ ${value.toLocaleString("pt-BR", {
                                maximumFractionDigits: 0,
                              })}`
                            : "••••"
                        }
                      />
                      <RechartsTooltip
                        formatter={(value) =>
                          showValues
                            ? [formatCurrency(value), "Valor"]
                            : ["••••", "Valor"]
                        }
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Total"
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="no-chart-data">
                  <FiBarChart2 size={48} />
                  <p>Nenhum dado disponível para o período selecionado</p>
                </div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h3>Distribuição por Categoria</h3>
                <span className="chart-subtitle">Proporção dos gastos</span>
              </div>
            </div>
            <div className="chart-container">
              {categoryData.length > 0 &&
              categoryData[0].name !== "Sem dados" ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) =>
                          showValues
                            ? `${entry.name}: ${formatCurrency(entry.value)}`
                            : `${entry.name}: ••••••`
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
                      <RechartsTooltip
                        formatter={(value) =>
                          showValues ? formatCurrency(value) : "••••••"
                        }
                        labelFormatter={(name) => `Categoria: ${name}`}
                        contentStyle={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          color: "var(--text-primary)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {categoryData.map((item, index) => (
                      <div key={index} className="legend-item">
                        <span
                          className="legend-color"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span className="legend-label">{item.name}</span>
                        <span className="legend-value">
                          {showValues ? formatCurrency(item.value) : "••••••"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-chart-data">
                  <FiPieChart size={48} />
                  <p>Adicione transações para ver a distribuição</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Transações */}
        <div className="transactions-section">
          <div className="section-header">
            <div>
              <h2>Transações Recentes</h2>
              <span className="section-subtitle">
                {filteredTransactions.length} transações encontradas
              </span>
            </div>
            <div className="section-actions">
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${
                    activeFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("all")}
                  type="button"
                >
                  Todas ({transactions.length})
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "income" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("income")}
                  type="button"
                >
                  Receitas ({transactions.filter((t) => t.typeId === 1).length})
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "expense" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("expense")}
                  type="button"
                >
                  Despesas ({transactions.filter((t) => t.typeId === 2).length})
                </button>
                <button
                  className={`filter-btn ${
                    activeFilter === "investment" ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter("investment")}
                  type="button"
                >
                  Investimentos (
                  {transactions.filter((t) => t.typeId === 3).length})
                </button>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-secondary"
                  onClick={handlePrint}
                  type="button"
                >
                  <FiPrinter /> Imprimir
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setExportModalOpen(true)}
                  type="button"
                >
                  <FiDownload /> Exportar
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setModalActive(true)}
                  type="button"
                >
                  <FiPlus /> Nova Transação
                </button>
              </div>
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
                    type="button"
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
                          <h4>{transaction.description || "Sem descrição"}</h4>
                          <span className="transaction-date">
                            <FiCalendar />{" "}
                            {Moment(transaction.date).format("DD/MM/YYYY")}
                          </span>
                        </div>
                        <div className="transaction-amount">
                          <span
                            className={`amount ${
                              transaction.typeId === 2
                                ? "negative"
                                : transaction.typeId === 3
                                ? "investment"
                                : "positive"
                            }`}
                          >
                            {transaction.typeId === 2 ? "- " : "+ "}
                            {showValues
                              ? formatCurrency(transaction.value)
                              : "••••••"}
                          </span>
                          <span className="transaction-type">
                            {transaction.typeId === 1
                              ? "Receita"
                              : transaction.typeId === 2
                              ? "Despesa"
                              : "Investimento"}
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
                            onClick={() => handleEditClick(transaction)}
                            type="button"
                            aria-label="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => startDelete(transaction)}
                            type="button"
                            aria-label="Excluir"
                          >
                            <FiTrash2 />
                          </button>

                          <button
                            className="btn-icon btn-view"
                            onClick={() => handleViewClick(transaction)}
                            type="button"
                            aria-label="Visualizar"
                            title="Ver detalhes"
                          >
                            <FiEye />
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
              <div className="transactions-summary">
                <span className="summary-item">
                  <strong>Total:</strong>{" "}
                  {showValues ? formatCurrency(filteredTotals.total) : "••••••"}
                </span>
                <span className="summary-item">
                  <strong>Receitas:</strong>{" "}
                  {showValues
                    ? formatCurrency(filteredTotals.incomeTotal)
                    : "••••••"}
                </span>
                <span className="summary-item">
                  <strong>Despesas:</strong>{" "}
                  {showValues
                    ? formatCurrency(filteredTotals.expenseTotal)
                    : "••••••"}
                </span>
                <span className="summary-item">
                  <strong>Investimentos:</strong>{" "}
                  {showValues
                    ? formatCurrency(filteredTotals.investmentTotal)
                    : "••••••"}
                </span>
              </div>
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

      {/* Modal de Exportação */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        transactions={transactions}
        amounts={amounts}
        filters={{
          activeFilter,
          timeRange,
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      {showConfirmModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirmModal(false);
              setSelectedTransaction(null);
            }
          }}
        >
          <div className="modal-content modal-sm confirm-modal">
            <div className="modal-header">
              <h2>{modalTitle}</h2>
              <button
                className="btn-close"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedTransaction(null);
                }}
                type="button"
                aria-label="Fechar"
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
                          : selectedTransaction.typeId === 2
                          ? "negative"
                          : "investment"
                      }`}
                    >
                      {showValues
                        ? formatCurrency(selectedTransaction.value)
                        : "••••••"}
                    </span>
                  </div>
                  <div className="transaction-preview">
                    <span className="preview-label">Data:</span>
                    <span className="preview-value">
                      {Moment(selectedTransaction.date).format("DD/MM/YYYY")}
                    </span>
                  </div>
                  <div className="transaction-preview">
                    <span className="preview-label">Tipo:</span>
                    <span className="preview-value">
                      {selectedTransaction.typeId === 1
                        ? "Receita"
                        : selectedTransaction.typeId === 2
                        ? "Despesa"
                        : "Investimento"}
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
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  if (selectedTransaction) {
                    deleteItem("transactions", selectedTransaction.id);
                  }
                  setShowConfirmModal(false);
                  setSelectedTransaction(null);
                }}
                type="button"
              >
                <FiTrash2 /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip de Sucesso com Countdown */}
      {showSuccessTooltip && (
        <div
          className={`notification-tooltip success-tooltip ${
            isTooltipClosing ? "fade-out" : ""
          }`}
        >
          <div className="tooltip-content">
            <div className="tooltip-header">
              <FiCheckCircle size={20} color="#10b981" />
              <span>{modalTitle}</span>
              <button
                className="tooltip-close"
                onClick={closeTooltipWithAnimation}
                type="button"
                aria-label="Fechar"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="tooltip-body">
              <p className="tooltip-message">{modalMessage}</p>

              <div className="countdown-container">
                <div className="countdown-bar">
                  <div
                    className="countdown-progress"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  ></div>
                </div>
                <div className="countdown-text">
                  Fecha em:{" "}
                  <span className="countdown-number">{countdown}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip de Erro com Countdown */}
      {showErrorTooltip && (
        <div
          className={`notification-tooltip error-tooltip ${
            isTooltipClosing ? "fade-out" : ""
          }`}
        >
          <div className="tooltip-content">
            <div className="tooltip-header">
              <FiAlertCircle size={20} color="#ef4444" />
              <span>{modalTitle}</span>
              <button
                className="tooltip-close"
                onClick={closeTooltipWithAnimation}
                type="button"
                aria-label="Fechar"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="tooltip-body">
              <p className="tooltip-message">{modalMessage}</p>

              <div className="countdown-container">
                <div className="countdown-bar">
                  <div
                    className="countdown-progress"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  ></div>
                </div>
                <div className="countdown-text">
                  Fecha em:{" "}
                  <span className="countdown-number">{countdown}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Transação */}
      {modalActive && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalActive(false);
          }}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nova Transação</h2>
              <button
                className="btn-close"
                onClick={() => setModalActive(false)}
                type="button"
                aria-label="Fechar"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={saveTransaction} className="transaction-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="value">Valor (R$)*</label>
                  <input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
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
                  <label htmlFor="date">Data*</label>
                  <input
                    id="date"
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
                  <label htmlFor="type">Tipo*</label>
                  <select
                    id="type"
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
                  <label>Status*</label>
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
                <label htmlFor="description">Descrição*</label>
                <textarea
                  id="description"
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
                    loading ||
                    !transactionData.value ||
                    !transactionData.description
                  }
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Salvando...
                    </>
                  ) : (
                    "Salvar Transação"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTransactionToEdit(null);
        }}
        transaction={transactionToEdit}
        typesTransactions={typesTransactions}
        onUpdateSuccess={(message) => {
          setSuccessMessage(message);
          // Mostrar tooltip de sucesso (opcional)
          setModalTitle("Sucesso!");
          setModalMessage(message);
          setShowSuccessTooltip(true);
          setCountdown(3);
          setIsTooltipClosing(false);
        }}
      />

      {/* Modal de Visualização */}
      {viewModalOpen && transactionToView && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewModalOpen(false);
              setTransactionToView(null);
            }
          }}
        >
          <div className="modal-content modal-view">
            <div className="modal-header">
              <h2>Detalhes da Transação</h2>
              <button
                className="btn-close"
                onClick={() => {
                  setViewModalOpen(false);
                  setTransactionToView(null);
                }}
                type="button"
                aria-label="Fechar"
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body view-modal-body">
              <div className="transaction-header-view">
                <div className="transaction-icon-view">
                  {getTypeIcon(transactionToView.typeId)}
                </div>
                <div>
                  <h3>{transactionToView.description || "Sem descrição"}</h3>
                  <span className="transaction-type-view">
                    {transactionToView.typeId === 1
                      ? "Receita"
                      : transactionToView.typeId === 2
                      ? "Despesa"
                      : "Investimento"}
                  </span>
                </div>
              </div>

              <div className="transaction-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Valor</span>
                  <span
                    className={`detail-value ${
                      transactionToView.typeId === 2 ? "negative" : "positive"
                    }`}
                  >
                    {transactionToView.typeId === 2 ? "- " : "+ "}
                    {formatCurrency(transactionToView.value)}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Data</span>
                  <span className="detail-value">
                    {Moment(transactionToView.date).format("DD/MM/YYYY")}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span
                    className={`detail-value status-${
                      transactionToView.status ? "confirmed" : "pending"
                    }`}
                  >
                    {getStatusIcon(transactionToView.status)}
                    {transactionToView.status ? " Confirmado" : " Pendente"}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">ID</span>
                  <span className="detail-value id-value">
                    #{transactionToView.id}
                  </span>
                </div>
              </div>

              {transactionToView.notes && (
                <div className="transaction-notes">
                  <h4>Observações</h4>
                  <p>{transactionToView.notes}</p>
                </div>
              )}

              <div className="transaction-summary">
                <div className="summary-item">
                  <span>Criada em:</span>
                  <span>
                    {Moment(
                      transactionToView.createdAt || transactionToView.date
                    ).format("DD/MM/YYYY HH:mm")}
                  </span>
                </div>
                {transactionToView.updatedAt &&
                  transactionToView.updatedAt !==
                    transactionToView.createdAt && (
                    <div className="summary-item">
                      <span>Atualizada em:</span>
                      <span>
                        {Moment(transactionToView.updatedAt).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setViewModalOpen(false);
                  setTransactionToView(null);
                }}
                type="button"
              >
                Fechar
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  handleEditClick(transactionToView);
                  setViewModalOpen(false);
                }}
                type="button"
              >
                <FiEdit2 /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

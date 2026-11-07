import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import MyContext from "./Context";
import { API_BASE_URL } from "../Services/request";
import { apiFetch } from "../Services/apiFetch";
import { clearAuthSession, getStoredUser } from "../Services/authStorage";

function Provider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [typesTransactions, setTypesTransactions] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("darkMode") || "false");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ✅ 1. FUNÇÃO PARA CALCULAR AMOUNTS
  const calculateAmounts = useCallback((transactionsList) => {
    if (!Array.isArray(transactionsList) || transactionsList.length === 0) {
      return [
        { amount: "0.00", type: "RECIPES" },
        { amount: "0.00", type: "EXPENSES" },
        { amount: "0.00", type: "INVESTIMENTS" },
      ];
    }

    let recipes = 0;
    let expenses = 0;
    let investiments = 0;

    transactionsList.forEach((transaction) => {
      const value = parseFloat(transaction.value) || 0;

      if (transaction.typeId === 1) {
        recipes += value;
      } else if (transaction.typeId === 2) {
        expenses += value;
      } else if (transaction.typeId === 3) {
        investiments += value;
      }
    });

    const result = [
      {
        amount: recipes.toFixed(2),
        type: "RECIPES",
      },
      {
        amount: expenses.toFixed(2),
        type: "EXPENSES",
      },
      {
        amount: investiments.toFixed(2),
        type: "INVESTIMENTS",
      },
    ];
    return result;
  }, []);

  // ✅ 2. FUNÇÃO PARA RECALCULAR AMOUNTS
  const recalculateAmounts = useCallback(() => {
    const newAmounts = calculateAmounts(transactions);
    setAmounts(newAmounts);
    return newAmounts;
  }, [transactions, calculateAmounts]);

  // ✅ 3. FUNÇÃO PARA BUSCAR TRANSAÇÕES
  const getAllTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!getStoredUser()) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const response = await apiFetch(`${API_BASE_URL}/transactions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        clearAuthSession();
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      let transactionsData = [];

      if (data.error === false && data.data) {
        // Formato: { error: false, data: [...], count: X }
        transactionsData = data.data || [];
      } else if (data.error === false && data.message) {
        // Formato: { error: false, message: [...] }
        transactionsData = data.message || [];
      } else if (Array.isArray(data)) {
        // Formato: [...]
        transactionsData = data;
      } else {
        throw new Error("Formato de resposta inválido do servidor");
      }

      // Ordenar por data (mais recente primeiro)
      const sortedTransactions = [...transactionsData].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setTransactions(sortedTransactions);
      
      // ✅ Calcular amounts com as transações recebidas
      const calculatedAmounts = calculateAmounts(sortedTransactions);
      setAmounts(calculatedAmounts);
      return sortedTransactions;
      
    } catch (error) {
      console.error("Transaction load failed:", error.name);
      setError(error.message);
      const sessionExpired = (
        error.message.includes("401") ||
        error.message.includes("token") ||
        error.message.includes("Sessão") ||
        error.message.includes("autenticado") ||
        error.message.includes("não encontrado")
      );
      if (sessionExpired) {
        clearAuthSession();
        setTransactions([]);
        setAmounts(calculateAmounts([]));
      }

      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [API_BASE_URL, calculateAmounts]);

  // ✅ 4. FUNÇÃO PARA BUSCAR TIPOS
  const getAllTypes = useCallback(async () => {
    try {
      if (!getStoredUser()) {
        setTypesTransactions([]);
        return [];
      }

      const response = await apiFetch(`${API_BASE_URL}/types`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao buscar tipos`);
      }

      const data = await response.json();

      let typesData = [];

      if (data.error === false && data.message) {
        typesData = data.message;
      } else if (Array.isArray(data)) {
        typesData = data;
      } else {
        throw new Error("Formato de resposta inválido para tipos");
      }

      setTypesTransactions(typesData);
      return typesData;
    } catch (error) {
      console.error("Transaction type load failed:", error.name);
      return [];
    }
  }, [API_BASE_URL]);

  // ✅ 5. FUNÇÃO PARA CRIAR TRANSAÇÃO
  const createTransaction = useCallback(
    async (transactionData) => {
      try {
        setLoading(true);

        if (!getStoredUser()) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        const response = await apiFetch(`${API_BASE_URL}/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
        });

        if (response.status === 401) {
          clearAuthSession();
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const data = await response.json();

        // ✅ Recarrega as transações E recalcula amounts
        await getAllTransactions();
        
        return data;
      } catch (error) {
        console.error("Transaction creation failed:", error.name);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL, getAllTransactions]
  );

  const importTransactions = useCallback(
    async (transactionsBatch) => {
      if (!getStoredUser()) throw new Error("Sessão não encontrada. Faça login novamente.");

      const response = await apiFetch(`${API_BASE_URL}/transactions/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions: transactionsBatch }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuthSession();
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      if (!response.ok) {
        throw new Error(result.message || `Erro ${response.status} ao importar transações.`);
      }

      await getAllTransactions();
      return result;
    },
    [getAllTransactions]
  );

  // ✅ 6. FUNÇÃO PARA DELETAR TRANSAÇÃO
  const deleteTransaction = useCallback(
    async (id) => {
      try {
        setLoading(true);

        if (!getStoredUser()) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        const response = await apiFetch(`${API_BASE_URL}/transactions/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          clearAuthSession();
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const data = await response.json();

        // ✅ Recarrega as transações E recalcula amounts
        await getAllTransactions();
        


        return data;
      } catch (error) {
        console.error("Transaction deletion failed:", error.name);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL, getAllTransactions]
  );

  // ✅ 7. EFEITO INICIAL - CARREGAR DADOS
  useEffect(() => {
    const init = async () => {
      try {
        const user = getStoredUser();

        if (user) {
          await Promise.all([getAllTypes(), getAllTransactions()]);
        } else {
          setTypesTransactions([]);
          setTransactions([]);
          setAmounts(calculateAmounts([]));
        }
      } catch (error) {
        console.error("Financial data initialization failed:", error.name);
      }
    };

    init();
  }, [getAllTransactions, getAllTypes, calculateAmounts]);

  // ✅ 8. VALOR DO CONTEXT
  const contextValue = useMemo(
    () => ({
      transactions,
      setTransactions,
      getAllTransactions,
      createTransaction,
      importTransactions,
      deleteTransaction,
      typesTransactions,
      amounts,
      setAmounts,
      recalculateAmounts,
      initialized,
      loading,
      error,
      darkMode,
      setDarkMode,
      refreshTransactions: getAllTransactions,
    }),
    [
      transactions,
      getAllTransactions,
      createTransaction,
      importTransactions,
      deleteTransaction,
      typesTransactions,
      amounts,
      setAmounts,
      recalculateAmounts,
      initialized,
      loading,
      error,
      darkMode,
    ]
  );

  return (
    <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>
  );
}

Provider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Provider;
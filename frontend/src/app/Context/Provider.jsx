import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import MyContext from "./Context";
import { API_BASE_URL } from "../Services/request";

function Provider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [typesTransactions, setTypesTransactions] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ 1. FUNÇÃO PARA CALCULAR AMOUNTS
  const calculateAmounts = useCallback((transactionsList) => {
    console.log('🧮 Calculando amounts para:', transactionsList?.length || 0, 'transações');
    
    if (!Array.isArray(transactionsList) || transactionsList.length === 0) {
      console.log('📭 Nenhuma transação, retornando amounts zerados');
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
    
    console.log('💰 Resultado do cálculo:', result);
    return result;
  }, []);

  // ✅ 2. FUNÇÃO PARA RECALCULAR AMOUNTS
  const recalculateAmounts = useCallback(() => {
    console.log('🔄 Chamando recalculateAmounts()');
    const newAmounts = calculateAmounts(transactions);
    setAmounts(newAmounts);
    return newAmounts;
  }, [transactions, calculateAmounts]);

  // ✅ 3. FUNÇÃO PARA BUSCAR TRANSAÇÕES
  const getAllTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Context: Buscando transações...");

      const token = localStorage.getItem("token");

      if (!token) {
        console.error("❌ Token não encontrado no localStorage");
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      console.log("🔑 Token encontrado (primeiros 20 chars):", token.substring(0, 20) + "...");
      console.log(token);
      

      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📊 Response status:", response.status);

      if (response.status === 401) {
        console.warn("⚠️ Token expirado (401), limpando localStorage");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("📊 Dados brutos recebidos:", data);

      let transactionsData = [];

      if (data.error === false && data.data) {
        // Formato: { error: false, data: [...], count: X }
        transactionsData = data.data || [];
        console.log(`✅ Formato: {error: false, data: [...]} - ${transactionsData.length} itens`);
      } else if (data.error === false && data.message) {
        // Formato: { error: false, message: [...] }
        transactionsData = data.message || [];
        console.log(`✅ Formato: {error: false, message: [...]} - ${transactionsData.length} itens`);
      } else if (Array.isArray(data)) {
        // Formato: [...]
        transactionsData = data;
        console.log(`✅ Formato: array direto - ${transactionsData.length} itens`);
      } else {
        console.error("❌ Formato de resposta inválido:", data);
        throw new Error("Formato de resposta inválido do servidor");
      }

      // DEBUG: Mostrar user_id de cada transação
      if (transactionsData.length > 0) {
        console.log("👥 User IDs nas transações recebidas:");
        transactionsData.slice(0, 3).forEach((t, i) => {
          console.log(`   ${i + 1}. ID: ${t.id}, user_id: ${t.user_id}, desc: ${t.description?.substring(0, 30)}`);
        });
      }

      // Ordenar por data (mais recente primeiro)
      const sortedTransactions = [...transactionsData].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setTransactions(sortedTransactions);
      
      // ✅ Calcular amounts com as transações recebidas
      const calculatedAmounts = calculateAmounts(sortedTransactions);
      setAmounts(calculatedAmounts);
      
      console.log(`✅ Context: ${sortedTransactions.length} transações carregadas`);
      console.log('💰 Amounts calculados:', calculatedAmounts);

      return sortedTransactions;
      
    } catch (error) {
      console.error("❌ Context Erro ao buscar transações:", error.message);
      setError(error.message);
      
      // Limpa amounts em caso de erro
      const emptyAmounts = calculateAmounts([]);
      setAmounts(emptyAmounts);
      setTransactions([]);
      
      if (
        error.message.includes("401") ||
        error.message.includes("token") ||
        error.message.includes("Sessão") ||
        error.message.includes("autenticado") ||
        error.message.includes("não encontrado")
      ) {
        console.warn("⚠️ Erro de autenticação, limpando localStorage");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, calculateAmounts]);

  // ✅ 4. FUNÇÃO PARA BUSCAR TIPOS
  const getAllTypes = useCallback(async () => {
    try {
      console.log("🔍 Context: Buscando tipos de transação...");

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      };

      const response = await fetch(`${API_BASE_URL}/types`, {
        method: "GET",
        headers: headers,
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
      console.log(`✅ Context: ${typesData.length} tipos carregados`);

      return typesData;
    } catch (error) {
      console.error("❌ Context Erro ao buscar tipos:", error);
      return [];
    }
  }, [API_BASE_URL]);

  // ✅ 5. FUNÇÃO PARA CRIAR TRANSAÇÃO
  const createTransaction = useCallback(
    async (transactionData) => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        console.log("📤 Enviando transação:", transactionData);

        const response = await fetch(`${API_BASE_URL}/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transactionData),
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const data = await response.json();

        // ✅ Recarrega as transações E recalcula amounts
        await getAllTransactions();
        
        console.log("✅ Transação criada e dados atualizados");

        return data;
      } catch (error) {
        console.error("❌ Context Erro ao criar transação:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_BASE_URL, getAllTransactions]
  );

  // ✅ 6. FUNÇÃO PARA DELETAR TRANSAÇÃO
  const deleteTransaction = useCallback(
    async (id) => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        console.log(`🗑️ Deletando transação ID: ${id}`);

        const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const data = await response.json();

        // ✅ Recarrega as transações E recalcula amounts
        await getAllTransactions();
        
        console.log("✅ Transação deletada e dados atualizados");

        return data;
      } catch (error) {
        console.error("❌ Context Erro ao deletar transação:", error);
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
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        console.log("🚀 Context: Inicializando...");
        console.log("🔑 Token no localStorage:", token ? "EXISTE" : "NÃO EXISTE");
        console.log("👤 User no localStorage:", user ? "EXISTE" : "NÃO EXISTE");

        if (token && user) {
          console.log("✅ Token e user encontrados, carregando dados...");
          await getAllTypes();
          await getAllTransactions();
        } else {
          console.log("⚠️ Sem autenticação, carregando apenas tipos públicos");
          await getAllTypes();
          // Limpa dados de transações e amounts
          setTransactions([]);
          setAmounts(calculateAmounts([]));
        }
      } catch (error) {
        console.error("❌ Context Erro na inicialização:", error);
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
      deleteTransaction,
      typesTransactions,
      amounts,
      recalculateAmounts,
      loading,
      error,
      refreshTransactions: getAllTransactions,
    }),
    [
      transactions,
      getAllTransactions,
      createTransaction,
      deleteTransaction,
      typesTransactions,
      amounts,
      recalculateAmounts,
      loading,
      error,
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
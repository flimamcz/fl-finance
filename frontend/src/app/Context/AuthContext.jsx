// AuthContext.jsx - VERSÃO SIMPLIFICADA
import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext({});
import MyContext from "../Context/Context";


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

    const { setTransactions, setAmounts, getAllTransactions } =
      useContext(MyContext);

  // ✅ Função para verificar token
  const verifyToken = async (token) => {
    try {
      const response = await fetch("http://192.168.0.10:3001/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.error) {
        return { valid: false, user: null };
      }

      return { valid: true, user: data.user };
    } catch (error) {
      return { valid: false, user: null };
    }
  };

  // ✅ Carregar usuário ao iniciar
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        console.log('🔍 AuthContext: Verificando localStorage...');
        console.log('   Token encontrado:', token ? 'SIM' : 'NÃO');
        console.log('   User encontrado:', storedUser ? 'SIM' : 'NÃO');

        if (!token || !storedUser) {
          console.log('ℹ️ Nenhum usuário autenticado');
          setLoading(false);
          return;
        }

        // Verifica se token ainda é válido
        const verification = await verifyToken(token);

        if (verification.valid) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          console.log('✅ Usuário carregado:', userData.email);
        } else {
          console.log('⚠️ Token expirado, limpando...');
          logout();
        }
      } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ✅ Função de login SIMPLIFICADA
  const login = async (userData, token) => {
    console.log('🔑 AuthContext.login() chamado');
    console.log('   User ID:', userData.id);
    console.log('   Email:', userData.email);
    
    try {
      setTransactions([]); // Limpa transações antes de carregar novas
      // Verifica token (opcional, já foi verificado no Login.jsx)
      const verification = await verifyToken(token);
      
      if (!verification.valid) {
        throw new Error("Token inválido");
      }

      // ✅ Atualiza estado local (Login.jsx já salvou no localStorage)
      setUser(userData);
      
      console.log('✅ Estado atualizado, navegando para /home');
      getAllTransactions(); // Chama a função para obter todas as transações
      
      // Navega para home
      navigate("/home");
      
    } catch (error) {
      console.error('❌ Erro no authContext.login():', error);
      
      // Em caso de erro, limpa tudo
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      
      throw error;
    }
  };

  // ✅ Função de logout
  const logout = () => {
    console.log('🚪 AuthContext: Logout');
    
    // Limpa TUDO
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setTransactions([]) // Limpa transações ao deslogar
    setAmounts([]) // Reseta valores ao deslogar
    // Navega para login
    navigate("/login");
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
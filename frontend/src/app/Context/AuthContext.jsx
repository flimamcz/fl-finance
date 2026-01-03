// src/app/Context/AuthContext.jsx - ATUALIZADO
import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // ✅ FUNÇÃO PARA VERIFICAR TOKEN NO BACKEND
  const verifyToken = async (token) => {
    try {
      console.log('🔐 AuthContext: Verificando token no backend...');
      
      const response = await fetch('http://192.168.0.10:3001/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.error) {
        console.log('❌ Token inválido:', data.message);
        return { valid: false, user: null };
      }
      
      console.log('✅ Token válido! Usuário:', data.user?.email);
      return { valid: true, user: data.user };
      
    } catch (error) {
      console.error('❌ Erro na verificação do token:', error.message);
      return { valid: false, user: null };
    }
  };

  // ✅ ATUALIZADO: Carregar e VERIFICAR usuário ao iniciar
  useEffect(() => {
    const loadAndVerifyUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('🔍 AuthContext: Iniciando verificação...');
        
        if (!token || !storedUser) {
          console.log('ℹ️ Nenhum token ou usuário encontrado no storage');
          setLoading(false);
          return;
        }
        
        // ✅ VERIFICA TOKEN REAL NO BACKEND
        const verification = await verifyToken(token);
        
        if (verification.valid) {
          // ✅ Token válido - usa dados do backend (mais atualizados)
          setUser(verification.user);
          // Atualiza localStorage com dados frescos
          localStorage.setItem('user', JSON.stringify(verification.user));
          console.log('✅ Usuário autenticado e verificado:', verification.user.email);
        } else {
          // ❌ Token inválido - limpa tudo
          console.log('⚠️ Token inválido ou expirado, fazendo logout...');
          logout();
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar/verificar usuário:', error);
        // Em caso de erro, faz logout para segurança
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    loadAndVerifyUser();
  }, []);
  
  const login = async (userData, token) => {
    console.log('🔑 AuthContext: Login realizado para:', userData?.email);
    
    try {
      // ✅ VERIFICA O TOKEN RECÉM RECEBIDO
      const verification = await verifyToken(token);
      
      if (!verification.valid) {
        throw new Error('Token inválido após login');
      }
      
      // Salva no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Atualiza estado
      setUser(userData);
      
      // Navega para home
      navigate('/home');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      logout();
      throw error; // Propaga o erro para o Login.jsx mostrar
    }
  };
  
  const logout = () => {
    console.log('🚪 AuthContext: Logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyToken, // ✅ Exporta para usar em outros lugares
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
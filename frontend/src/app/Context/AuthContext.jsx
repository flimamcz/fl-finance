// src/app/Context/AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react'; // ✅ Adicione useEffect
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Novo state para loading
  const navigate = useNavigate();
  
  // ✅ NOVO: Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        console.log('🔍 AuthContext: Carregando dados do localStorage...');
        console.log('   Token:', token ? '✔️ Existe' : '❌ Não encontrado');
        console.log('   User:', userData ? '✔️ Existe' : '❌ Não encontrado');
        
        if (token && userData) {
          setUser(JSON.parse(userData));
          console.log('✅ AuthContext: Usuário carregado:', JSON.parse(userData).email);
        } else {
          console.log('ℹ️ AuthContext: Nenhum usuário autenticado no storage');
        }
      } catch (error) {
        console.error('❌ AuthContext: Erro ao carregar usuário:', error);
      } finally {
        setLoading(false);
        console.log('✅ AuthContext: Carregamento concluído');
      }
    };
    
    loadUserFromStorage();
  }, []);
  
  const login = (userData, token) => {
    console.log('🔑 AuthContext: Login realizado para:', userData?.email);
    
    // Salva no localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Atualiza estado
    setUser(userData);
    
    // Navega para home
    navigate('/home');
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
    loading, // ✅ Exporta loading
    login,
    logout,
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
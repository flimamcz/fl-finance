// src/app/Components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); // ✅ Pega loading do AuthContext
  const location = useLocation();

  // ✅ Mostra loading enquanto o AuthContext está carregando
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // ✅ Só redireciona se NÃO estiver autenticado E não estiver loading
  if (!isAuthenticated) {
    console.log('🔒 ProtectedRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // ✅ Se autenticado, renderiza o conteúdo
  console.log('✅ ProtectedRoute: Usuário autenticado, permitindo acesso');
  return children;
};

export default ProtectedRoute;
// src/app/Components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import '../Styles/Loading.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); // ✅ Pega loading do AuthContext
  const location = useLocation();

  // ✅ Mostra loading enquanto o AuthContext está carregando
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Carregando sua conta" className="loading-screen">
        <section className="auth-loading-shell">
          <div className="auth-loading-brand"><span className="auth-loading-mark">$</span><span>Fl Finance</span></div>
          <div className="auth-loading-heading">
            <span className="auth-loading-shimmer auth-loading-title" />
            <span className="auth-loading-shimmer auth-loading-subtitle" />
          </div>
          <div className="auth-loading-cards">
            <span className="auth-loading-shimmer" />
            <span className="auth-loading-shimmer" />
            <span className="auth-loading-shimmer" />
          </div>
          <div className="auth-loading-panel">
            <span className="auth-loading-shimmer auth-loading-line" />
            <span className="auth-loading-shimmer auth-loading-line short" />
            <div className="auth-loading-chart"><i /><i /><i /><i /><i /></div>
          </div>
          <p>Preparando suas informações financeiras...</p>
        </section>
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
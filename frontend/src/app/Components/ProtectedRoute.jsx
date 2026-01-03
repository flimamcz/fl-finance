// src/components/ProtectedRoute.jsx - VERSÃO COMPLETA
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Se não tem token, já rejeita
        if (!token) {
          setIsAuthenticated(false);
          setIsValidating(false);
          return;
        }

        // Opcional: Verificar token no backend
        // Se quiser fazer agora, descomente:
        /*
        const response = await fetch('http://192.168.0.10:3001/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Token inválido');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.message);
        }
        
        setIsAuthenticated(true);
        */
        
        // Por enquanto, só verifica se existe
        setIsAuthenticated(true);
        
      } catch (error) {
        console.error('❌ Validação falhou:', error.message);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

  // Mostrar loading enquanto valida
  if (isValidating) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  // Se não autenticado, redireciona para login
  if (!isAuthenticated) {
    console.log('🔒 Redirecionando para login...');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Se autenticado, renderiza o conteúdo
  return children;
};

export default ProtectedRoute;
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./app/Pages/Login";
import Home from "./app/Pages/Home";
import Profile from "./app/Pages/Profile";
import ProtectedRoute from "./app/Components/ProtectedRoute"; // Caminho correto

function App() {
  return (
    <Routes>
      {/* Rota raiz redireciona para home */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      
      {/* Rotas PÚBLICAS (acesso sem login) */}
      <Route path="/login" element={<Login />} />
      
      {/* Rotas PROTEGIDAS (requer autenticação) */}
      <Route path="/home" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      {/* Você pode adicionar mais rotas protegidas:
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/transactions" element={
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      } />
      */}
      
      {/* Rota 404 (opcional) */}
      <Route path="*" element={
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>404 - Página não encontrada</h1>
          <p>A página que você está procurando não existe.</p>
        </div>
      } />
    </Routes>
  );
}

export default App;
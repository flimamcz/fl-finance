// src/App.js
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./app/Context/AuthContext"; // NOVO IMPORT
import Login from "./app/Pages/Login";
import Home from "./app/Pages/Home";
import Profile from "./app/Pages/Profile";
import ProtectedRoute from "./app/Components/ProtectedRoute";

function App() {
  return (
    // APENAS ENVOLVA COM AuthProvider - NÃO MUDE NADA DENTRO
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
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
      </Routes>
    </AuthProvider>
  );
}

export default App;
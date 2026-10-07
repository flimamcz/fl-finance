// src/App.js
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./app/Context/AuthContext"; // NOVO IMPORT
import Login from "./app/Pages/Login";
import Register from "./app/Pages/Register";
import ForgotPassword from "./app/Pages/ForgotPassword";
import Home from "./app/Pages/Home";
import Profile from "./app/Pages/Profile";
import Debts from "./app/Pages/Debts";
import Investments from "./app/Pages/Investments";
import ProtectedRoute from "./app/Components/ProtectedRoute";

function App() {
  return (
    // APENAS ENVOLVA COM AuthProvider - NÃO MUDE NADA DENTRO
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
        <Route path="/debts" element={
          <ProtectedRoute>
            <Debts />
          </ProtectedRoute>
        } />
        <Route path="/investments" element={
          <ProtectedRoute>
            <Investments />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
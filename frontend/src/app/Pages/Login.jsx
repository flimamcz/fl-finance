// CORREÇÃO: Import correto do React Router v6
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../Styles/Login.css";

// Se não tiver react-icons, remova ou use alternativa:
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

// Componente de ícones alternativo (se não tiver react-icons)
// const FiMail = () => <span>📧</span>;
// const FiLock = () => <span>🔒</span>;
// const FiEye = () => <span>👁️</span>;
// const FiEyeOff = () => <span>👁️‍🗨️</span>;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Isso deve funcionar agora

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // TESTE: Login fake para testar navegação
      console.log("Login attempt:", { email, password });
      
      setTimeout(() => {
        // Qualquer email/senha vai funcionar para teste
        localStorage.setItem("token", "fake_token_" + Date.now());
        navigate("/home"); // Deve funcionar agora
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      setError("Erro: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo-icon">
            <div className="pig-logo">
              <div className="pig-ear"></div>
              <div className="pig-face"></div>
              <div className="pig-nose"></div>
              <div className="coin">$</div>
            </div>
          </div>
          <h1 className="app-title">FinFlow</h1>
          <p className="app-subtitle">Controle suas finanças</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Faça seu login</h2>
          
          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="input-group">
            <label htmlFor="email">
              <FiMail />
              <span>Email</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Senha */}
          <div className="input-group">
            <label htmlFor="password">
              <FiLock />
              <span>Senha</span>
            </label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {/* Link para cadastro */}
          <div className="register-link">
            <p>Não tem uma conta? <Link to="/register">Criar conta</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
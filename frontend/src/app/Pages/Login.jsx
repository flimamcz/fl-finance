// Login.jsx - VERSÃO CORRIGIDA (SALVA NO LOCALSTORAGE AQUI)
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiCheck, 
  FiAlertCircle,
  FiShield,
  FiLoader 
} from "react-icons/fi";
import { useAuth } from '../Context/AuthContext';
import "../Styles/Login.css";

function Login() {
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailValid, setEmailValid] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [particles, setParticles] = useState([]);

  // Gerar partículas para background
  useEffect(() => {
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2
    }));
    setParticles(newParticles);
  }, []);

  // Validar email em tempo real
  useEffect(() => {
    if (!email) {
      setEmailValid(null);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(email));
  }, [email]);

  // Calcular força da senha
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthColor = () => {
    switch(passwordStrength) {
      case 1: return '#ef4444';
      case 2: return '#f59e0b';
      case 3: return '#3b82f6';
      case 4: return '#10b981';
      default: return '#e5e7eb';
    }
  };

  const getPasswordStrengthText = () => {
    switch(passwordStrength) {
      case 1: return 'Fraco';
      case 2: return 'Médio';
      case 3: return 'Bom';
      case 4: return 'Forte';
      default: return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!emailValid) {
      setError("Por favor, insira um email válido");
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Tentando login para:', email);
      
      const response = await fetch('http://192.168.0.10:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message);
      }

      console.log('✅ Login bem-sucedido!');
      console.log('🔑 Token recebido:', data.token.substring(0, 20) + '...');
      console.log('👤 User ID recebido:', data.user.id);
      console.log('📧 Email recebido:', data.user.email);

      // ✅ ✅ ✅ **AQUI: PRIMEIRO SALVA NO LOCALSTORAGE**
      // getAllTransactions(); // Chama a função para obter todas as transações
      console.log('💾 Salvando no localStorage...');
      
      // 1. Limpa qualquer coisa anterior
      localStorage.clear();
      sessionStorage.clear();
      
      // 2. Espera um ciclo
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 3. Salva os NOVOS dados
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('💾 Token salvo no localStorage:', localStorage.getItem('token') ? 'SIM' : 'NÃO');
      console.log('💾 User salvo no localStorage:', localStorage.getItem('user') ? 'SIM' : 'NÃO');
      
      // 4. Espera mais um pouco
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 5. DEPOIS chama a função de login do context
      console.log('🚀 Chamando authContext.login()...');
      await login(data.user, data.token);
      
    } catch (err) {
      console.error('❌ Erro no login:', err);
      setError(err.message || "Erro ao fazer login");
      
      // Limpa se houver erro
      localStorage.clear();
      sessionStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background com partículas */}
      <div className="particles-bg">
        {particles.map(particle => (
          <div 
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${5 / particle.speed}s`
            }}
          />
        ))}
      </div>

      {/* Card de Login */}
      <div className="login-card">
        {/* Cabeçalho com Logo Animada */}
        <div className="logo-section">
          <div className="logo-animation">
            <div className="pig-logo">
              <div className="pig-body"></div>
              <div className="pig-ear left"></div>
              <div className="pig-ear right"></div>
              <div className="pig-eye left"></div>
              <div className="pig-eye right"></div>
              <div className="pig-nose"></div>
              <div className="pig-nostril left"></div>
              <div className="pig-nostril right"></div>
              <div className="coin">$</div>
            </div>
            <div className="money-flow">
              <div className="dollar-sign">$</div>
              <div className="dollar-sign">$</div>
              <div className="dollar-sign">$</div>
            </div>
          </div>
          <h1 className="app-title">
            <span className="title-gradient">FinFlow</span>
          </h1>
          <p className="app-subtitle">Controle financeiro inteligente</p>
          <div className="security-badge">
            <FiShield />
            <span>Conexão segura</span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="form-title">
            <span className="welcome-text">Bem-vindo de volta!</span>
          </h2>
          
          {/* Mensagem de Erro */}
          {error && (
            <div className="error-notification">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Email */}
          <div className={`input-group ${emailValid === false ? 'invalid' : ''} ${emailValid ? 'valid' : ''}`}>
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
              className={emailValid === false ? 'shake' : ''}
            />
            {emailValid && (
              <div className="validation-icon valid">
                <FiCheck />
              </div>
            )}
            {emailValid === false && (
              <div className="validation-icon invalid">
                <FiAlertCircle />
              </div>
            )}
          </div>

          {/* Campo Senha */}
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
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            
            {/* Indicador de força da senha */}
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{
                      width: `${passwordStrength * 25}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }}
                  />
                </div>
                <span className="strength-text">
                  {getPasswordStrengthText()}
                </span>
              </div>
            )}
          </div>

          {/* Lembrar-me */}
          <div className="remember-me">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Lembrar-me</label>
          </div>

          {/* Botão de Login */}
          <button 
            type="submit" 
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <FiLoader className="spinner" />
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>

          {/* Links */}
          <div className="form-footer">
            <Link to="/forgot-password" className="forgot-password">
              Esqueceu a senha?
            </Link>
            <div className="register-link">
              <span>Novo por aqui?</span>
              <Link to="/register" className="register-cta">
                Criar conta gratuita
              </Link>
            </div>
          </div>

          {/* Divisor */}
          <div className="divider">
            <span>ou</span>
          </div>

          {/* Login Social */}
          <div className="social-login">
            <button type="button" className="social-btn google">
              <svg className="social-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continuar com Google</span>
            </button>
          </div>
        </form>
      </div>

      {/* Toast de sucesso */}
      {loading && (
        <div className="success-toast">
          <div className="toast-content">
            <FiCheck />
            <span>Login realizado com sucesso!</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
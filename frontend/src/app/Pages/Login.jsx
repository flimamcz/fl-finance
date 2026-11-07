// Login.jsx - VERSÃO CORRIGIDA (SALVA NO LOCALSTORAGE AQUI)
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiCheck, 
  FiAlertCircle,
  FiShield,
  FiLoader,
  FiTrendingUp,
} from "react-icons/fi";
import { API_BASE_URL } from '../Services/request';
import { apiFetch } from "../Services/apiFetch";
import {
  getRememberMe,
  saveAuthSession,
} from "../Services/authStorage";
import "../Styles/Login.css";

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com"];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(getRememberMe);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [particles, setParticles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/auth/setup-status`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.setupRequired) navigate("/setup", { replace: true });
      })
      .catch(() => {
        // Login remains available if setup-status cannot be reached.
      });
  }, [navigate]);

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
    
    if (!email.trim()) {
      setError("Informe seu usuário ou email");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: email.trim(), password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || `Erro ${response.status} ao entrar.`);
      }

      const sessionResponse = await apiFetch(`${API_BASE_URL}/auth/verify`, { cache: "no-store" });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || session.error) {
        throw new Error("O navegador bloqueou o cookie de sessão. Habilite cookies de terceiros ou use domínios próprios para o app e a API.");
      }

      saveAuthSession(
        session.csrfToken || data.csrfToken,
        { ...data.user, ...session.user },
        rememberMe
      );
      window.location.replace('/home');
      
    } catch (err) {
      console.error("Login failed:", err.name);
      setError(err.message || "Erro ao fazer login");
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container login-page">
      <div className="login-backdrop" aria-hidden="true">
        <span className="ambient-orb ambient-orb-one" />
        <span className="ambient-orb ambient-orb-two" />
        <span className="ambient-orb ambient-orb-three" />
        <span className="ambient-grid" />
      </div>
      <div className="particles-bg" aria-hidden="true">
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

      <div className="login-layout">
        <aside className="login-brand">
          <div className="brand-heading">
            <div className="brand-mark" aria-hidden="true"><FiTrendingUp /></div>
            <span className="brand-name">FinFlow</span>
          </div>

          <div className="brand-copy">
            <span className="brand-eyebrow">SEU DINHEIRO, EM EQUILÍBRIO</span>
            <h1>Mais clareza para suas <span>conquistas.</span></h1>
            <p>Organize sua vida financeira e acompanhe o que realmente importa, em um só lugar.</p>
          </div>

          <div className="brand-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-chart">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="visual-caption"><FiTrendingUp /><span>Seu próximo passo começa aqui</span></div>
          </div>

          <div className="brand-security"><FiShield /><span>Seus dados protegidos com segurança</span></div>
        </aside>

        <section className="login-card login-page-card" aria-labelledby="login-heading">
          <form onSubmit={handleSubmit} className="login-form">
          <div className="form-intro">
            <span className="form-kicker">BEM-VINDO DE VOLTA</span>
            <h2 id="login-heading" className="form-title"><span className="welcome-text">Acesse sua conta</span></h2>
            <p>Entre para continuar cuidando das suas finanças.</p>
          </div>
          
          {/* Mensagem de Erro */}
          {error && (
            <div className="error-notification" role="alert">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Email */}
          <div className="input-group">
            <label htmlFor="login-identifier">
              <FiMail />
              <span>Usuário ou email</span>
            </label>
            <input
              id="login-identifier"
              type="text"
              placeholder="Seu usuário ou email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              list="email-domain-suggestions"
              aria-describedby="login-identifier-hint"
            />
            {email.includes("@") && (
              <datalist id="email-domain-suggestions">
                {EMAIL_DOMAINS
                  .filter((domain) => domain.startsWith(email.split("@")[1].toLowerCase()))
                  .map((domain) => (
                    <option key={domain} value={`${email.split("@")[0]}@${domain}`} />
                  ))}
              </datalist>
            )}
            <small id="login-identifier-hint" className="field-hint">
              Você pode entrar com seu usuário ou email.
            </small>
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
                autoComplete="current-password"
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
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
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
        </section>
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
    </main>
  );
}

export default Login;
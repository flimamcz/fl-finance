import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiLock, FiMail, FiShield, FiUser } from "react-icons/fi";
import { API_BASE_URL } from "../Services/request";
import "../Styles/Login.css";

function Register() {
  const [formData, setFormData] = useState({ fullname: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 15 }, (_, id) => ({
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
    })));
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: formData.fullname.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || "Não foi possível criar sua conta.");
      }

      setRecoveryCode(data.recoveryCode);
      setSuccess("Conta criada com sucesso! Guarde seu código de recuperação.");
    } catch (requestError) {
      setError(requestError.message || "Erro ao criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="particles-bg">
        {particles.map((particle) => (
          <div key={particle.id} className="particle" style={{ left: `${particle.x}%`, top: `${particle.y}%`, width: `${particle.size}px`, height: `${particle.size}px`, animationDuration: `${5 / particle.speed}s` }} />
        ))}
      </div>

      <div className="login-card">
        <div className="logo-section">
          <div className="logo-animation">
            <div className="pig-logo">
              <div className="pig-body" />
              <div className="pig-ear left" />
              <div className="pig-ear right" />
              <div className="pig-eye left" />
              <div className="pig-eye right" />
              <div className="pig-nose" />
              <div className="pig-nostril left" />
              <div className="pig-nostril right" />
              <div className="coin">$</div>
            </div>
            <div className="money-flow">
              <div className="dollar-sign">$</div>
              <div className="dollar-sign">$</div>
              <div className="dollar-sign">$</div>
            </div>
          </div>
          <h1 className="app-title"><span className="title-gradient">FinFlow</span></h1>
          <p className="app-subtitle">Controle financeiro inteligente</p>
          <div className="security-badge"><FiShield /><span>Crie sua conta segura</span></div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="form-title"><span className="welcome-text">Comece agora!</span></h2>
          {error && <div className="error-notification"><FiAlertCircle /><span>{error}</span></div>}
          {success && <div className="success-notification"><FiCheck /><span>{success}</span></div>}
          {recoveryCode && <div className="recovery-code"><span>Seu código de recuperação</span><strong>{recoveryCode}</strong><small>Você precisará dele para redefinir sua senha.</small></div>}

          <div className="input-group">
            <label htmlFor="fullname"><FiUser /><span>Nome completo</span></label>
            <input id="fullname" name="fullname" value={formData.fullname} onChange={handleChange} placeholder="Seu nome" required autoComplete="name" />
          </div>
          <div className="input-group">
            <label htmlFor="register-email"><FiMail /><span>Email</span></label>
            <input id="register-email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required autoComplete="email" />
          </div>
          <div className="input-group">
            <label htmlFor="register-password"><FiLock /><span>Senha</span></label>
            <div className="password-input">
              <input id="register-password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Mínimo de 6 caracteres" required autoComplete="new-password" />
              <button type="button" className="toggle-password" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password"><FiLock /><span>Confirme sua senha</span></label>
            <div className="password-input">
              <input id="confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Repita sua senha" required autoComplete="new-password" />
              <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}>{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button>
            </div>
          </div>
          {!recoveryCode && <button className={`login-button ${loading ? "loading" : ""}`} type="submit" disabled={loading || !formData.fullname || !formData.email || !formData.password || !formData.confirmPassword}>
            {loading ? "Criando conta..." : "Criar minha conta"}
          </button>}
          <div className="form-footer">
            <div className="register-link"><span>{recoveryCode ? "Sua conta está pronta." : "Já possui uma conta?"}</span><Link to="/login" className="register-cta">Entrar</Link></div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;

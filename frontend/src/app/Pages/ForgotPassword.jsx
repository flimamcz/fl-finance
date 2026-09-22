import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiEye, FiEyeOff, FiKey, FiLock, FiMail, FiShield } from "react-icons/fi";
import { API_BASE_URL } from "../Services/request";
import "../Styles/Login.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 15 }, (_, id) => ({
      id, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1, speed: Math.random() * 0.5 + 0.2,
    })));
  }, []);

  const requestCodeHint = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.message || "Não foi possível iniciar a recuperação.");
      setHint(data.hint);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Digite o código com 6 números.");
    if (newPassword.length < 6) return setError("A nova senha deve ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.message || "Não foi possível redefinir a senha.");
      setSuccess("Senha redefinida com sucesso! Redirecionando...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="particles-bg">{particles.map((particle) => <div key={particle.id} className="particle" style={{ left: `${particle.x}%`, top: `${particle.y}%`, width: `${particle.size}px`, height: `${particle.size}px`, animationDuration: `${5 / particle.speed}s` }} />)}</div>
      <div className="login-card">
        <div className="logo-section">
          <div className="logo-animation"><div className="pig-logo"><div className="pig-body" /><div className="pig-ear left" /><div className="pig-ear right" /><div className="pig-eye left" /><div className="pig-eye right" /><div className="pig-nose" /><div className="pig-nostril left" /><div className="pig-nostril right" /><div className="coin">$</div></div><div className="money-flow"><div className="dollar-sign">$</div><div className="dollar-sign">$</div><div className="dollar-sign">$</div></div></div>
          <h1 className="app-title"><span className="title-gradient">FinFlow</span></h1>
          <p className="app-subtitle">Recupere o acesso à sua conta</p>
          <div className="security-badge"><FiShield /><span>Recuperação segura</span></div>
        </div>

        <form className="login-form" onSubmit={hint ? resetPassword : requestCodeHint}>
          <h2 className="form-title"><span className="welcome-text">Esqueceu sua senha?</span></h2>
          {error && <div className="error-notification"><FiAlertCircle /><span>{error}</span></div>}
          {success && <div className="success-notification"><FiCheck /><span>{success}</span></div>}

          <div className="input-group"><label htmlFor="forgot-email"><FiMail /><span>Email</span></label><input id="forgot-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setHint(""); setError(""); }} placeholder="seu@email.com" required disabled={Boolean(hint)} /></div>

          {!hint ? <button className={`login-button ${loading ? "loading" : ""}`} type="submit" disabled={loading || !email}>{loading ? "Verificando..." : "Continuar"}</button> : <>
            <div className="recovery-hint"><FiKey /><span>Seu código começa com <strong>{hint.slice(0, 2)}</strong> e termina com <strong>{hint.slice(-1)}</strong>.</span></div>
            <div className="input-group"><label htmlFor="recovery-code"><FiKey /><span>Código de 6 números</span></label><input id="recovery-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" required /></div>
            <div className="input-group"><label htmlFor="new-password"><FiLock /><span>Nova senha</span></label><div className="password-input"><input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><button type="button" className="toggle-password" onClick={() => setShowPassword((visible) => !visible)} aria-label="Mostrar ou ocultar senha">{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></div>
            <div className="input-group"><label htmlFor="confirm-new-password"><FiLock /><span>Confirme a nova senha</span></label><div className="password-input"><input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><button type="button" className="toggle-password" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label="Mostrar ou ocultar senha">{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button></div></div>
            <button className={`login-button ${loading ? "loading" : ""}`} type="submit" disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</button>
          </>}
          <div className="form-footer"><div className="register-link"><Link to="/login" className="register-cta">Voltar para o login</Link></div></div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiLock, FiMail, FiUser } from "react-icons/fi";
import { API_BASE_URL } from "../Services/request";
import { saveAuthSession } from "../Services/authStorage";
import "../Styles/Login.css";

function AccountSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingUsers, setExistingUsers] = useState(false);
  const [error, setError] = useState("");
  const [createdAccount, setCreatedAccount] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/setup-status`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.setupRequired) navigate("/login", { replace: true });
        setExistingUsers(Boolean(data.existingUsers));
      })
      .catch(() => setError("Não foi possível verificar se a configuração inicial está disponível."))
      .finally(() => setChecking(false));
  }, [navigate]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < (existingUsers ? 6 : 8)) {
      setError(`A senha deve ter pelo menos ${existingUsers ? 6 : 8} caracteres.`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.message || "Não foi possível concluir a configuração.");
      }
      setCreatedAccount(data);
    } catch (requestError) {
      setError(requestError.message || "Erro ao concluir a configuração.");
    } finally {
      setLoading(false);
    }
  };

  const enterApp = () => {
    saveAuthSession(createdAccount.token, createdAccount.user, true);
    window.location.replace("/home");
  };

  return (
    <div className="login-container">
      <div className="auth-glow auth-glow-one" aria-hidden="true" />
      <div className="auth-glow auth-glow-two" aria-hidden="true" />
      <div className="login-card">
        <div className="logo-section">
          <h1 className="app-title"><span className="title-gradient">FinFlow</span></h1>
          <p className="app-subtitle">Configuração segura da sua conta</p>
          <div className="security-badge"><FiLock /><span>Primeiro acesso</span></div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2 className="form-title">
            <span className="welcome-text">
              {existingUsers ? "Ativar conta administradora" : "Criar conta administradora"}
            </span>
          </h2>
          <p className="setup-description">
            {existingUsers
              ? "Entre com o email e a senha da sua conta atual para defini-la como administradora."
              : "Este cadastro único ativa o aplicativo. Escolha um usuário, email e senha para o administrador."}
          </p>
          {error && <div className="error-notification" role="alert"><FiAlertCircle /><span>{error}</span></div>}

          {createdAccount ? (
            <div className="setup-complete">
              <div className="success-notification" role="status">
                <FiCheck />
                <span>{existingUsers ? "Sua conta agora é administradora." : "Conta administradora criada."}</span>
              </div>
              <div className="recovery-code">
                <span>Guarde seu código de recuperação</span>
                <strong>{createdAccount.recoveryCode}</strong>
                <small>Este código será mostrado apenas agora.</small>
              </div>
              <button type="button" className="login-button" onClick={enterApp}>Entrar no FinFlow</button>
            </div>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="setup-username"><FiUser /><span>{existingUsers ? "Novo usuário" : "Usuário"}</span></label>
                <input id="setup-username" name="username" value={form.username} onChange={handleChange} placeholder="Ex.: maria.silva" minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]{3,30}" title="Use de 3 a 30 letras, números, pontos, hífens ou sublinhados." required autoComplete="username" />
              </div>
              <div className="input-group">
                <label htmlFor="setup-email"><FiMail /><span>{existingUsers ? "Email da conta" : "Email"}</span></label>
                <input id="setup-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required autoComplete="email" />
              </div>
              <div className="input-group">
                <label htmlFor="setup-password"><FiLock /><span>{existingUsers ? "Senha atual da conta" : "Senha"}</span></label>
                <input id="setup-password" name="password" type="password" value={form.password} onChange={handleChange} minLength={existingUsers ? 6 : 8} required autoComplete={existingUsers ? "current-password" : "new-password"} />
              </div>
              <div className="input-group">
                <label htmlFor="setup-confirm-password"><FiLock /><span>{existingUsers ? "Confirme a senha atual" : "Confirme a senha"}</span></label>
                <input id="setup-confirm-password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} minLength={existingUsers ? 6 : 8} required autoComplete={existingUsers ? "current-password" : "new-password"} />
              </div>
              <button className={`login-button ${loading ? "loading" : ""}`} type="submit" disabled={loading || checking}>
                {loading ? "Configurando..." : checking ? "Verificando..." : existingUsers ? "Ativar administrador" : "Criar administrador"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default AccountSetup;

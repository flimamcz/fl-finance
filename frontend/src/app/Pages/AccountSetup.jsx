import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiLock,
  FiMail,
  FiShield,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
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
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 15 }, (_, id) => ({
        id,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
      }))
    );
  }, []);

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
    <main className="login-container login-page setup-page">
      <div className="login-backdrop" aria-hidden="true">
        <span className="ambient-orb ambient-orb-one" />
        <span className="ambient-orb ambient-orb-two" />
        <span className="ambient-orb ambient-orb-three" />
        <span className="ambient-grid" />
      </div>
      <div className="particles-bg" aria-hidden="true">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${5 / particle.speed}s`,
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
            <h1>Comece com uma base <span>segura.</span></h1>
            <p>Configure o acesso administrador para proteger e organizar suas finanças em um só lugar.</p>
          </div>

          <div className="brand-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-chart">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="visual-caption"><FiShield /><span>Uma configuração, mais controle</span></div>
          </div>

          <div className="brand-security"><FiShield /><span>Seus dados protegidos com segurança</span></div>
        </aside>

        <section className="login-card login-page-card setup-page-card" aria-labelledby="setup-heading">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-intro">
              <span className="form-kicker">CONFIGURAÇÃO INICIAL</span>
              <h2 id="setup-heading" className="form-title">
                <span className="welcome-text">
                  {createdAccount
                    ? "Acesso configurado"
                    : existingUsers ? "Ativar administrador" : "Criar administrador"}
                </span>
              </h2>
              <p>
                {createdAccount
                  ? "Seu acesso está pronto. Guarde o código de recuperação antes de continuar."
                  : existingUsers
                    ? "Confirme os dados da conta existente para ativar o acesso administrador."
                    : "Crie a conta que será usada para administrar seu FinFlow."}
              </p>
            </div>

            {error && (
              <div className="error-notification" role="alert">
                <FiAlertCircle /><span>{error}</span>
              </div>
            )}

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
        </section>
      </div>
    </main>
  );
}

export default AccountSetup;

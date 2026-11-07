import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import { API_BASE_URL } from "../Services/request";
import { apiFetch } from "../Services/apiFetch";
import "../Styles/Login.css";

function Register() {
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [particles, setParticles] = useState([]);
  const navigate = useNavigate();

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

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

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
      const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: formData.fullname.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || "Não foi possível criar sua conta.");
      }

      setRecoveryCode(data.recoveryCode);
    } catch (requestError) {
      setError(requestError.message || "Erro ao criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container login-page register-page">
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
            <div className="brand-mark" aria-hidden="true">
              <FiTrendingUp />
            </div>
            <span className="brand-name">FinFlow</span>
          </div>

          <div className="brand-copy">
            <span className="brand-eyebrow">SEU DINHEIRO, EM EQUILÍBRIO</span>
            <h1>Um novo jeito de cuidar <span>do seu futuro.</span></h1>
            <p>
              Organize sua vida financeira e acompanhe o que realmente importa,
              em um só lugar.
            </p>
          </div>

          <div className="brand-visual" aria-hidden="true">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-chart">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="visual-caption">
              <FiTrendingUp />
              <span>Seu próximo passo começa aqui</span>
            </div>
          </div>

          <div className="brand-security">
            <FiShield />
            <span>Seus dados protegidos com segurança</span>
          </div>
        </aside>

        <section
          className="login-card login-page-card register-page-card"
          aria-labelledby="register-heading"
        >
          <form onSubmit={handleSubmit} className="login-form register-form">
            <div className="form-intro">
              <span className="form-kicker">COMECE COM O PÉ DIREITO</span>
              <h2 id="register-heading" className="form-title">
                <span className="welcome-text">
                  {recoveryCode ? "Conta criada!" : "Crie sua conta"}
                </span>
              </h2>
              <p>
                {recoveryCode
                  ? "Guarde seu código de recuperação em um lugar seguro."
                  : "Seus planos financeiros começam por aqui."}
              </p>
            </div>

            {error && (
              <div className="error-notification" role="alert">
                <FiAlertCircle />
                <span>{error}</span>
              </div>
            )}

            {recoveryCode && (
              <div className="recovery-code" role="status">
                <span>Seu código de recuperação</span>
                <strong>{recoveryCode}</strong>
                <small>Você precisará dele para redefinir sua senha.</small>
              </div>
            )}

            {!recoveryCode && (
              <>
                <div className="input-group">
                  <label htmlFor="fullname">
                    <FiUser /><span>Nome completo</span>
                  </label>
                  <input
                    id="fullname"
                    name="fullname"
                    value={formData.fullname}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="register-username">
                    <FiUser /><span>Usuário</span>
                  </label>
                  <input
                    id="register-username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Ex.: maria.silva"
                    minLength={3}
                    maxLength={30}
                    pattern="[A-Za-z0-9._-]{3,30}"
                    title="Use de 3 a 30 letras, números, pontos, hífens ou sublinhados."
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="register-email">
                    <FiMail /><span>Email</span>
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="register-password">
                    <FiLock /><span>Senha</span>
                  </label>
                  <div className="password-input">
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo de 6 caracteres"
                      minLength={6}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="confirm-password">
                    <FiLock /><span>Confirme sua senha</span>
                  </label>
                  <div className="password-input">
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repita sua senha"
                      minLength={6}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <button
                  className={`login-button ${loading ? "loading" : ""}`}
                  type="submit"
                  disabled={
                    loading ||
                    !formData.fullname ||
                    !formData.username ||
                    !formData.email ||
                    !formData.password ||
                    !formData.confirmPassword
                  }
                >
                  {loading ? "Criando conta..." : "Criar minha conta"}
                </button>
              </>
            )}

            <div className="form-footer">
              <div className="register-link">
                <span>{recoveryCode ? "Sua conta está pronta." : "Já possui uma conta?"}</span>
                <Link to="/login" className="register-cta">Entrar</Link>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default Register;

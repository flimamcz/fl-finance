import { useState } from "react";
import { Link } from "react-router-dom";
import { FiShield, FiUserPlus } from "react-icons/fi";
import { API_BASE_URL } from "../Services/request";
import "../Styles/FirstAdminSetup.css";

function FirstAdminSetup() {
  const [form, setForm] = useState({
    token: "",
    fullname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/first-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Bootstrap-Token": form.token,
        },
        credentials: "omit",
        body: JSON.stringify({
          fullname: form.fullname,
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.message || "Não foi possível criar o administrador.");

      setForm((current) => ({
        ...current,
        token: "",
        password: "",
        confirmPassword: "",
      }));
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message || "Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="first-admin">
      <section className="first-admin__card" aria-labelledby="first-admin-title">
        <div className="first-admin__icon" aria-hidden="true"><FiShield /></div>
        <p className="first-admin__eyebrow">CONFIGURAÇÃO PROTEGIDA</p>
        <h1 id="first-admin-title">Criar primeiro administrador</h1>
        <p className="first-admin__intro">
          Este formulário só funciona enquanto a configuração inicial estiver aberta e com a chave temporária do servidor.
        </p>

        {success ? (
          <div className="first-admin__success" role="status">
            <p>{success}</p>
            <Link to="/login" className="first-admin__button">Ir para o login</Link>
          </div>
        ) : (
          <form className="first-admin__form" onSubmit={submit}>
            <label>
              Chave temporária do Render
              <input name="token" type="password" autoComplete="off" value={form.token} onChange={update} required minLength={32} />
            </label>
            <label>
              Nome completo
              <input name="fullname" autoComplete="name" value={form.fullname} onChange={update} required minLength={2} maxLength={100} />
            </label>
            <label>
              Usuário
              <input name="username" autoComplete="username" value={form.username} onChange={update} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._\\-]+" />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />
            </label>
            <label>
              Senha
              <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} required minLength={12} />
              <small>Use pelo menos 12 caracteres.</small>
            </label>
            <label>
              Confirme a senha
              <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update} required minLength={12} />
            </label>
            {error && <p className="first-admin__error" role="alert">{error}</p>}
            <button type="submit" className="first-admin__button" disabled={loading}>
              <FiUserPlus aria-hidden="true" />
              {loading ? "Criando..." : "Criar administrador"}
            </button>
          </form>
        )}
        {!success && (
          <p className="first-admin__footnote">
            A chave é enviada somente no cabeçalho da requisição. Após criar o administrador, remova-a das variáveis do Render.
          </p>
        )}
      </section>
    </main>
  );
}

export default FirstAdminSetup;

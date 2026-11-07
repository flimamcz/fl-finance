import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUnlock,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Header from "../Components/Header";
import { useAuth } from "../Context/AuthContext";
import { apiFetch } from "../Services/apiFetch";
import { API_BASE_URL } from "../Services/request";
import "../Styles/Admin.css";

const PAGE_SIZE = 20;

const formatDate = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(date));
};

function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, blocked: 0, admins: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        q: query.trim(),
        status,
      });
      const response = await apiFetch(`${API_BASE_URL}/admin/users?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.message || "Não foi possível carregar a lista de usuários.");
      }
      setUsers(result.users);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (requestError) {
      setError(requestError.message || "Falha ao carregar o painel administrativo.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    const timeout = window.setTimeout(loadUsers, query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadUsers, query]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!user?.isAdmin) return <Navigate to="/home" replace />;

  const updateBlockStatus = async (targetUser) => {
    const blocked = !targetUser.isBlocked;
    const action = blocked ? "bloquear" : "desbloquear";
    if (!window.confirm(`Confirma ${action} a conta de ${targetUser.fullname}?`)) return;

    setActionUserId(targetUser.id);
    setError("");
    setNotice("");
    try {
      const endpoint = blocked ? "block" : "unblock";
      const response = await apiFetch(
        `${API_BASE_URL}/admin/users/${targetUser.id}/${endpoint}`,
        { method: "PATCH" },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.message || `Não foi possível ${action} a conta.`);
      }
      setNotice(blocked
        ? "Conta bloqueada. O acesso foi encerrado imediatamente."
        : "Conta desbloqueada. O usuário já pode entrar novamente.");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || `Falha ao ${action} a conta.`);
    } finally {
      setActionUserId(null);
    }
  };

  const generateRecoveryCode = async (targetUser) => {
    if (!window.confirm(`Gerar um novo código de recuperação para ${targetUser.fullname}? O código anterior será invalidado.`)) return;

    setActionUserId(targetUser.id);
    setError("");
    setNotice("");
    setRecovery(null);
    setCopied(false);
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/admin/users/${targetUser.id}/recovery-code`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.message || "Não foi possível gerar o código de recuperação.");
      }
      setRecovery({
        fullname: targetUser.fullname,
        code: result.recoveryCode,
        expiresAt: result.expiresAt,
      });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message || "Falha ao redefinir o acesso.");
    } finally {
      setActionUserId(null);
    }
  };

  const copyRecoveryCode = async () => {
    try {
      await navigator.clipboard.writeText(recovery.code);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar. Selecione e copie o código manualmente.");
    }
  };

  return (
    <div className="admin-page">
      <Header />
      <main className="admin-content">
        <section className="admin-heading">
          <div>
            <span className="admin-eyebrow"><FiShield aria-hidden="true" /> CONTROLE DO SISTEMA</span>
            <h1>Painel administrativo</h1>
            <p>Gerencie contas e acessos. Dados financeiros dos usuários não são exibidos aqui.</p>
          </div>
          <button type="button" className="admin-refresh" onClick={loadUsers} disabled={loading}>
            <FiRefreshCw aria-hidden="true" className={loading ? "is-spinning" : ""} />
            Atualizar
          </button>
        </section>

        <section className="admin-summary" aria-label="Resumo de contas">
          <article className="admin-summary-card">
            <span className="admin-summary-icon"><FiUsers aria-hidden="true" /></span>
            <span className="admin-summary-label">Total de contas</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-icon is-active"><FiCheck aria-hidden="true" /></span>
            <span className="admin-summary-label">Ativas</span>
            <strong>{summary.active}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-icon is-blocked"><FiLock aria-hidden="true" /></span>
            <span className="admin-summary-label">Bloqueadas</span>
            <strong>{summary.blocked}</strong>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-icon is-admin"><FiShield aria-hidden="true" /></span>
            <span className="admin-summary-label">Administradores ativos</span>
            <strong>{summary.admins}</strong>
          </article>
        </section>

        <section className="admin-users-panel" aria-labelledby="admin-users-heading">
          <div className="admin-panel-heading">
            <div>
              <h2 id="admin-users-heading">Usuários</h2>
              <p>{pagination.total} conta{pagination.total === 1 ? "" : "s"} nesta visualização</p>
            </div>
            <div className="admin-filters">
              <label className="admin-search">
                <FiSearch aria-hidden="true" />
                <span className="sr-only">Buscar usuários</span>
                <input
                  type="search"
                  value={query}
                  maxLength={100}
                  placeholder="Nome, usuário ou email"
                  onChange={(event) => {
                    setPage(1);
                    setQuery(event.target.value);
                  }}
                />
              </label>
              <label className="admin-status-filter">
                <span className="sr-only">Filtrar por status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value);
                  }}
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="blocked">Bloqueados</option>
                </select>
              </label>
            </div>
          </div>

          {error && <div className="admin-feedback is-error" role="alert"><FiAlertCircle aria-hidden="true" />{error}</div>}
          {notice && <div className="admin-feedback is-success" role="status"><FiCheck aria-hidden="true" />{notice}</div>}

          <div className="admin-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th scope="col">Usuário</th>
                  <th scope="col">Conta</th>
                  <th scope="col">Cadastro</th>
                  <th scope="col" className="admin-actions-heading">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="admin-empty">Carregando contas…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" className="admin-empty">Nenhum usuário encontrado com esses filtros.</td></tr>
                ) : users.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="admin-user-name">
                        <span className="admin-user-avatar">{(account.fullname || account.username).charAt(0).toUpperCase()}</span>
                        <span>
                          <strong>{account.fullname}</strong>
                          <small>@{account.username} · {account.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-account-badges">
                        <span className={`admin-status-badge ${account.isBlocked ? "is-blocked" : "is-active"}`}>
                          {account.isBlocked ? "Bloqueada" : "Ativa"}
                        </span>
                        {account.isAdmin && <span className="admin-role-badge">Admin</span>}
                      </div>
                    </td>
                    <td className="admin-date">{formatDate(account.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-action-button recovery"
                          onClick={() => generateRecoveryCode(account)}
                          disabled={actionUserId === account.id || account.isCurrentUser}
                          title="Gerar código temporário de recuperação"
                        >
                          <FiRefreshCw aria-hidden="true" />
                          <span>Redefinir acesso</span>
                        </button>
                        {account.isBlocked ? (
                          <button
                            type="button"
                            className="admin-action-button unblock"
                            onClick={() => updateBlockStatus(account)}
                            disabled={actionUserId === account.id || account.isCurrentUser}
                            title={account.isCurrentUser ? "Você não pode bloquear a própria conta" : undefined}
                          >
                            <FiUnlock aria-hidden="true" />
                            <span>Desbloquear</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-action-button block"
                            onClick={() => updateBlockStatus(account)}
                            disabled={actionUserId === account.id || account.isCurrentUser}
                            title={account.isCurrentUser ? "Você não pode bloquear a própria conta" : undefined}
                          >
                            <FiLock aria-hidden="true" />
                            <span>Bloquear</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-pagination">
            <span>Página {pagination.page} de {Math.max(pagination.totalPages, 1)}</span>
            <div>
              <button
                type="button"
                aria-label="Página anterior"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
              ><FiChevronLeft aria-hidden="true" />Anterior</button>
              <button
                type="button"
                aria-label="Próxima página"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={loading || page >= pagination.totalPages}
              >Próxima<FiChevronRight aria-hidden="true" /></button>
            </div>
          </footer>
        </section>
      </main>

      {recovery && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setRecovery(null);
        }}>
          <section className="admin-recovery-modal" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
            <button type="button" className="admin-modal-close" aria-label="Fechar" onClick={() => setRecovery(null)}>
              <FiX aria-hidden="true" />
            </button>
            <span className="admin-recovery-icon"><FiClock aria-hidden="true" /></span>
            <h2 id="recovery-title">Código temporário gerado</h2>
            <p>Entregue este código a <strong>{recovery.fullname}</strong> por um canal seguro. Ele poderá redefinir a senha na tela de recuperação.</p>
            <div className="admin-recovery-code" aria-label={`Código ${recovery.code}`}>{recovery.code}</div>
            <p className="admin-recovery-expiry">Expira em {formatDate(recovery.expiresAt)} às {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(recovery.expiresAt))} e é invalidado após o uso. O código é mostrado apenas agora.</p>
            <button type="button" className="admin-copy-code" onClick={copyRecoveryCode}>
              {copied ? <FiCheck aria-hidden="true" /> : <FiRefreshCw aria-hidden="true" />}
              {copied ? "Código copiado" : "Copiar código"}
            </button>
            <button type="button" className="admin-modal-done" onClick={() => setRecovery(null)}>Concluir</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Admin;

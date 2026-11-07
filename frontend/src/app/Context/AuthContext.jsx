import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../Services/apiFetch";
import { API_BASE_URL } from "../Services/request";
import {
  clearAuthSession,
  getRememberMe,
  saveAuthSession,
  saveCsrfToken,
} from "../Services/authStorage";
import MyContext from "../Context/Context";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const navigate = useNavigate();
  const { setTransactions, setAmounts, getAllTransactions } = useContext(MyContext);

  const verifyToken = useCallback(async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/verify`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || data.error) {
        return { valid: false, user: null };
      }

      if (data.csrfToken) saveCsrfToken(data.csrfToken);
      return {
        valid: true,
        user: data.user,
        csrfToken: data.csrfToken,
        expiresAt: data.expiresAt,
      };
    } catch {
      return { valid: false, user: null, unavailable: true };
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const verification = await verifyToken();
        if (!active) return;

        if (!verification.valid) {
          if (!verification.unavailable) {
            clearAuthSession();
            setTransactions([]);
            setAmounts([]);
          }
          return;
        }

        const authenticatedUser = { authenticated: true };
        saveAuthSession(verification.csrfToken, authenticatedUser, getRememberMe());
        setUser(authenticatedUser);
        setSessionExpiresAt(verification.expiresAt);
        try {
          await getAllTransactions();
        } catch (transactionError) {
          if (transactionError.message?.includes("Sessão expirada")) {
            clearAuthSession();
            setUser(null);
            setTransactions([]);
            setAmounts([]);
            return;
          }
          console.error("Extrato indisponível; sessão mantida:", transactionError.message);
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        clearAuthSession();
        setUser(null);
        setTransactions([]);
        setAmounts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, [getAllTransactions, setAmounts, setTransactions, verifyToken]);

  useEffect(() => {
    if (!user || !sessionExpiresAt) return undefined;

    const expireSession = () => {
      clearAuthSession();
      setUser(null);
      setSessionExpiresAt(null);
      setTransactions([]);
      setAmounts([]);
      navigate("/login", { replace: true });
    };
    const timeout = window.setTimeout(
      expireSession,
      Math.max(0, Number(sessionExpiresAt) - Date.now())
    );
    return () => window.clearTimeout(timeout);
  }, [user, sessionExpiresAt, navigate, setTransactions, setAmounts]);

  const login = async (_userData, csrfToken, expiresAt, rememberMe = false) => {
    const verification = await verifyToken();
    if (!verification.valid) throw new Error("Sessão inválida. Faça login novamente.");

    const activeCsrfToken = csrfToken || verification.csrfToken;
    const authenticatedUser = { authenticated: true };
    saveAuthSession(activeCsrfToken, authenticatedUser, rememberMe);
    setUser(authenticatedUser);
    setSessionExpiresAt(expiresAt || verification.expiresAt);
    setTransactions([]);
    await getAllTransactions();
    navigate("/home");
  };

  const logout = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
    } catch (error) {
      console.error("Não foi possível encerrar a sessão no servidor:", error);
    } finally {
      clearAuthSession();
      setUser(null);
      setSessionExpiresAt(null);
      setTransactions([]);
      setAmounts([]);
      navigate("/login", { replace: true });
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

const AUTH_KEYS = ["token", "user", "csrfToken", "rememberedEmail"];

const minimizeStoredUser = (storage) => {
  if (storage.getItem("user")) {
    storage.setItem("user", JSON.stringify({ authenticated: true }));
  }
  storage.removeItem("token");
  storage.removeItem("rememberedEmail");
};

minimizeStoredUser(localStorage);
minimizeStoredUser(sessionStorage);

export const getStoredUser = () =>
  localStorage.getItem("user") || sessionStorage.getItem("user");

export const saveCsrfToken = (csrfToken) => {
  if (csrfToken) sessionStorage.setItem("csrfToken", csrfToken);
  else sessionStorage.removeItem("csrfToken");
};

export const getRememberMe = () => localStorage.getItem("rememberMe") === "true";

export const clearAuthSession = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const saveAuthSession = (csrfToken, _user, rememberMe) => {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem("user", JSON.stringify({ authenticated: true }));
  saveCsrfToken(csrfToken);
  localStorage.setItem("rememberMe", String(rememberMe));
};
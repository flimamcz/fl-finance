const AUTH_KEYS = ["token", "user", "csrfToken"];

export const getStoredUser = () =>
  localStorage.getItem("user") || sessionStorage.getItem("user");

export const saveCsrfToken = (csrfToken) => {
  if (csrfToken) sessionStorage.setItem("csrfToken", csrfToken);
  else sessionStorage.removeItem("csrfToken");
};

export const getRememberMe = () => localStorage.getItem("rememberMe") === "true";

export const getRememberedEmail = () => localStorage.getItem("rememberedEmail") || "";

export const clearAuthSession = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const saveAuthSession = (csrfToken, user, rememberMe) => {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem("user", JSON.stringify(user));
  saveCsrfToken(csrfToken);
  localStorage.setItem("rememberMe", String(rememberMe));

  if (rememberMe && user?.email) {
    localStorage.setItem("rememberedEmail", user.email);
  } else {
    localStorage.removeItem("rememberedEmail");
  }
};
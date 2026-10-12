const AUTH_KEYS = ["token", "user"];

export const getStoredToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

export const getStoredUser = () =>
  localStorage.getItem("user") || sessionStorage.getItem("user");

export const getRememberMe = () => localStorage.getItem("rememberMe") === "true";

export const getRememberedEmail = () => localStorage.getItem("rememberedEmail") || "";

export const clearAuthSession = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const saveAuthSession = (token, user, rememberMe) => {
  clearAuthSession();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem("token", token);
  storage.setItem("user", JSON.stringify(user));
  localStorage.setItem("rememberMe", String(rememberMe));

  if (rememberMe && user?.email) {
    localStorage.setItem("rememberedEmail", user.email);
  } else {
    localStorage.removeItem("rememberedEmail");
  }
};
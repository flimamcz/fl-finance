const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const apiFetch = (input, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.delete("Authorization");
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = sessionStorage.getItem("csrfToken");

  if (unsafeMethods.has(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(input, {
    ...options,
    credentials: "include",
    headers,
  });
};

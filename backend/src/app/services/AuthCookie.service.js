const crypto = require("crypto");

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = isProduction
  ? "__Host-flfinance_session"
  : "flfinance_session";
const csrfCookieName = isProduction
  ? "__Host-flfinance_csrf"
  : "flfinance_csrf";
const cookieOptions = {
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};

const getCookie = (req, name) => {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
};

const setAuthCookies = (
  res,
  token,
  rememberMe = false,
  csrfToken = crypto.randomBytes(32).toString("base64url")
) => {
  const sessionOptions = { ...cookieOptions };
  if (!rememberMe) delete sessionOptions.maxAge;
  res.cookie(sessionCookieName, token, {
    ...sessionOptions,
    httpOnly: true,
  });
  res.cookie(csrfCookieName, csrfToken, {
    ...sessionOptions,
    httpOnly: false,
  });

  return csrfToken;
};

const clearAuthCookies = (res) => {
  const clearOptions = {
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  };
  res.clearCookie(sessionCookieName, { ...clearOptions, httpOnly: true });
  res.clearCookie(csrfCookieName, { ...clearOptions, httpOnly: false });
};

module.exports = {
  clearAuthCookies,
  csrfCookieName,
  getCookie,
  sessionCookieName,
  setAuthCookies,
};

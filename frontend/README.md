# React + Vite

## Authentication cookies

The API stores the signed session in an `HttpOnly`, `Secure` cookie; browser code
must not read or persist the session token. The frontend keeps only a short-lived
CSRF value in `sessionStorage` and sends it on state-changing API requests.

The current Vercel and Render hosts are cross-site. Production cookies therefore
use `SameSite=None`, which requires HTTPS and may still be blocked by browser
third-party-cookie restrictions. For reliable sessions, map the frontend and API
to subdomains of a domain you control and update the API's `FRONTEND_ORIGINS`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

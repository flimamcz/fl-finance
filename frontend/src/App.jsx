// src/App.js
import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./app/Context/AuthContext"; // NOVO IMPORT
import ProtectedRoute from "./app/Components/ProtectedRoute";
import "./app/Styles/App.css";

const Login = lazy(() => import("./app/Pages/Login"));
const FirstAdminSetup = lazy(() => import("./app/Pages/FirstAdminSetup"));
const Register = lazy(() => import("./app/Pages/Register"));
const ForgotPassword = lazy(() => import("./app/Pages/ForgotPassword"));
const Home = lazy(() => import("./app/Pages/Home"));
const Profile = lazy(() => import("./app/Pages/Profile"));
const Debts = lazy(() => import("./app/Pages/Debts"));
const Investments = lazy(() => import("./app/Pages/Investments"));
const Revenues = lazy(() => import("./app/Pages/Revenues"));
const Expenses = lazy(() => import("./app/Pages/Expenses"));
const TransactionAnalytics = lazy(() => import("./app/Pages/TransactionAnalytics"));
const ImportTransactions = lazy(() => import("./app/Pages/ImportTransactions"));
const Admin = lazy(() => import("./app/Pages/Admin"));
const appShellPaths = new Set([
  "/home",
  "/profile",
  "/debts",
  "/revenues",
  "/expenses",
  "/transactions",
  "/import-transactions",
  "/investments",
  "/admin",
]);

function App() {
  const location = useLocation();
  const isAppRoute = appShellPaths.has(location.pathname);

  useLayoutEffect(() => {
    document.body.classList.toggle("app-shell", isAppRoute);
  }, [isAppRoute]);

  return (
    // APENAS ENVOLVA COM AuthProvider - NÃO MUDE NADA DENTRO
    <AuthProvider>
      <div className="route-transition" key={location.pathname}>
        {isAppRoute && (
          <svg
            className="finance-ambient"
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <pattern
                id="finance-grid"
                width="72"
                height="72"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 72 0 L 0 0 0 72" className="finance-grid-line" />
              </pattern>
              <linearGradient id="finance-trend" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#67a2ff" />
                <stop offset="100%" stopColor="#42c6dd" />
              </linearGradient>
            </defs>
            <rect width="1440" height="900" fill="url(#finance-grid)" />
            <g className="finance-bars">
              <rect x="110" y="648" width="18" height="112" rx="9" />
              <rect x="158" y="602" width="18" height="158" rx="9" />
              <rect x="206" y="625" width="18" height="135" rx="9" />
              <rect x="254" y="542" width="18" height="218" rx="9" />
              <rect x="302" y="570" width="18" height="190" rx="9" />
              <rect x="350" y="482" width="18" height="278" rx="9" />
            </g>
            <path
              className="finance-trend"
              d="M 80 690 C 180 660, 220 708, 310 610 S 440 590, 520 520 S 650 540, 720 430 S 860 460, 960 345 S 1110 380, 1200 250 S 1320 285, 1400 170"
            />
            <circle className="finance-point finance-point-one" cx="720" cy="430" r="6" />
            <circle className="finance-point finance-point-two" cx="1200" cy="250" r="6" />
          </svg>
        )}
        <div className="route-content">
          <Suspense
            fallback={
              <div className="finance-loader" role="status" aria-label="Carregando página">
                <div className="finance-loader__card">
                  <div className="finance-loader__visual" aria-hidden="true">
                    <svg className="finance-loader__chart" viewBox="0 0 120 76" fill="none">
                      <path className="finance-loader__chart-grid" d="M8 16.5h104M8 38h104M8 59.5h104" />
                      <path className="finance-loader__chart-line" d="m10 54 22-13 18 7 20-23 17 10 23-25" />
                      <circle className="finance-loader__chart-point" cx="110" cy="10" r="3.5" />
                    </svg>
                    <div className="finance-loader__bars">
                      <i /><i /><i /><i /><i />
                    </div>
                    <div className="finance-loader__orbit">
                      <span />
                    </div>
                  </div>
                  <div className="finance-loader__copy">
                    <span className="finance-loader__eyebrow">FINFLOW</span>
                    <strong>Organizando suas finanças</strong>
                    <span className="finance-loader__caption">Só um instante</span>
                  </div>
                  <div className="finance-loader__progress" aria-hidden="true">
                    <span />
                  </div>
                </div>
              </div>
            }
          >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/first-admin" element={<FirstAdminSetup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/debts"
              element={
                <ProtectedRoute>
                  <Debts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/revenues"
              element={
                <ProtectedRoute>
                  <Revenues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/import-transactions"
              element={
                <ProtectedRoute>
                  <ImportTransactions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/investments"
              element={
                <ProtectedRoute>
                  <Investments />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
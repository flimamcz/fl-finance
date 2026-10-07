import { useEffect, useLayoutEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  FiCreditCard,
  FiHome,
  FiList,
  FiLogOut,
  FiMoreHorizontal,
  FiPieChart,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../Context/AuthContext";
import "../Styles/Header.css";

const navItems = [
  { path: "/home", label: "Início", Icon: FiHome },
  { path: "/debts", label: "Dívidas", Icon: FiCreditCard },
  { path: "/investments", label: "Investimentos", Icon: FiPieChart },
  { path: "/home#transactions", label: "Transações", Icon: FiList, transactions: true },
];

function Header() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isProfilePage = location.pathname === "/profile";
  const isTransactionsPage =
    location.pathname === "/home" && location.hash === "#transactions";

  useLayoutEffect(() => {
    document.body.classList.add("app-shell");
    return () => document.body.classList.remove("app-shell");
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    if (location.pathname !== "/home" || location.hash !== "#transactions") return;

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById("transactions");
      if (!section) return;

      section.focus({ preventScroll: true });
      section.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  useEffect(() => {
    if (!moreOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  const renderNavItems = () =>
    navItems.map(({ path, label, Icon, transactions }) => {
      const isActive = transactions
        ? isTransactionsPage
        : label === "Início"
          ? location.pathname === path && !location.hash
          : location.pathname === path;

      return (
        <Link
          key={label}
          to={path}
          className={`app-nav-link ${isActive ? "active" : ""}`}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon className="app-nav-icon" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      );
    });

  return (
    <>
      <header className="app-navigation">
        <Link
          to="/home"
          className="navigation-brand"
          aria-label="FinFlow — Início"
          onClick={() => setMoreOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">F</span>
          <span className="brand-name">FinFlow</span>
        </Link>

        <nav className="primary-navigation" aria-label="Navegação principal">
          {renderNavItems()}
        </nav>

        <div className="more-navigation">
          <button
            type="button"
            className={`app-nav-link more-trigger ${isProfilePage ? "active" : ""}`}
            aria-expanded={moreOpen}
            aria-controls="more-navigation-menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <FiMoreHorizontal className="app-nav-icon" aria-hidden="true" />
            <span>Mais</span>
          </button>
          <div className="more-menu" id="more-navigation-menu" hidden={!moreOpen}>
            <div className="more-menu-user">
              <span className="more-avatar" aria-hidden="true">
                {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
              </span>
              <span className="more-user-name">{user?.name || "Minha conta"}</span>
            </div>
            <NavLink
              to="/profile"
              className={({ isActive }) => `more-menu-link ${isActive ? "active" : ""}`}
              onClick={() => setMoreOpen(false)}
            >
              <FiUser aria-hidden="true" />
              <span>Meu perfil</span>
            </NavLink>
            <button
              type="button"
              className="more-menu-link logout-link"
              onClick={logout}
            >
              <FiLogOut aria-hidden="true" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="mobile-navigation" aria-label="Navegação principal">
        {renderNavItems()}
        <button
          type="button"
          className={`app-nav-link more-trigger ${isProfilePage ? "active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="more-navigation-menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <FiMoreHorizontal className="app-nav-icon" aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>
      <div className="navigation-spacer" aria-hidden="true" />
    </>
  );
}

export default Header;

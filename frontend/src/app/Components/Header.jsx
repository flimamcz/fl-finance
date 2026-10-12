import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiList,
  FiLogOut,
  FiMoreHorizontal,
  FiPieChart,
  FiMoon,
  FiSun,
  FiTrendingDown,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../Context/AuthContext";
import MyContext from "../Context/Context";
import "../Styles/Header.css";

const navItems = [
  { path: "/home", label: "Início", Icon: FiHome },
  { path: "/revenues", label: "Receitas", Icon: FiDollarSign },
  { path: "/expenses", label: "Despesas", Icon: FiTrendingDown },
  { path: "/debts", label: "Dívidas", Icon: FiCreditCard },
  { path: "/investments", label: "Investimentos", Icon: FiPieChart },
  { path: "/import-transactions", label: "Importar", Icon: FiUploadCloud },
  { path: "/transactions", label: "Transações", Icon: FiList, transactions: true },
];

const mobilePrimaryLabels = ["Início", "Receitas", "Despesas", "Transações"];

function Header() {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileMoreRef = useRef(null);
  const desktopMoreRef = useRef(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useContext(MyContext);
  const isProfilePage = location.pathname === "/profile";
  const isTransactionsPage = location.pathname === "/transactions";

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

  useEffect(() => {
    if (!moreOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      const clickedMobileMenu = mobileMoreRef.current?.contains(event.target);
      const clickedDesktopMenu = desktopMoreRef.current?.contains(event.target);
      if (!clickedMobileMenu && !clickedDesktopMenu) setMoreOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [moreOpen]);

  const renderNavItems = (mobile = false) =>
    navItems
      .filter(({ label }) => !mobile || mobilePrimaryLabels.includes(label))
      .map(({ path, label, Icon, transactions }) => {
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

  const secondaryMobileItems = navItems.filter(
    ({ label }) => !mobilePrimaryLabels.includes(label),
  );
  const isMoreActive = isProfilePage || secondaryMobileItems.some(({ path }) => location.pathname === path);

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

        <button
          type="button"
          className="header-theme-toggle mobile-theme-toggle"
          onClick={() => setDarkMode((current) => !current)}
          aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
          aria-pressed={darkMode}
          title={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {darkMode ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
        </button>

        <nav className="primary-navigation" aria-label="Navegação principal">
          {renderNavItems()}
        </nav>

        <div className="more-navigation" ref={desktopMoreRef}>
          <button
            type="button"
            className="app-nav-link desktop-theme-toggle"
            onClick={() => setDarkMode((current) => !current)}
            aria-pressed={darkMode}
          >
            {darkMode ? <FiSun className="app-nav-icon" aria-hidden="true" /> : <FiMoon className="app-nav-icon" aria-hidden="true" />}
            <span>{darkMode ? "Tema claro" : "Tema escuro"}</span>
          </button>
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
        {renderNavItems(true)}
        <div className="mobile-more-wrap" ref={mobileMoreRef}>
          <button
            type="button"
            className={`app-nav-link more-trigger ${isMoreActive ? "active" : ""}`}
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <FiMoreHorizontal className="app-nav-icon" aria-hidden="true" />
            <span>Mais</span>
          </button>
          <div className="more-menu mobile-more-menu" id="mobile-more-menu" hidden={!moreOpen}>
            <div className="more-menu-user">
              <span className="more-avatar" aria-hidden="true">
                {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
              </span>
              <span className="more-user-name">{user?.name || "Minha conta"}</span>
            </div>
            {secondaryMobileItems.map(({ path, label, Icon }) => (
              <Link
                key={path}
                to={path}
                className={`more-menu-link ${location.pathname === path ? "active" : ""}`}
                aria-current={location.pathname === path ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
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
      </nav>
      <div className="navigation-spacer" aria-hidden="true" />
    </>
  );
}

export default Header;

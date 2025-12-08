import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiUser, FiHome, FiTrendingUp, FiBell, FiMenu, FiX, FiMoon, FiSun } from "react-icons/fi";
import "../Styles/Header.css";

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();

  // Efeito scroll para header fixo
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fechar menu ao trocar de página
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const navItems = [
    { path: "/home", label: "Dashboard", icon: <FiHome /> },
    { path: "/transactions", label: "Transações", icon: <FiTrendingUp /> },
    { path: "/reports", label: "Relatórios", icon: <FiTrendingUp /> },
    { path: "/goals", label: "Metas", icon: <FiTrendingUp /> },
  ];

  return (
    <>
      {/* Header Principal */}
      <header className={`header ${scrolled ? "header-scrolled" : ""} ${darkMode ? "dark-mode" : ""}`}>
        {/* Logo e Menu Hamburger (Mobile) */}
        <div className="header-left">
          <button 
            className="menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          
          <Link to="/home" className="logo-link">
            <div className="logo-container">
              <div className="logo-icon">
                <div className="pig-ear"></div>
                <div className="pig-body"></div>
                <div className="pig-nose"></div>
                <div className="coin-slot">$</div>
              </div>
              <span className="logo-text">FinFlow</span>
            </div>
          </Link>
        </div>

        {/* Título Central (apenas mobile) */}
        <div className="header-center">
          <h1 className="app-title">Controle Financeiro</h1>
        </div>

        {/* Ações Direitas */}
        <div className="header-right">
          {/* Botão Dark/Light Mode */}
          <button 
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "Modo claro" : "Modo escuro"}
          >
            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
          
          {/* Notificações */}
          <button className="notification-btn" aria-label="Notificações">
            <FiBell size={20} />
            <span className="notification-badge">3</span>
          </button>
          
          {/* Perfil */}
          <Link to="/profile" className="profile-link">
            <div className="profile-avatar">
              <FiUser size={20} />
            </div>
          </Link>
        </div>
      </header>

      {/* Menu Mobile Overlay */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="user-info">
                <div className="profile-avatar large">
                  <FiUser size={24} />
                </div>
                <div>
                  <p className="user-name">Olá, Usuário</p>
                  <p className="user-balance">Saldo: R$ 2.500,00</p>
                </div>
              </div>
            </div>
            
            <nav className="mobile-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </nav>
            
            <div className="mobile-menu-footer">
              <button className="logout-btn">
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Spacer para header fixo */}
      <div className="header-spacer"></div>
    </>
  );
}

export default Header;
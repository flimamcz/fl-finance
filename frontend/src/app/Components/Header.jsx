import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../Styles/Header.css";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carregar usuário
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Fechar menus ao trocar de página
  useEffect(() => {
    setMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location]);

  // Impede scroll quando menu está aberto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setProfileMenuOpen(false);
    setMenuOpen(false);
    navigate("/login");
  };

  const navItems = [
    // { path: "/home", label: "Dashboard", icon: "📊" },
    // { path: "/transactions", label: "Transações", icon: "💰" },
    // { path: "/reports", label: "Relatórios", icon: "📈" },
    // { path: "/goals", label: "Metas", icon: "🎯" },
  ];

  return (
    <>
      <header className="header">
        {/* Menu Hamburger (SÓ NO MOBILE) */}
        {isMobile && (
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menu"
          >
            <span className={`hamburger ${menuOpen ? "open" : ""}`}>
              <span className="line"></span>
              <span className="line"></span>
              <span className="line"></span>
            </span>
          </button>
        )}

        {/* Logo */}
        <Link to="/home" className="logo">
          <div className="logo-icon">
            <div className="pig-icon">
              <div className="ear"></div>
              <div className="face"></div>
              <div className="nose"></div>
            </div>
            <span className="logo-text">FinFlow</span>
          </div>
        </Link>

        {/* Navegação Desktop (SÓ NO DESKTOP) */}
        {!isMobile && (
          <nav className="desktop-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link-desktop ${
                  location.pathname === item.path ? "active" : ""
                }`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}

        {/* Perfil Desktop (SÓ NO DESKTOP) */}
        {!isMobile && (
          <div className="profile-section">
            <div
              className="profile-avatar"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </div>

            {/* Dropdown do Perfil (Desktop) */}
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="user-info">
                    <div className="avatar-large">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
                    </div>
                    <div>
                      <p className="user-name">{user?.name || "Usuário"}</p>
                      <p className="user-email">{user?.email || "user@email.com"}</p>
                    </div>
                  </div>
                </div>

                <div className="dropdown-menu">
                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <span className="item-icon">👤</span>
                    <span className="item-label">Meu Perfil</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="dropdown-item"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <span className="item-icon">⚙️</span>
                    <span className="item-label">Configurações</span>
                  </Link>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <span className="item-icon">🚪</span>
                    <span className="item-label">Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ícone do Perfil no Mobile (SÓ NO MOBILE - dentro do menu) */}
        {isMobile && (
          <div className="mobile-profile-icon" onClick={() => setMenuOpen(true)}>
            <div className="profile-avatar small">
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </div>
          </div>
        )}
      </header>

      {/* Menu Mobile Overlay (SÓ NO MOBILE) */}
      {isMobile && menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <div className="user-info">
                <div className="avatar large">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
                </div>
                <div>
                  <p className="user-name">{user?.name || "Usuário"}</p>
                  <p className="user-email">{user?.email || "user@email.com"}</p>
                </div>
              </div>
              <button
                className="close-menu"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            <nav className="menu-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${
                    location.pathname === item.path ? "active" : ""
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-arrow">›</span>
                </Link>
              ))}
            </nav>

            <div className="menu-footer">
              <div className="menu-links">
                <Link to="/profile" onClick={() => setMenuOpen(false)}>
                  👤 Meu Perfil
                </Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)}>
                  ⚙️ Configurações
                </Link>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                🚪 Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="header-spacer"></div>
    </>
  );
}

export default Header;
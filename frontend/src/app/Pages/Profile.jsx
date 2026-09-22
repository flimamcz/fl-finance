import { Fragment, useState, useEffect, useContext } from "react";
import { 
  FiUser, FiMail, FiCalendar, FiLock, 
  FiCamera, FiSave, FiCheckCircle, FiAlertCircle,
  FiSun, FiMoon, FiLogOut, FiDownload, FiClock,
  FiShield, FiEye, FiEyeOff, FiActivity, FiDatabase,
  FiSmartphone, FiGlobe, FiBell, FiX
} from "react-icons/fi";
import Header from "../Components/Header";
import { useAuth } from "../Context/AuthContext";
import MyContext from "../Context/Context";
import { API_BASE_URL } from "../Services/request";
import "../Styles/Profile.css";

function Profile() {
  const { user: authUser, logout } = useAuth();
  const { getAllTransactions } = useContext(MyContext);
  
  // Estados
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    birthDate: "",
    photo: null,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [changePassword, setChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [transactionCount, setTransactionCount] = useState(0);
  
  // Estatísticas
  const [stats, setStats] = useState({
    joinedDate: "",
    lastLogin: new Date().toISOString(),
    totalTransactions: 0,
    devices: 1,
    theme: "light"
  });

  // Preferências
  const [preferences, setPreferences] = useState({
    notifications: true,
    currency: "BRL",
    language: "pt-BR",
    weeklyReport: false
  });

  // ========== FUNÇÕES DE API ==========
  const loadUserData = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setMessage({ type: 'error', text: 'Sessão expirada. Faça login novamente.' });
        logout();
        return;
      }

      console.log('🔍 Carregando dados do perfil...');
      
      // Buscar dados do usuário
      const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const userResult = await userResponse.json();

      if (!userResponse.ok || userResult.error) {
        throw new Error(userResult.message || `Erro ${userResponse.status}`);
      }

      // Buscar contagem de transações
      let transactionCount = 0;
      try {
        const transResponse = await fetch(`${API_BASE_URL}/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (transResponse.ok) {
          const transData = await transResponse.json();
          if (transData.data && Array.isArray(transData.data)) {
            transactionCount = transData.data.length;
          } else if (transData.message && Array.isArray(transData.message)) {
            transactionCount = transData.message.length;
          }
        }
      } catch (transError) {
        console.log('⚠️ Não foi possível contar transações:', transError.message);
      }

      // Preencher formulário
      const userData = userResult.data;
      
      setFormData({
        name: userData.name || userData.fullname || authUser?.name || "",
        email: userData.email || authUser?.email || "",
        birthDate: userData.birthDate || "2001-10-12",
        photo: userData.photo || null,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPhotoPreview(userData.photo || null);

      // Atualizar estatísticas
      setStats({
        joinedDate: userData.createdAt || userData.joinedDate || "2024-01-01",
        lastLogin: new Date().toISOString(),
        totalTransactions: transactionCount,
        devices: 1,
        theme: darkMode ? "dark" : "light"
      });

      setTransactionCount(transactionCount);
      setMessage({ type: '', text: '' });
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao carregar dados do perfil' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ========== EFEITOS ==========
  useEffect(() => {
    if (authUser) {
      loadUserData();
    }
  }, [authUser]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.setAttribute("data-theme", "light");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ========== HANDLERS ==========
  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    if (files && name === "photo") {
      const file = files[0];
      if (file && file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setFormData((prev) => ({ ...prev, photo: reader.result }));
          setPhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
        setMessage({ 
          type: 'success', 
          text: 'Foto carregada com sucesso!' 
        });
      } else if (file && file.size > 10 * 1024 * 1024) {
        setMessage({ 
          type: 'error',
          text: 'A foto deve ter no máximo 10 MB.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Por favor, selecione uma imagem válida.' 
        });
      }
    } else if (type === 'checkbox') {
      setPreferences(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    setMessage({
      type: 'success',
      text: `Tema alterado para ${!darkMode ? 'escuro' : 'claro'}!`
    });
  };

  // ========== VALIDAÇÕES ==========
  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'O nome é obrigatório.' });
      return false;
    }
    
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'O email é obrigatório.' });
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage({ type: 'error', text: 'Digite um email válido.' });
      return false;
    }

    if (changePassword) {
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: 'Digite sua senha atual.' });
        return false;
      }
      
      if (!formData.newPassword) {
        setMessage({ type: 'error', text: 'Digite a nova senha.' });
        return false;
      }
      
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
        return false;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem!' });
        return false;
      }
    }

    return true;
  };

  // ========== SUBMIT (CORRIGIDO - SEM RELOAD) ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Evita reload da página
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      let endpoint, method, bodyData;
      
      if (changePassword) {
        endpoint = "/users/password";
        method = "PATCH";
        bodyData = {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        };
      } else {
        endpoint = "/users/me";
        method = "PATCH";
        bodyData = {
          name: formData.name,
          email: formData.email,
          birthDate: formData.birthDate,
          photo: formData.photo,
        };
      }
      
      console.log('📤 Enviando dados:', { endpoint, bodyData });
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      
      const result = await response.json();
      console.log('📥 Resposta:', result);
      
      if (!response.ok || result.error) {
        throw new Error(result.message || `Erro ${response.status}`);
      }
      
      // Sucesso - NÃO FAZ RELOAD
      setMessage({ 
        type: 'success', 
        text: result.message || 'Operação realizada com sucesso!' 
      });
      
      // Atualizar localStorage sem reload
      if (!changePassword) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUser = { 
          ...currentUser, 
          name: formData.name,
          email: formData.email
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      
      // Limpar campos de senha
      if (changePassword) {
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setChangePassword(false);
      }
      
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao atualizar perfil. Tente novamente.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== FUNÇÕES AUXILIARES ==========
  const exportData = () => {
    const userData = {
      personal: formData,
      preferences: preferences,
      stats: stats,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `meus-dados-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setMessage({
      type: 'success',
      text: 'Dados exportados com sucesso!'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Não informado";
    
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return "Data inválida";
    }
  };

  const refreshTransactions = async () => {
    try {
      await getAllTransactions();
      await loadUserData();
      setMessage({
        type: 'success',
        text: 'Dados atualizados com sucesso!'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao atualizar transações'
      });
    }
  };

  // ========== RENDERIZAÇÃO ==========
  const renderPersonalTab = () => (
    <div className="profile-tab-content">
      <div className="profile-picture-section">
        <div className="profile-picture-wrapper">
          <div className="profile-picture-preview">
            <img
              src={photoPreview || "/default-avatar.png"}
              alt="Foto de Perfil"
              onError={(e) => {
                e.target.src = "/default-avatar.png";
              }}
            />
            <div className="profile-picture-overlay">
              <FiCamera size={16} />
            </div>
          </div>
        </div>
        
        <label className="profile-upload-button">
          <FiCamera />
          <span>Alterar Foto</span>
          <input
            type="file"
            name="photo"
            accept="image/*"
            onChange={handleChange}
          />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-form-group">
          <label>
            <FiUser className="icon-spacing" />
            Nome Completo
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="profile-form-input"
            placeholder="Digite seu nome completo"
            required
          />
        </div>

        <div className="profile-form-group">
          <label>
            <FiCalendar className="icon-spacing" />
            Data de Nascimento
          </label>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            className="profile-form-input"
            required
          />
        </div>

        <div className="profile-form-group">
          <label>
            <FiMail className="icon-spacing" />
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="profile-form-input"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="profile-form-divider">
          <FiLock /> Alteração de Senha
        </div>

        <div className="profile-checkbox-group" onClick={() => setChangePassword(!changePassword)}>
          <input
            type="checkbox"
            checked={changePassword}
            onChange={() => {}}
          />
          <label>
            <FiLock className="icon-spacing" />
            Deseja alterar a senha?
          </label>
        </div>

        {changePassword && (
          <div className="profile-password-section">
            <div className="profile-form-group">
              <label>Senha Atual</label>
              <div className="profile-password-input-wrapper">
                <input
                  type={showPassword.current ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="profile-form-input"
                  placeholder="Digite sua senha atual"
                />
                <button 
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => togglePasswordVisibility("current")}
                >
                  {showPassword.current ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="profile-form-group">
              <label>Nova Senha</label>
              <div className="profile-password-input-wrapper">
                <input
                  type={showPassword.new ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="profile-form-input"
                  placeholder="Mínimo 6 caracteres"
                />
                <button 
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => togglePasswordVisibility("new")}
                >
                  {showPassword.new ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="profile-form-group">
              <label>Confirmar Nova Senha</label>
              <div className="profile-password-input-wrapper">
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="profile-form-input"
                  placeholder="Digite a senha novamente"
                />
                <button 
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => togglePasswordVisibility("confirm")}
                >
                  {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`profile-form-message ${message.type}`}>
            {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{message.text}</span>
            <button 
              className="profile-message-close"
              onClick={() => setMessage({ type: '', text: '' })}
            >
              <FiX size={14} />
            </button>
          </div>
        )}

        <button 
          type="submit" 
          className="profile-submit-button"
          disabled={isSubmitting}
        >
          <FiSave />
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="profile-tab-content">
      <div className="profile-preferences-grid">
        <div className="profile-preference-card">
          <div className="profile-preference-header">
            <FiSun className="profile-preference-icon" />
            <h3>Tema da Aplicação</h3>
          </div>
          <p>Escolha entre tema claro ou escuro</p>
          <div className="profile-preference-control">
            <button 
              className={`profile-theme-toggle-btn ${!darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(false)}
            >
              <FiSun /> Claro
            </button>
            <button 
              className={`profile-theme-toggle-btn ${darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(true)}
            >
              <FiMoon /> Escuro
            </button>
          </div>
        </div>

        <div className="profile-preference-card">
          <div className="profile-preference-header">
            <FiBell className="profile-preference-icon" />
            <h3>Notificações</h3>
          </div>
          <p>Receber alertas e notificações</p>
          <div className="profile-preference-control">
            <label className="profile-toggle-switch">
              <input
                type="checkbox"
                name="notifications"
                checked={preferences.notifications}
                onChange={handleChange}
              />
              <span className="profile-toggle-slider"></span>
            </label>
            <span className="profile-toggle-label">
              {preferences.notifications ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>

        <div className="profile-preference-card">
          <div className="profile-preference-header">
            <FiActivity className="profile-preference-icon" />
            <h3>Relatório Semanal</h3>
          </div>
          <p>Receber resumo semanal por email</p>
          <div className="profile-preference-control">
            <label className="profile-toggle-switch">
              <input
                type="checkbox"
                name="weeklyReport"
                checked={preferences.weeklyReport}
                onChange={handleChange}
              />
              <span className="profile-toggle-slider"></span>
            </label>
            <span className="profile-toggle-label">
              {preferences.weeklyReport ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>

        <div className="profile-preference-card">
          <div className="profile-preference-header">
            <FiGlobe className="profile-preference-icon" />
            <h3>Moeda Padrão</h3>
          </div>
          <p>Selecione sua moeda principal</p>
          <select 
            className="profile-form-input"
            value={preferences.currency}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              currency: e.target.value
            }))}
          >
            <option value="BRL">Real Brasileiro (R$)</option>
            <option value="USD">Dólar Americano ($)</option>
            <option value="EUR">Euro (€)</option>
          </select>
        </div>
      </div>

      <div className="profile-preferences-actions">
        <button className="profile-btn-secondary" onClick={exportData}>
          <FiDownload /> Exportar Configurações
        </button>
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="profile-tab-content">
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <FiUser />
          </div>
          <div className="profile-stat-info">
            <h3>Nome</h3>
            <p>{formData.name || "Não informado"}</p>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <FiMail />
          </div>
          <div className="profile-stat-info">
            <h3>Email</h3>
            <p>{formData.email || "Não informado"}</p>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <FiCalendar />
          </div>
          <div className="profile-stat-info">
            <h3>Membro desde</h3>
            <p>{formatDate(stats.joinedDate)}</p>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon">
            <FiDatabase />
          </div>
          <div className="profile-stat-info">
            <h3>Transações</h3>
            <p>{stats.totalTransactions} registros</p>
          </div>
        </div>
      </div>

      <div className="profile-data-actions">
        <h3>Gerenciamento de Dados</h3>
        <div className="profile-action-buttons">
          <button className="profile-btn-primary" onClick={exportData}>
            <FiDownload /> Exportar Meus Dados
          </button>
          <button className="profile-btn-secondary" onClick={refreshTransactions}>
            <FiDatabase /> Atualizar Dados
          </button>
        </div>
      </div>

      <div className="profile-logout-section">
        <h3>Sessão</h3>
        <button 
          className="profile-btn-danger"
          onClick={() => {
            if (window.confirm("Tem certeza que deseja sair?")) {
              logout();
            }
          }}
        >
          <FiLogOut /> Sair da Conta
        </button>
      </div>
    </div>
  );

  // ========== RENDER PRINCIPAL ==========
  if (isLoading) {
    return (
      <Fragment>
        <Header />
        <div className="profile-container">
          <div className="profile-loading">
            <div className="profile-loader"></div>
            <p>Carregando perfil...</p>
          </div>
        </div>
      </Fragment>
    );
  }

  if (!authUser) {
    return (
      <Fragment>
        <Header />
        <div className="profile-container">
          <div className="profile-not-logged-in">
            <FiUser size={48} />
            <h2>Usuário não logado</h2>
            <p>Faça login para acessar seu perfil</p>
            <button 
              className="profile-btn-primary"
              onClick={() => window.location.href = "/login"}
            >
              Ir para Login
            </button>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Header />
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h1>Meu Perfil</h1>
            <p className="profile-subtitle">Gerencie suas informações e preferências</p>
          </div>

          {/* Tabs de Navegação */}
          <div className="profile-tabs">
            <button 
              className={`profile-tab-btn ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              <FiUser /> Pessoal
            </button>
            <button 
              className={`profile-tab-btn ${activeTab === "preferences" ? "active" : ""}`}
              onClick={() => setActiveTab("preferences")}
            >
              <FiSun /> Preferências
            </button>
            <button 
              className={`profile-tab-btn ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              <FiActivity /> Estatísticas
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === "personal" && renderPersonalTab()}
          {activeTab === "preferences" && renderPreferencesTab()}
          {activeTab === "stats" && renderStatsTab()}
        </div>
      </div>
    </Fragment>
  );
}

export default Profile;
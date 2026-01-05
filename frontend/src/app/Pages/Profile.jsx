import { Fragment, useState, useEffect, useContext } from "react";
import { 
  FiUser, FiMail, FiCalendar, FiLock, 
  FiCamera, FiSave, FiCheckCircle, FiAlertCircle,
  FiSun, FiMoon, FiLogOut, FiDownload, FiClock,
  FiShield, FiEye, FiEyeOff, FiActivity, FiDatabase,
  FiSmartphone, FiGlobe, FiBell
} from "react-icons/fi";
import Header from "../Components/Header";
import MyContext from "../Context/Context"; // Se tiver contexto
import "../Styles/Profile.css";

function Profile() {
  // Estados principais
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

  // Estados auxiliares
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
  
  // Estatísticas do usuário (mockadas por enquanto)
  const [stats, setStats] = useState({
    joinedDate: "2024-01-15",
    lastLogin: new Date().toISOString(),
    totalTransactions: 0,
    devices: 1,
    theme: "light"
  });

  // Preferências (mockadas)
  const [preferences, setPreferences] = useState({
    notifications: true,
    currency: "BRL",
    language: "pt-BR",
    weeklyReport: false
  });

  // ========== EFEITOS INICIAIS ==========
  useEffect(() => {
    // Simular carregamento de dados do usuário
    const loadUserData = async () => {
      setIsLoading(true);
      
      try {
        // TODO: Substituir por chamada real à API
        // const response = await fetch("http://192.168.0.10:3001/users/me", {
        //   headers: {
        //     Authorization: `Bearer ${localStorage.getItem("token")}`,
        //   },
        // });
        // const userData = await response.json();
        
        // Dados mockados (remover depois)
        const mockUser = {
          name: "Filipe Lima",
          email: "filipe@email.com",
          birthDate: "2001-10-12",
          photo: null,
          joinedDate: "2024-01-15",
          lastLogin: new Date().toISOString()
        };
        
        setFormData({
          name: mockUser.name,
          email: mockUser.email,
          birthDate: mockUser.birthDate,
          photo: null,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        setStats({
          ...stats,
          joinedDate: mockUser.joinedDate,
          lastLogin: mockUser.lastLogin
        });
        
        setPhotoPreview("/default-avatar.png");
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setMessage({ 
          type: 'error', 
          text: 'Erro ao carregar dados do perfil' 
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  // Aplicar tema
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
      if (file && file.type.startsWith('image/')) {
        setFormData((prev) => ({ ...prev, photo: file }));
        setPhotoPreview(URL.createObjectURL(file));
        setMessage({ 
          type: 'success', 
          text: 'Foto carregada com sucesso!' 
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
    // Validação básica
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

    // Validação de senha (se estiver alterando)
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

  // ========== SUBMIT ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // TODO: Substituir por chamada real à API
      // const endpoint = changePassword ? "/users/password" : "/users/me";
      // const method = changePassword ? "PATCH" : "PATCH";
      
      // const response = await fetch(`http://192.168.0.10:3001${endpoint}`, {
      //   method,
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${localStorage.getItem("token")}`,
      //   },
      //   body: JSON.stringify(changePassword ? {
      //     currentPassword: formData.currentPassword,
      //     newPassword: formData.newPassword
      //   } : {
      //     name: formData.name,
      //     email: formData.email,
      //     birthDate: formData.birthDate
      //   }),
      // });
      
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sucesso
      setMessage({ 
        type: 'success', 
        text: changePassword 
          ? 'Senha alterada com sucesso!' 
          : 'Perfil atualizado com sucesso!' 
      });
      
      // Limpar campos de senha se alterada
      if (changePassword) {
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setChangePassword(false);
      }
      
      // Atualizar dados locais
      const updatedStats = {
        ...stats,
        lastLogin: new Date().toISOString()
      };
      setStats(updatedStats);
      
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao atualizar perfil. Tente novamente.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== FUNÇÕES AUXILIARES ==========
  const exportData = () => {
    // Simular exportação
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // ========== RENDERIZAÇÃO POR TAB ==========
  const renderPersonalTab = () => (
    <div className="tab-content">
      <div className="profile-picture-section">
        <div className="profile-picture-wrapper">
          <div className="profile-picture-preview">
            <img
              src={photoPreview || "/default-avatar.png"}
              alt="Foto de Perfil"
            />
            <div className="profile-picture-overlay">
              <FiCamera size={16} />
            </div>
          </div>
        </div>
        
        <label className="upload-button">
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
        <div className="form-group">
          <label>
            <FiUser className="icon-spacing" />
            Nome Completo
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            placeholder="Digite seu nome completo"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <FiCalendar className="icon-spacing" />
            Data de Nascimento
          </label>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <FiMail className="icon-spacing" />
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="form-divider">
          <FiLock /> Alteração de Senha
        </div>

        <div className="checkbox-group" onClick={() => setChangePassword(!changePassword)}>
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
          <div className="password-section">
            <div className="form-group">
              <label>Senha Atual</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword.current ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite sua senha atual"
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("current")}
                >
                  {showPassword.current ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Nova Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword.new ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("new")}
                >
                  {showPassword.new ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite a senha novamente"
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("confirm")}
                >
                  {showPassword.confirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`form-message ${message.type}`}>
            {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{message.text}</span>
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
    <div className="tab-content">
      <div className="preferences-grid">
        <div className="preference-card">
          <div className="preference-header">
            <FiSun className="preference-icon" />
            <h3>Tema da Aplicação</h3>
          </div>
          <p>Escolha entre tema claro ou escuro</p>
          <div className="preference-control">
            <button 
              className={`theme-toggle-btn ${!darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(false)}
            >
              <FiSun /> Claro
            </button>
            <button 
              className={`theme-toggle-btn ${darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(true)}
            >
              <FiMoon /> Escuro
            </button>
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-header">
            <FiBell className="preference-icon" />
            <h3>Notificações</h3>
          </div>
          <p>Receber alertas e notificações</p>
          <div className="preference-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                name="notifications"
                checked={preferences.notifications}
                onChange={handleChange}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {preferences.notifications ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-header">
            <FiActivity className="preference-icon" />
            <h3>Relatório Semanal</h3>
          </div>
          <p>Receber resumo semanal por email</p>
          <div className="preference-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                name="weeklyReport"
                checked={preferences.weeklyReport}
                onChange={handleChange}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">
              {preferences.weeklyReport ? 'Ativado' : 'Desativado'}
            </span>
          </div>
        </div>

        <div className="preference-card">
          <div className="preference-header">
            <FiGlobe className="preference-icon" />
            <h3>Moeda Padrão</h3>
          </div>
          <p>Selecione sua moeda principal</p>
          <select 
            className="form-input"
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

      <div className="preferences-actions">
        <button className="btn-secondary" onClick={exportData}>
          <FiDownload /> Exportar Configurações
        </button>
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="tab-content">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiCalendar />
          </div>
          <div className="stat-info">
            <h3>Data de Cadastro</h3>
            <p>{formatDate(stats.joinedDate)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiClock />
          </div>
          <div className="stat-info">
            <h3>Último Acesso</h3>
            <p>{formatDate(stats.lastLogin)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiDatabase />
          </div>
          <div className="stat-info">
            <h3>Transações</h3>
            <p>{stats.totalTransactions} registros</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FiSmartphone />
          </div>
          <div className="stat-info">
            <h3>Dispositivos</h3>
            <p>{stats.devices} conectado(s)</p>
          </div>
        </div>
      </div>

      <div className="data-actions">
        <h3>Gerenciamento de Dados</h3>
        <div className="action-buttons">
          <button className="btn-primary" onClick={exportData}>
            <FiDownload /> Exportar Meus Dados
          </button>
          <button className="btn-secondary">
            <FiDatabase /> Limpar Cache
          </button>
        </div>
      </div>
    </div>
  );

  // ========== RENDER PRINCIPAL ==========
  if (isLoading) {
    return (
      <Fragment>
        <Header />
        <div className="profile-container">
          <div className="loading-profile">
            <div className="loader"></div>
            <p>Carregando perfil...</p>
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
              className={`tab-btn ${activeTab === "personal" ? "active" : ""}`}
              onClick={() => setActiveTab("personal")}
            >
              <FiUser /> Pessoal
            </button>
            <button 
              className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`}
              onClick={() => setActiveTab("preferences")}
            >
              <FiSun /> Preferências
            </button>
            <button 
              className={`tab-btn ${activeTab === "stats" ? "active" : ""}`}
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
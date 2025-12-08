import { Fragment, useState } from "react";
import { 
  FiUser, FiMail, FiCalendar, FiLock, 
  FiCamera, FiSave, FiCheckCircle, FiAlertCircle 
} from "react-icons/fi";
import Header from "../Components/Header";
import "../Styles/Profile.css";

function Profile() {
  const [formData, setFormData] = useState({
    name: "Filipe Lima",
    email: "filipe@email.com",
    birthDate: "2001-10-12",
    photo: null,
    newPassword: "",
    confirmPassword: "",
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [changePassword, setChangePassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && name === "photo") {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        setFormData((prev) => ({ ...prev, photo: file }));
        setPhotoPreview(URL.createObjectURL(file));
        setMessage({ type: 'success', text: 'Foto carregada com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida.' });
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setMessage({ type: '', text: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validação de senha
    if (changePassword) {
      if (!formData.newPassword || !formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Preencha ambos os campos de senha.' });
        setIsSubmitting(false);
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem!' });
        setIsSubmitting(false);
        return;
      }
      
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
        setIsSubmitting(false);
        return;
      }
    }

    // Simulação de requisição
    setTimeout(() => {
      console.log("Dados enviados:", formData);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setIsSubmitting(false);
      
      // Reset após sucesso
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    }, 1500);
  };

  return (
    <Fragment>
      <Header />
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h1>Meu Perfil</h1>
            <p className="profile-subtitle">Gerencie suas informações pessoais</p>
          </div>

          {/* Foto de Perfil */}
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

          {/* Mensagens de Status */}
          {message.text && (
            <div className={`form-message ${message.type}`}>
              {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Formulário */}
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

            <div className="form-divider">Alteração de Senha</div>

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
                  <label>Nova Senha</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="form-group">
                  <label>Confirmar Nova Senha</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite a senha novamente"
                  />
                </div>
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
      </div>
    </Fragment>
  );
}

export default Profile;
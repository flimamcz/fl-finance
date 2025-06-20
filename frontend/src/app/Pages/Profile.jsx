import { Fragment, useState } from "react";
import "../Styles/Profile.css";

import Header from "../Components/Header";

function Profile() {
  const [formData, setFormData] = useState({
    name: "Filipe Lima",
    email: "filipe@email.com",
    birthDate: "1998-04-25",
    photo: null,
    newPassword: "",
    confirmPassword: "",
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [changePassword, setChangePassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && name === "photo") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (changePassword && formData.newPassword !== formData.confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    console.log("Dados enviados:", formData);
    alert("Perfil atualizado com sucesso!");
  };

  return (
    <Fragment>
      <Header />
      <div className="profile-container">
        <h1>Perfil</h1>

        <div className="profile-picture-preview">
          <img
            src={photoPreview || "/default-avatar.png"}
            alt="Foto de Perfil"
          />
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Alterar Foto:</label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Data de Nascimento:</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <hr />

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={changePassword}
                onChange={() => setChangePassword(!changePassword)}
              />
              Deseja alterar a senha?
            </label>
          </div>

          {changePassword && (
            <>
              <div className="form-group">
                <label>Nova Senha:</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required={changePassword}
                />
              </div>

              <div className="form-group">
                <label>Confirmar Nova Senha:</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={changePassword}
                />
              </div>
            </>
          )}

          <button type="submit">Salvar</button>
        </form>
      </div>
    </Fragment>
  );
}

export default Profile;

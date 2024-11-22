import Porco from "../../assets/porco-cofre.png";
import Profile from "../../assets/gg_profile.png";
import "../Styles/Header.css";


function Header() {
  return (
    <header>
      <div>
        <img src={Porco} alt="Icone-logo de um porco - fl finanças" />
      </div>
      <h1>Controle financeiro</h1>
      <button type="button">
        <img src={Profile} alt="Icone de perfil" />
      </button>
    </header>
  );
}

export default Header;

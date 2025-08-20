import { Link } from "react-router-dom";

import Porco from "../../assets/porco-cofre.png";
import Profile from "../../assets/gg_profile.png";
import "../Styles/Header.css";

function Header() {
  return (
    <header>
      <div>
        <Link to="/home">
          <img src={Porco} alt="Icone-logo de um porco - fl finanças" />
        </Link>
      </div>
      <h1>Controle financeiro</h1>
      <div>
        <Link to="/profile">
          <img src={Profile} alt="Icone de perfil" />
        </Link>
      </div>
    </header>
  );
}

export default Header;

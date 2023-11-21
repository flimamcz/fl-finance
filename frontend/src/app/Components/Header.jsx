import Porco from "../../assets/porco-cofre.png";
import Profile from "../../assets/gg_profile.png";

function Header() {
  return (
    <header>
      <div>
        <img src={Porco} alt="Icone-logo de um porco - fl finanças" />
      </div>

      <div>
        <img src={Profile} alt="Icone de perfil" />
      </div>
    </header>
  );
}

export default Header;

import Header from "../Components/Header";
import IconBank from "../../assets/BANK-ICON.png";

function Home() {
  return (
    <div>
      <Header />

      <section>
        <div className="card-demonstrative balance">
          <span>
            <h2>Saldo atual</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>

        <div className="card-demonstrative recipes">
          <span>
            <h2>Entradas</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>

        <div className="card-demonstrative expenses">
          <span>
            <h2>Despesas</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>

        <div className="card-demonstrative investiment">
          <span>
            <h2>Investido</h2>
            <p>R$ 0,00</p>
          </span>
          <img src={IconBank} alt="Icone representando um banco" />
        </div>
      </section>
    </div>
  );
}

export default Home;

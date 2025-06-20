import { Route, Switch, Redirect } from "react-router-dom";

import Home from "./app/Pages/Home";
import Profile from "./app/Pages/Profile";

function App() {
  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/home" />
      </Route>
      <Route exact path="/home" component={Home} />
      <Route exact path="/profile" component={Profile} />
    </Switch>
  );
}

export default App;

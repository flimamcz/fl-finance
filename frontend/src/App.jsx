import { Route, Switch, Redirect } from "react-router-dom";

import Home from "./app/Pages/Home";

function App() {
  return (
    <Switch>
      <Route exact path="/">
        <Redirect to="/home" />
      </Route>
      <Route exact path="/home" component={Home} />
    </Switch>
  );
}

export default App;

import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import SalesAssistant from "./pages/SalesAssistant";

export default function App() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={Admin} />
    <Route path="/login" component={Login} />
    <Route path="/assistente" component={SalesAssistant} />
    <Route><Home /></Route>
  </Switch>;
}

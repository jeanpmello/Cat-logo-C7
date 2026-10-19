import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import Home from "./pages/Home";

const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));

function RouteLoading() {
  return <div className="route-loading" role="status" aria-live="polite">Carregando área C7 Store…</div>;
}

export default function App() {
  return <Suspense fallback={<RouteLoading />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route><Home /></Route>
    </Switch>
  </Suspense>;
}

import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";

const Home = lazy(() => import("./pages/Home"));
const Admin = lazy(() => import("./pages/Admin"));
const Login = lazy(() => import("./pages/Login"));
const SalesAssistant = lazy(() => import("./pages/SalesAssistant"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      Carregando página…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route path="/login" component={Login} />
        <Route path="/assistente" component={SalesAssistant} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

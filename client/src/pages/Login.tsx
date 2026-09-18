import { useEffect, useState } from "react";
import { KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
const LOGO = "/manus-storage/c7-logo_ae3d1307.png";
export default function Login() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: checking } = trpc.auth.me.useQuery();
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  const login = trpc.auth.privateLogin.useMutation({ onSuccess: () => { navigate("/admin"); }, onError: (err) => setError(err.message) });
  useEffect(() => { if (user) navigate("/admin"); }, [user, navigate]);
  if (checking) return <div className="private-login-loading"><Loader2 className="spin" size={24} /></div>;
  return <main className="private-login-page"><div className="private-login-glow" /><section className="private-login-card"><div className="private-login-brand"><img src={LOGO} alt="C7 Store" /><div><strong>C7 Store</strong><span>Painel privado</span></div></div><div className="private-login-intro"><span className="admin-kicker">/ área restrita</span><h1>Entrar no painel</h1><p>Use o usuário e a senha fornecidos pelo administrador da C7 Store.</p></div><form onSubmit={(event) => { event.preventDefault(); setError(""); login.mutate({ username, password }); }}><label className="private-login-field"><span><KeyRound size={14} /> Usuário</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="seu usuário" required /></label><label className="private-login-field"><span><LockKeyhole size={14} /> Senha</span><input value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" type="password" placeholder="sua senha" required /></label>{error && <div className="private-login-error">{error}</div>}<button className="admin-primary private-login-submit" disabled={login.isPending}>{login.isPending ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />} Entrar com segurança</button></form><div className="private-login-note"><ShieldCheck size={15} /><span>Login exclusivo da equipe. Não há cadastro com Google ou redes sociais.</span></div><a className="private-login-back" href="/">Voltar ao catálogo público</a></section></main>;
}

"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await login(usernameOrEmail, password); router.replace("/"); }
    catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <main className="auth-screen"><div className="auth-art"><div className="art-kicker">Restaurant operations</div><h1>Make every service feel considered.</h1><p>A focused workspace for the front of house, the pass, and everything moving behind it.</p><div className="art-rule" /><span>Built for the rhythm of a busy room.</span></div><form className="login-card" onSubmit={submit}><div className="brand auth-brand"><span className="brand-mark"><Building2 size={18} /></span><span>Plate &amp; Place</span></div><div><div className="eyebrow">Welcome back</div><h2>Sign in to your workspace</h2><p className="form-copy">Use your restaurant account to continue.</p></div><label>Username or email<input value={usernameOrEmail} onChange={(event) => setUsernameOrEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error ? <div className="form-error" role="alert">{error}</div> : null}<button className="primary-button" disabled={busy}>{busy ? "Signing in..." : "Enter workspace"}</button><span className="security-note">Your access is governed by your assigned permissions and branch access.</span></form></main>;
}
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { isBusinessDashboardRole } from "@/lib/roles";

type Mode = "login" | "forgot" | "verify" | "reset";
const resetKey = "novya-password-reset";
const errors: Record<string, string> = {
  user_not_found: "No account was found with this email address.",
  wrong_password: "The password is incorrect. Please try again.",
  email_not_verified: "Verify your email address before signing in.",
  role_not_allowed: "Please sign in with your business owner account.",
  missing_credentials: "Enter your email address and password.",
  auth_service_unavailable: "The sign-in service is unavailable. Please try again.",
  session_required: "Sign in to continue to your business.",
  session_expired: "Your session has expired. Please sign in again.",
  mfa_required: "Enter a fresh code from your authenticator app.",
  account_blocked: "This account is blocked. Please contact your administrator.",
};
const titles: Record<Mode, [string, string, string]> = {
  login: ["YOUR BUSINESS, CONNECTED", "Welcome back", "Sign in to your business owner account."],
  forgot: ["LET’S GET YOU BACK IN", "Forgot your password?", "Enter your email and we’ll send you a verification code."],
  verify: ["ONE QUICK CHECK", "Check your inbox", "Enter the six-digit verification code sent to"],
  reset: ["A FRESH START", "Set a new password", "Choose a strong password to protect your business."],
};
function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message || "We couldn’t complete your request. Please try again.";
}
export function AuthFlow({ mode }: { mode: Mode }) {
  return <Suspense fallback={<div className="auth-loading"><Loader2 className="animate-spin" /> Loading…</div>}><AuthForm key={mode} mode={mode} /></Suspense>;
}
function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(() => { const value = params.get("code") || params.get("error"); return value ? errors[value] || "Unable to sign in. Please check your details." : ""; });
  const [notice, setNotice] = useState(params.get("reset") === "success" ? "Password updated. Sign in with your new password." : "");
  const [resetOtp, setResetOtp] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [eyebrow, title, subtitle] = titles[mode];
  useEffect(() => {
    if (mode === "reset") {
      try {
        const saved = JSON.parse(sessionStorage.getItem(resetKey) || "null");
        if (saved?.email === params.get("email") && Date.now() - saved.at < 15 * 60_000) {
          // Session storage is browser-only; restore it after hydration.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setResetOtp(saved.otp);
        }
      } catch { /* Request another code for an invalid reset session. */ }
    }
  }, [params, mode]);
  useEffect(() => { if (cooldown <= 0) return; const timer = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  const change = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => { setter(event.target.value); setError(""); };
  function updateDigit(index: number, value: string) {
    const digits = value.replace(/\D/g, ""); if (!digits && value) return;
    const next = code.padEnd(6, " ").split(""); next[index] = digits.slice(-1) || " "; setCode(next.join("")); setError("");
    if (digits && index < 5) inputs.current[index + 1]?.focus();
  }
  async function resend() {
    if (resending || cooldown > 0 || !email) return; setResending(true); setError(""); setNotice("");
    try { await authApi.forgotPassword({ email: email.trim() }); setCooldown(60); setCode(""); setNotice("A new code has been sent. Use the latest email."); inputs.current[0]?.focus(); }
    catch (err) { setError(errorMessage(err)); } finally { setResending(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setError(""); setNotice("");
    if (mode === "verify" && !/^\d{6}$/.test(code)) { setError("Enter all six digits of your verification code."); return; }
    if (mode === "reset" && !resetOtp) { setError("Your reset session has expired. Request a new verification code."); return; }
    if (mode === "reset" && password !== confirmation) { setError("The passwords don’t match."); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        const target = params.get("callbackUrl");
        const redirectTo = target?.startsWith("/") && !target.startsWith("//") && !target.includes("\\") && !target.startsWith("/login") ? target : "/dashboard";
        // Do not reuse the login URL: its error/code query can make a successful sign-in look like a failure.
        const result = await signIn("credentials", { email: email.trim(), password, mfaCode, redirect: false, redirectTo });
        const url = result?.url ? new URL(result.url, window.location.origin) : null;
        const failure = result?.code || url?.searchParams.get("code") || result?.error;
        if (!result?.ok || failure) { if (failure === "mfa_required") setNeedsMfa(true); setError(errors[failure || ""] || "Your email or password is incorrect."); return; }
        const session = await getSession(); if (!session || !isBusinessDashboardRole(session.user?.role)) { setError(errors.role_not_allowed); return; }
        // Start with the new session cookie and discard any pre-login route/session cache.
        window.location.replace(redirectTo);
      } else if (mode === "forgot") {
        sessionStorage.removeItem(resetKey); await authApi.forgotPassword({ email: email.trim() }); router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
      } else if (mode === "verify") {
        await authApi.verifyResetOtp({ email, otp: code }); sessionStorage.setItem(resetKey, JSON.stringify({ email, otp: code, at: Date.now() })); router.replace(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        await authApi.resetPassword({ email, otp: resetOtp, password, confirmPassword: confirmation }); sessionStorage.removeItem(resetKey); router.replace("/login?reset=success");
      }
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <div className="auth-card">
    <Link href="/login" className="auth-brand" aria-label="NOVYA sign in"><span className="auth-monogram">N</span><span>NOVYA</span></Link>
    <div className="auth-heading"><span className="auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p>{mode === "verify" && <strong className="auth-email">{email || "your email address"}</strong>}</div>
    <form onSubmit={submit} className="auth-form">
      {(mode === "login" || mode === "forgot") && <label className="auth-field">Email address<input type="email" name="email" autoComplete="email" placeholder="you@yourbusiness.com" value={email} onChange={change(setEmail)} required disabled={busy} /></label>}
      {(mode === "login" || mode === "reset") && <label className="auth-field"><span className="auth-label-row">{mode === "login" ? "Password" : "New password"}{mode === "login" && <Link href="/forgot-password">Forgot password?</Link>}</span><span className="auth-password"><input name="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"} value={password} onChange={change(setPassword)} minLength={mode === "reset" ? 6 : undefined} required disabled={busy} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
      {mode === "reset" && <><label className="auth-field">Confirm new password<input type="password" name="confirmation" autoComplete="new-password" placeholder="Enter your new password again" value={confirmation} onChange={change(setConfirmation)} required minLength={6} disabled={busy} /></label><div className="auth-password-rules"><span className={password.length >= 6 ? "met" : ""}><Check size={13} /> At least 6 characters</span><span className={confirmation && password === confirmation ? "met" : ""}><Check size={13} /> Passwords match</span></div></>}
      {mode === "login" && needsMfa && <label className="auth-field">Authenticator code<input autoFocus type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" value={mfaCode} onChange={change(setMfaCode)} required disabled={busy} /></label>}
      {mode === "verify" && <fieldset className="auth-code-group" disabled={busy || !email}><legend className="sr-only">Six-digit verification code</legend><div className="auth-code-inputs" onPaste={event => { const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (!pasted) return; event.preventDefault(); setCode(pasted); setError(""); inputs.current[Math.min(pasted.length, 5)]?.focus(); }}>{Array.from({ length: 6 }, (_, i) => <input key={i} ref={element => { inputs.current[i] = element; }} aria-label={`Digit ${i + 1}`} type="text" inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={i === 0 ? 6 : 1} value={code[i]?.trim() || ""} onChange={e => { if (e.target.value.length === 6) { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); inputs.current[5]?.focus(); } else updateDigit(i, e.target.value); }} onKeyDown={e => { if (e.key === "Backspace" && !code[i]?.trim() && i > 0) inputs.current[i - 1]?.focus(); if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus(); if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus(); }} />)}</div></fieldset>}
      {error && <div className="auth-feedback error" role="alert">{error}</div>}{notice && <div className="auth-feedback success" role="status">{notice}</div>}
      {((mode === "verify" && !email) || (mode === "reset" && !resetOtp)) && <Link className="auth-recovery" href="/forgot-password">Request a new verification code <ArrowRight size={15} /></Link>}
      <button className="auth-submit" type="submit" disabled={busy || (mode === "verify" && !email) || (mode === "reset" && !resetOtp)}>{busy ? <><Loader2 size={17} className="animate-spin" />{mode === "login" ? "Signing in…" : "Please wait…"}</> : <>{mode === "login" ? "Sign in to your business" : mode === "forgot" ? "Send verification code" : mode === "verify" ? "Verify code" : "Reset password"}<ArrowRight size={17} /></>}</button>
    </form>
    {mode === "verify" && <p className="auth-resend">Didn’t receive a code? <button type="button" onClick={resend} disabled={resending || cooldown > 0 || !email}>{resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button></p>}
    {mode !== "login" && <Link href="/login" className="auth-back"><ArrowLeft size={15} /> Back to sign in</Link>}
    <div className="auth-security"><ShieldCheck size={14} /> Your business. Your data. Protected.</div>
    <p className="auth-account-note">Business owner access</p>
  </div>;
}

import { useRef, useState, type FormEvent } from "react";
import { api, RequestError } from "../lib/api";
import { EMAIL_RE } from "../lib/contact";
import { useSession } from "../lib/session";
import { useUI } from "../lib/ui";
import { Brand, LangMenu, ThemeToggle } from "./HeaderControls";
import { AlertCircle, Check } from "./Icons";

type Mode = "login" | "register";
type Field = "username" | "email" | "password";

export default function AuthScreen() {
  const { t, rootClass, lang } = useUI();
  const { signIn, expired } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [values, setValues] = useState({ username: "", email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(expired ? t.session_expired : null);
  const [busy, setBusy] = useState(false);
  const [flip, setFlip] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const isRegister = mode === "register";

  const errors: Partial<Record<Field, string>> = {};
  if (isRegister && !values.username.trim()) errors.username = t.e_username;
  if (!EMAIL_RE.test(values.email.trim())) errors.email = t.e_email;
  if (isRegister && values.password.length < 8) errors.password = t.e_password;
  if (!isRegister && !values.password) errors.password = t.e_password_req;

  const visible = (f: Field) => !!errors[f] && (submitted || !!touched[f]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setTouched({});
    setSubmitted(false);
    setServerError(null);
    setFlip((n) => n + 1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    const first = (["username", "email", "password"] as Field[]).find((f) => errors[f]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`#a-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const auth = isRegister
        ? await api.register(values.username.trim(), values.email.trim(), values.password)
        : await api.login(values.email.trim(), values.password);
      signIn(auth);
    } catch (err) {
      const status = err instanceof RequestError ? err.status : 0;
      setServerError(
        status === 401 ? t.e_login
          : status === 409 ? t.e_registered
            : status === 0 || status >= 500 ? t.e_network
              : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (f: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <label className="lbl" htmlFor={`a-${f}`}>{label}</label>
      <div className={visible(f) ? "field invalid" : "field"}>
        <input id={`a-${f}`} value={values[f]} aria-invalid={visible(f)} aria-describedby={`ae-${f}`}
          onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
          onBlur={() => setTouched((tt) => ({ ...tt, [f]: true }))} {...props} />
      </div>
      {visible(f)
        ? <p className="err" id={`ae-${f}`} style={{ marginBottom: 0 }}><AlertCircle size={16} style={{ flex: "none", marginTop: 1 }} />{errors[f]}</p>
        : hint ? <p className="hint" id={`ae-${f}`} style={{ marginBottom: 0 }}>{hint}</p> : null}
    </div>
  );

  return (
    <div className={rootClass} lang={lang} style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <header className="fx-header glass auth-header">
        <Brand />
        <div style={{ flex: 1 }} />
        <LangMenu />
        <ThemeToggle />
      </header>

      <main className="desk scroll auth-main">
        <div className="auth-col">
          <p className="auth-tagline fadeup">{t.auth_tagline}</p>

          <div className={`stack ${flip % 2 ? "flip-b" : "flip-a"}`}>
            <form ref={formRef} className="card" noValidate onSubmit={submit} aria-labelledby="a-title">
              <span className="card-tab" aria-hidden="true" lang="ja">縁</span>

              <div className="rv" style={{ ["--d" as string]: 0, padding: "30px 28px 4px" }}>
                <h1 id="a-title" className="auth-title">{isRegister ? t.register_title : t.login_title}</h1>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>{isRegister ? t.register_sub : t.login_sub}</p>
              </div>

              {serverError && (
                <div role="alert" className="fadeup form-alert">
                  <AlertCircle size={18} className="wiggle" style={{ flex: "none" }} />{serverError}
                </div>
              )}

              <div className="rv" style={{ ["--d" as string]: 1, padding: "20px 28px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
                {isRegister && field("username", t.username, { autoComplete: "name" })}
                {field("email", t.email, { type: "email", autoComplete: "email", placeholder: t.email_ph, inputMode: "email" })}
                {field("password", t.password, { type: "password", autoComplete: isRegister ? "new-password" : "current-password" }, isRegister ? t.password_hint : undefined)}
              </div>

              <div className="rv" style={{ ["--d" as string]: 2, padding: "16px 28px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <button type="submit" className="btn btn-primary" style={{ height: 44 }} disabled={busy} aria-busy={busy}>
                  {busy ? <span className="spinner" aria-hidden="true" /> : <Check size={16} sw={2.4} />}
                  {isRegister ? t.register : t.login}
                </button>
                <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", textAlign: "center" }}>
                  {isRegister ? t.has_account : t.no_account}{" "}
                  <button type="button" className="link-btn" onClick={() => switchMode(isRegister ? "login" : "register")}>
                    {isRegister ? t.login : t.register}
                  </button>
                </p>
              </div>
            </form>
          </div>

          <figure className="auth-quote fadeup" style={{ ["--d" as string]: 3 }}>
            <blockquote lang="ja">袖振り合うも他生の縁</blockquote>
            <figcaption>{t.auth_quote}</figcaption>
          </figure>
        </div>
      </main>
    </div>
  );
}

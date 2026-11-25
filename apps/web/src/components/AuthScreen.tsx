import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { isValidationError, loginSchema, registerSchema } from "@enishi/shared";
import { api, RequestError } from "../lib/api";
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
  const [serverError, setServerError] = useState<string | null>(expired ? t.session_expired : null);
  const [flip, setFlip] = useState(0);

  const isRegister = mode === "register";
  const schema = isRegister ? registerSchema : loginSchema;

  const form = useForm({
    defaultValues: { username: "", email: "", password: "" },
    // Shared with the API. Login only needs both fields filled; register checks format and length.
    validators: { onChange: schema, onBlur: schema },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        if (isRegister) {
          const input = registerSchema(value);
          if (isValidationError(input)) return;
          signIn(await api.register(input.username, input.email, input.password));
        } else {
          const input = loginSchema(value);
          if (isValidationError(input)) return;
          signIn(await api.login(input.email, input.password));
        }
      } catch (err) {
        const status = err instanceof RequestError ? err.status : 0;
        setServerError(
          status === 401 ? t.e_login
            : status === 409 ? t.e_registered
              : status === 0 || status >= 500 ? t.e_network
                : (err as Error).message,
        );
      }
    },
    onSubmitInvalid: () => {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form.card [aria-invalid="true"]')?.focus());
    },
  });

  const attempted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  const switchMode = (m: Mode) => {
    setMode(m);
    // Keep what was typed, but start validation fresh for the new mode.
    form.reset(form.state.values);
    setServerError(null);
    setFlip((n) => n + 1);
  };

  const messages: Record<Field, string> = {
    username: t.e_username,
    email: t.e_email,
    password: isRegister ? t.e_password : t.e_password_req,
  };

  const field = (name: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <form.Field name={name}>
      {(f) => {
        const visible = !f.state.meta.isValid && (f.state.meta.isBlurred || attempted);
        return (
          <div>
            <label className="lbl" htmlFor={`a-${name}`}>{label}</label>
            <div className={visible ? "field invalid" : "field"}>
              <input id={`a-${name}`} name={name} value={f.state.value} aria-invalid={visible} aria-describedby={`ae-${name}`}
                onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur} {...props} />
            </div>
            {visible
              ? <p className="err" id={`ae-${name}`} style={{ marginBottom: 0 }}><AlertCircle size={16} style={{ flex: "none", marginTop: 1 }} />{messages[name]}</p>
              : hint ? <p className="hint" id={`ae-${name}`} style={{ marginBottom: 0 }}>{hint}</p> : null}
          </div>
        );
      }}
    </form.Field>
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
            <form className="card" noValidate aria-labelledby="a-title"
              onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}>
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
                <button type="submit" className="btn btn-primary" style={{ height: 44 }} disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? <span className="spinner" aria-hidden="true" /> : <Check size={16} sw={2.4} />}
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

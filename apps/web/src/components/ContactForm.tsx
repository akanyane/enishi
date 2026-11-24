import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import type { Contact } from "@enishi/shared";
import { cleanTag, EMAIL_RE, fullName, indexLetter, PHONE_RE, type FormState } from "../lib/contact";
import type { Dict } from "../lib/i18n";
import { useUI } from "../lib/ui";
import { AlertCircle, Check, X } from "./Icons";

export interface FormErrors {
  firstName?: string;
  email?: string;
  phone?: string;
  /** Id of the contact that already uses this email. */
  dupId?: string;
}

/** Client-side validation, mirrored by the API. */
export function validateForm(f: FormState, editingId: string | null, all: Contact[], t: Dict): FormErrors {
  const e: FormErrors = {};
  if (!f.firstName.trim()) e.firstName = t.e_first;
  const email = f.email.trim().toLowerCase();
  if (email) {
    if (!EMAIL_RE.test(email)) e.email = t.e_email;
    else {
      const dup = all.find((c) => c.id !== editingId && c.email.toLowerCase() === email);
      if (dup) { e.email = t.e_dup(fullName(dup)); e.dupId = dup.id; }
    }
  }
  if (f.phone.trim() && !PHONE_RE.test(f.phone.trim())) e.phone = t.e_tel;
  return e;
}

type Validated = "firstName" | "email" | "phone";

interface Props {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState | null>>;
  errors: FormErrors;
  touched: Partial<Record<keyof FormErrors, boolean>>;
  setTouched: Dispatch<SetStateAction<Partial<Record<keyof FormErrors, boolean>>>>;
  submitted: boolean;
  saving: boolean;
  editing: Contact | null;
  tagNames: string[];
  flip: number;
  onCancel: () => void;
  onSave: () => void;
  onOpenDuplicate: (id: string) => void;
}

const d = (n: number) => ({ ["--d" as string]: n });

export default function ContactForm(p: Props) {
  const { t } = useUI();
  const { form: f, errors } = p;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => p.setForm((cur) => (cur ? { ...cur, [k]: v } : cur));
  const visible = (k: Validated) => !!errors[k] && (p.submitted || !!p.touched[k]);
  const fieldCls = (k: Validated) => (visible(k) ? "field invalid" : "field");
  const blur = (k: Validated) => () => p.setTouched((tt) => ({ ...tt, [k]: true }));
  const nErr = (["firstName", "email", "phone"] as Validated[]).filter((k) => errors[k] && p.submitted).length;

  const addTag = (raw: string) => {
    const tg = cleanTag(raw);
    p.setForm((cur) => (cur ? { ...cur, tagDraft: "", tags: tg && !cur.tags.includes(tg) ? [...cur.tags, tg] : cur.tags } : cur));
  };
  const removeTag = (tg: string) => p.setForm((cur) => (cur ? { ...cur, tags: cur.tags.filter((x) => x !== tg) } : cur));
  const tagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(e.currentTarget.value); }
    else if (e.key === "Backspace" && !e.currentTarget.value && f.tags.length) removeTag(f.tags[f.tags.length - 1]);
  };
  const sugs = p.tagNames.filter((tg) => !f.tags.includes(tg)).slice(0, 5);

  const err = (k: Validated) => visible(k) && (
    <div className="err" id={`e-${k}`}>
      <AlertCircle size={16} style={{ flex: "none", marginTop: 1 }} />
      <span>
        {errors[k]}{" "}
        {k === "email" && errors.dupId && (
          <button type="button" onClick={() => p.onOpenDuplicate(errors.dupId!)}>{t.open_contact}</button>
        )}
      </span>
    </div>
  );

  return (
    <div className={`stack ${p.flip % 2 ? "flip-b" : "flip-a"}`}>
      <form className="card" aria-labelledby="f-title" noValidate onSubmit={(e) => { e.preventDefault(); p.onSave(); }}>
        <span className="card-tab" aria-hidden="true">{p.editing ? indexLetter(p.editing.firstName) : t.tab_new}</span>
        <div className="rv" style={{ ...d(0), padding: "30px 28px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 id="f-title" className="form-title">{p.editing ? t.edit_title : t.new_title}</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{t.req_a}<span style={{ color: "var(--danger)" }}>*</span>{t.req_b}</p>
        </div>

        {p.submitted && nErr > 0 && (
          <div role="alert" className="fadeup form-alert">
            <AlertCircle size={18} className="wiggle" style={{ flex: "none" }} />{nErr === 1 ? t.sum1 : t.sumN(nErr)}
          </div>
        )}

        <div className="form-grid rv" style={d(1)}>
          <div>
            <label className="lbl" htmlFor="f-firstName">{t.f_first} <span className="req" aria-hidden="true">*</span></label>
            <div className={fieldCls("firstName")}>
              <input id="f-firstName" autoComplete="given-name" aria-required="true" aria-invalid={visible("firstName")} aria-describedby="e-firstName"
                value={f.firstName} onChange={(e) => set("firstName", e.target.value)} onBlur={blur("firstName")} />
            </div>
            {err("firstName")}
          </div>
          <div>
            <label className="lbl" htmlFor="f-lastName">{t.f_last}</label>
            <div className="field"><input id="f-lastName" autoComplete="family-name" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
          </div>
          <div>
            <label className="lbl" htmlFor="f-email">{t.email}</label>
            <div className={fieldCls("email")}>
              <input id="f-email" type="email" autoComplete="email" placeholder={t.email_ph} aria-invalid={visible("email")} aria-describedby="e-email"
                value={f.email} onChange={(e) => set("email", e.target.value)} onBlur={blur("email")} />
            </div>
            {err("email")}
          </div>
          <div>
            <label className="lbl" htmlFor="f-phone">{t.phone}</label>
            <div className={fieldCls("phone")}>
              <input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 (11) 91234-5678" className="tnum"
                aria-invalid={visible("phone")} aria-describedby="e-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} onBlur={blur("phone")} />
            </div>
            {err("phone")}
          </div>
          <div>
            <label className="lbl" htmlFor="f-company">{t.company}</label>
            <div className="field"><input id="f-company" autoComplete="organization" value={f.company} onChange={(e) => set("company", e.target.value)} /></div>
          </div>
          <div>
            <label className="lbl" htmlFor="f-jobTitle">{t.role}</label>
            <div className="field"><input id="f-jobTitle" autoComplete="organization-title" value={f.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="lbl" htmlFor="f-tags">{t.tags}</label>
            <div className="field" style={{ height: "auto", minHeight: 46, flexWrap: "wrap", gap: 6, padding: "7px 10px" }}>
              {f.tags.map((tg) => (
                <span key={tg} className="chip soft tag-in">{tg}
                  <button type="button" className="chip-x" aria-label={t.rm_tag(tg)} onClick={() => removeTag(tg)}><X size={12} sw={2.6} /></button>
                </span>
              ))}
              <input id="f-tags" aria-describedby="h-tags" placeholder={t.tag_ph} style={{ height: 30, minWidth: 120 }} value={f.tagDraft}
                onChange={(e) => { const v = e.target.value; if (v.includes(",")) addTag(v.replace(/,/g, "")); else set("tagDraft", v); }}
                onKeyDown={tagKey} onBlur={(e) => { if (e.currentTarget.value.trim()) addTag(e.currentTarget.value); }} />
            </div>
            <p className="hint" id="h-tags">{t.tags_hint}</p>
            {sugs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: 13, color: "var(--muted)", marginRight: 2 }}>{t.sugs}</span>
                {sugs.map((tg) => (
                  <button key={tg} type="button" className="chip" style={{ height: 26, fontSize: 12 }} aria-label={t.add_tag(tg)} onClick={() => addTag(tg)}>+ {tg}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="lbl" htmlFor="f-notes">{t.notes}</label>
            <div className="field area"><textarea id="f-notes" rows={5} placeholder={t.notes_ph} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
        </div>

        <div className="form-foot rv" style={d(2)}>
          <button type="button" role="switch" className="switch" aria-checked={f.favorite} onClick={() => set("favorite", !f.favorite)}>
            <span className="track"><span className="thumb" /></span>{t.mark_fav}
          </button>
          <button type="button" className="btn btn-light" onClick={p.onCancel}>{t.cancel}</button>
          <button type="submit" className="btn btn-primary" disabled={p.saving} aria-busy={p.saving}>
            {p.saving ? <span className="spinner" aria-hidden="true" /> : <Check size={16} sw={2.4} />}
            {p.saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

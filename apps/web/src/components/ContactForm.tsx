import { useState, type KeyboardEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { cleanTag, contactCreateSchema, isValidationError, type Contact, type ContactInput } from "@enishi/shared";
import { fullName, indexLetter } from "../lib/contact";
import { useUI } from "../lib/ui";
import { AlertCircle, Check, X } from "./Icons";

/** Fields with validation rules, in the order they appear (and get focus). */
const VALIDATED = ["firstName", "email", "phone"] as const;
type Validated = (typeof VALIDATED)[number];

/** Errors the API returned for a submit, keyed by field. */
export type ServerFieldErrors = Partial<Record<Validated, { duplicateId?: string }>>;
export type SaveResult = { ok: true } | { ok: false; fields?: ServerFieldErrors };

/** Prefix for the client-side duplicate-email error, followed by the other contact's id. */
const DUP = "duplicate:";

/** Id of another contact that already uses this email, ignoring case and spaces. */
export function findDuplicate(email: string, contacts: Contact[], editingId: string | null) {
  const value = email.trim().toLowerCase();
  if (!value) return undefined;
  return contacts.find((c) => c.id !== editingId && c.email.toLowerCase() === value)?.id;
}

interface Props {
  initial: ContactInput;
  editing: Contact | null;
  contacts: Contact[];
  tagNames: string[];
  flip: number;
  onCancel: () => void;
  onSave: (input: ContactInput) => Promise<SaveResult>;
  onOpenDuplicate: (id: string) => void;
}

const d = (n: number) => ({ ["--d" as string]: n });

export default function ContactForm({ initial, editing, contacts, tagNames, flip, onCancel, onSave, onOpenDuplicate }: Props) {
  const { t } = useUI();
  const [tagDraft, setTagDraft] = useState("");
  const [serverErrors, setServerErrors] = useState<ServerFieldErrors>({});

  const form = useForm({
    defaultValues: initial,
    // The same schema the API uses. Running it on blur too shows "required"
    // as soon as the user leaves an empty field, like the design.
    validators: { onChange: contactCreateSchema, onBlur: contactCreateSchema },
    onSubmit: async ({ value }) => {
      const parsed = contactCreateSchema(value); // normalized: trimmed, lowercase email, clean tags
      if (isValidationError(parsed)) return;
      const result = await onSave(parsed);
      if (!result.ok) setServerErrors(result.fields ?? {});
    },
    onSubmitInvalid: () => {
      // Wait for the errors to render, then focus the first invalid field.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form.card [aria-invalid="true"]')?.focus());
    },
  });

  const attempted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const tags = useStore(form.store, (s) => s.values.tags);
  // How many validated fields currently show an error, for the summary banner.
  const invalidCount = useStore(form.store, (s) =>
    VALIDATED.filter((k) => s.fieldMeta[k] && !s.fieldMeta[k].isValid).length,
  );
  const serverCount = VALIDATED.filter((k) => serverErrors[k]).length;
  const summaryCount = attempted ? Math.max(invalidCount, serverCount) : 0;

  const clearServerError = (k: Validated) =>
    setServerErrors((cur) => (cur[k] ? { ...cur, [k]: undefined } : cur));

  const setTags = (next: string[]) => form.setFieldValue("tags", next);
  const addTag = (raw: string) => {
    const tg = cleanTag(raw);
    if (tg && !tags.includes(tg)) setTags([...tags, tg]);
    setTagDraft("");
  };
  const tagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(e.currentTarget.value); }
    else if (e.key === "Backspace" && !e.currentTarget.value && tags.length) setTags(tags.slice(0, -1));
  };
  const sugs = tagNames.filter((tg) => !tags.includes(tg)).slice(0, 5);

  const submit = () => {
    // A tag still being typed counts, like pressing Enter.
    if (tagDraft.trim()) addTag(tagDraft);
    void form.handleSubmit();
  };

  /** Message for a validated field, in the user's language. */
  const messageFor = (k: Validated, errors: unknown[]): { text: string; duplicateId?: string } | null => {
    const server = serverErrors[k];
    const dupError = errors.find((e): e is string => typeof e === "string" && e.startsWith(DUP));
    const schemaError = errors.some((e) => typeof e !== "string" || !e.startsWith(DUP));
    if (k === "firstName" && (schemaError || server)) return { text: t.e_first };
    if (k === "phone" && (schemaError || server)) return { text: t.e_tel };
    if (k === "email") {
      if (schemaError) return { text: t.e_email };
      const duplicateId = dupError?.slice(DUP.length) ?? server?.duplicateId;
      const dup = duplicateId ? contacts.find((c) => c.id === duplicateId) : undefined;
      if (dup) return { text: t.e_dup(fullName(dup)), duplicateId: dup.id };
      if (server) return { text: t.e_email };
    }
    return null;
  };

  const validatedField = (k: Validated, label: string, input: React.InputHTMLAttributes<HTMLInputElement>, required = false) => (
    <form.Field
      name={k}
      validators={k === "email" ? {
        // Duplicates depend on loaded data, so they're checked here rather than in the shared schema.
        onChange: ({ value }) => { const id = findDuplicate(value, contacts, editing?.id ?? null); return id ? DUP + id : undefined; },
        onBlur: ({ value }) => { const id = findDuplicate(value, contacts, editing?.id ?? null); return id ? DUP + id : undefined; },
      } : undefined}
    >
      {(field) => {
        const msg = messageFor(k, field.state.meta.errors);
        const visible = !!msg && (field.state.meta.isBlurred || attempted || !!serverErrors[k]);
        return (
          <div>
            <label className="lbl" htmlFor={`f-${k}`}>
              {label}{required && <> <span className="req" aria-hidden="true">*</span></>}
            </label>
            <div className={visible ? "field invalid" : "field"}>
              <input id={`f-${k}`} name={k} aria-invalid={visible} aria-describedby={`e-${k}`} aria-required={required || undefined}
                value={field.state.value}
                onChange={(e) => { field.handleChange(e.target.value); clearServerError(k); }}
                onBlur={field.handleBlur} {...input} />
            </div>
            {visible && msg && (
              <div className="err" id={`e-${k}`}>
                <AlertCircle size={16} style={{ flex: "none", marginTop: 1 }} />
                <span>
                  {msg.text}{" "}
                  {msg.duplicateId && <button type="button" onClick={() => onOpenDuplicate(msg.duplicateId!)}>{t.open_contact}</button>}
                </span>
              </div>
            )}
          </div>
        );
      }}
    </form.Field>
  );

  const textField = (k: "lastName" | "company" | "jobTitle", label: string, autoComplete: string) => (
    <form.Field name={k}>
      {(field) => (
        <div>
          <label className="lbl" htmlFor={`f-${k}`}>{label}</label>
          <div className="field">
            <input id={`f-${k}`} name={k} autoComplete={autoComplete} value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
          </div>
        </div>
      )}
    </form.Field>
  );

  return (
    <div className={`stack ${flip % 2 ? "flip-b" : "flip-a"}`}>
      <form className="card" aria-labelledby="f-title" noValidate onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit(); }}>
        <span className="card-tab" aria-hidden="true">{editing ? indexLetter(editing.firstName) : t.tab_new}</span>
        <div className="rv" style={{ ...d(0), padding: "30px 28px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 id="f-title" className="form-title">{editing ? t.edit_title : t.new_title}</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{t.req_a}<span style={{ color: "var(--danger)" }}>*</span>{t.req_b}</p>
        </div>

        {summaryCount > 0 && (
          <div role="alert" className="fadeup form-alert">
            <AlertCircle size={18} className="wiggle" style={{ flex: "none" }} />{summaryCount === 1 ? t.sum1 : t.sumN(summaryCount)}
          </div>
        )}

        <div className="form-grid rv" style={d(1)}>
          {validatedField("firstName", t.f_first, { autoComplete: "given-name" }, true)}
          {textField("lastName", t.f_last, "family-name")}
          {validatedField("email", t.email, { type: "email", autoComplete: "email", placeholder: t.email_ph })}
          {validatedField("phone", t.phone, { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "+55 (11) 91234-5678", className: "tnum" })}
          {textField("company", t.company, "organization")}
          {textField("jobTitle", t.role, "organization-title")}

          <div style={{ gridColumn: "1 / -1" }}>
            <label className="lbl" htmlFor="f-tags">{t.tags}</label>
            <div className="field" style={{ height: "auto", minHeight: 46, flexWrap: "wrap", gap: 6, padding: "7px 10px" }}>
              {tags.map((tg) => (
                <span key={tg} className="chip soft tag-in">{tg}
                  <button type="button" className="chip-x" aria-label={t.rm_tag(tg)} onClick={() => setTags(tags.filter((x) => x !== tg))}><X size={12} sw={2.6} /></button>
                </span>
              ))}
              <input id="f-tags" aria-describedby="h-tags" placeholder={t.tag_ph} style={{ height: 30, minWidth: 120 }} value={tagDraft}
                onChange={(e) => { const v = e.target.value; if (v.includes(",")) addTag(v.replace(/,/g, "")); else setTagDraft(v); }}
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

          <form.Field name="notes">
            {(field) => (
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="lbl" htmlFor="f-notes">{t.notes}</label>
                <div className="field area">
                  <textarea id="f-notes" name="notes" rows={5} placeholder={t.notes_ph} value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
                </div>
              </div>
            )}
          </form.Field>
        </div>

        <div className="form-foot rv" style={d(2)}>
          <form.Field name="favorite">
            {(field) => (
              <button type="button" role="switch" className="switch" aria-checked={field.state.value} onClick={() => field.handleChange(!field.state.value)}>
                <span className="track"><span className="thumb" /></span>{t.mark_fav}
              </button>
            )}
          </form.Field>
          <button type="button" className="btn btn-light" onClick={onCancel}>{t.cancel}</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? <span className="spinner" aria-hidden="true" /> : <Check size={16} sw={2.4} />}
            {isSubmitting ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

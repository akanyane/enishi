import type { Contact } from "@enishi/shared";
import { avatarTone, fullName, indexLetter, initials, longDate, relativeDate, type SortKey } from "../lib/contact";
import { useUI } from "../lib/ui";
import type { ToastKey } from "./Overlays";
import { Briefcase, Building, ChevronLeft, Copy, Mail, Note, Pencil, Phone, Send, Star, Tag, Trash } from "./Icons";

interface Props {
  contact: Contact;
  sortKey: SortKey;
  flip: number;
  favPop: number;
  onBack: () => void;
  onEdit: () => void;
  onToggleFav: () => void;
  onDelete: () => void;
  onFilterTag: (tag: string) => void;
  onCopy: (text: string, toast: ToastKey) => void;
}

const d = (n: number) => ({ ["--d" as string]: n });

export default function ContactCard({ contact: c, sortKey, flip, favPop, onBack, onEdit, onToggleFav, onDelete, onFilterTag, onCopy }: Props) {
  const { t, lang } = useUI();
  const full = fullName(c);
  const letter = indexLetter(sortKey === "last" ? c.lastName || c.firstName : c.firstName);
  const sub = [c.jobTitle, c.company].filter(Boolean).join(" · ") || t.no_company_role;
  const tel = `tel:${c.phone.replace(/[^0-9+]/g, "")}`;
  const favLabel = c.favorite ? t.fav_remove : t.fav_add;
  const pop = favPop > 0 ? (favPop % 2 ? " pop-a" : " pop-b") : "";

  return (
    <>
      <button type="button" className="btn btn-light btn-sm only-narrow" style={{ margin: "-8px 0 36px -8px" }} onClick={onBack}>
        <ChevronLeft />{t.back}
      </button>
      <div className={`stack ${flip % 2 ? "flip-b" : "flip-a"}`}>
        <article className="card" aria-labelledby="d-nome">
          <span className="card-tab" aria-hidden="true">{letter}</span>

          <div className="detail-head">
            <span className={`av av-ring av-${avatarTone(full)}`} style={{ width: 80, height: 80, fontSize: 28 }} aria-hidden="true">{initials(c)}</span>
            <div className="rv" style={{ ...d(0), flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 id="d-nome" className="detail-name">{full}</h2>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "var(--muted)" }}>{sub}</p>
            </div>
            <div className="detail-actions rv" style={{ ...d(1), display: "flex", gap: 8, alignSelf: "flex-start" }}>
              <button type="button" className={`btn btn-bordered btn-icon tip fav${pop}`} data-tip={favLabel} aria-label={favLabel}
                aria-pressed={c.favorite} onClick={onToggleFav} style={{ color: c.favorite ? "var(--warning)" : "var(--foreground)" }}>
                <Star size={20} fill={c.favorite ? "currentColor" : "none"} />
              </button>
              <button type="button" className="btn btn-bordered" onClick={onEdit}><Pencil size={16} />{t.edit}</button>
            </div>
          </div>

          <div className="rv" style={{ ...d(2), display: "flex", gap: 8, flexWrap: "wrap", padding: "0 28px 22px" }}>
            {c.email && <a className="btn btn-bordered btn-sm pill" href={`mailto:${c.email}`}><Send size={15} />{t.send_email}</a>}
            {c.phone && <a className="btn btn-bordered btn-sm pill" href={tel}><Phone size={15} />{t.call}</a>}
            {c.tags.map((tg) => (
              <button key={tg} type="button" className="chip soft" style={{ height: 32 }} aria-label={t.filter_by(tg)} onClick={() => onFilterTag(tg)}>
                <Tag size={12} sw={2.4} style={{ color: "var(--muted)" }} />{tg}
              </button>
            ))}
          </div>

          <dl className="rv" style={{ ...d(3), margin: 0, padding: "0 28px" }}>
            <div className="fld" style={{ borderTop: "1px solid var(--ruled)" }}>
              <dt className="fld-l"><Mail size={16} />{t.email}</dt>
              <dd className="fld-v" style={{ margin: 0 }}>
                {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span style={{ color: "var(--muted)" }}>{t.not_informed}</span>}
              </dd>
              <dd style={{ margin: 0 }}>
                {c.email && (
                  <button type="button" className="btn btn-light btn-icon btn-sm tip tip-up" data-tip={t.copy_email} aria-label={t.copy_email}
                    onClick={() => onCopy(c.email, "copied_email")}><Copy size={16} /></button>
                )}
              </dd>
            </div>
            <div className="fld">
              <dt className="fld-l"><Phone size={16} />{t.phone}</dt>
              <dd className="fld-v tnum" style={{ margin: 0 }}>
                {c.phone ? <a href={tel}>{c.phone}</a> : <span style={{ color: "var(--muted)" }}>{t.not_informed}</span>}
              </dd>
              <dd style={{ margin: 0 }}>
                {c.phone && (
                  <button type="button" className="btn btn-light btn-icon btn-sm tip tip-up" data-tip={t.copy_phone} aria-label={t.copy_phone}
                    onClick={() => onCopy(c.phone, "copied_phone")}><Copy size={16} /></button>
                )}
              </dd>
            </div>
            <div className="fld">
              <dt className="fld-l"><Building size={16} />{t.company}</dt>
              <dd className="fld-v" style={{ margin: 0, color: c.company ? "inherit" : "var(--muted)" }}>{c.company || t.not_informed}</dd>
              <dd style={{ margin: 0 }} />
            </div>
            <div className="fld">
              <dt className="fld-l"><Briefcase size={16} />{t.role}</dt>
              <dd className="fld-v" style={{ margin: 0, color: c.jobTitle ? "inherit" : "var(--muted)" }}>{c.jobTitle || t.not_informed}</dd>
              <dd style={{ margin: 0 }} />
            </div>
          </dl>

          <div className="rv" style={{ ...d(4), padding: "24px 28px 8px" }}>
            <h3 className="notes-head"><Note size={16} />{t.notes}</h3>
            {c.notes
              ? <p className="ruled" style={{ margin: 0, fontSize: 15, whiteSpace: "pre-line", minHeight: 112, overflowWrap: "anywhere" }}>{c.notes}</p>
              : <p className="ruled" style={{ margin: 0, fontSize: 15, color: "var(--muted)", minHeight: 84 }}>{t.notes_empty}</p>}
          </div>

          <footer className="rv card-foot" style={d(5)}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: "18px", color: "var(--muted)" }}>
              {t.meta(longDate(c.createdAt, lang), relativeDate(c.updatedAt, lang))}
            </p>
            <button type="button" className="btn btn-danger-light btn-sm" onClick={onDelete}><Trash size={16} />{t.delete}</button>
          </footer>
        </article>
      </div>
    </>
  );
}

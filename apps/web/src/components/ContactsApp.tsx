import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Contact, ContactInput } from "@enishi/shared";
import { api, RequestError } from "../lib/api";
import {
  avatarTone, blankForm, daysAgo, formFrom, fullName, indexLetter, initials, isFamily, norm,
  titleCase, PHONE_RE, type FormState, type SortKey,
} from "../lib/contact";
import { useSession } from "../lib/session";
import { useUI } from "../lib/ui";
import { usePersisted } from "../lib/prefs";
import { Brand, LangMenu, ThemeToggle } from "./HeaderControls";
import {
  ArrowDown, ChevronDown, ChevronRight, LogOut, Plus, Refresh, Search, SearchX, Star, UserPlus, WifiOff, X,
} from "./Icons";
import ContactCard from "./ContactCard";
import ContactForm, { validateForm, type FormErrors } from "./ContactForm";
import { DeleteModal, Toast, type ToastKey, type ToastState } from "./Overlays";

const PAGE = 20;
type Status = "loading" | "error" | "ok";
type Pane = "list" | "detail" | "edit";

interface Row {
  id: string; i: number; pre: string; hit: string; post: string;
  sub: string; ini: string; tone: number; fav: boolean;
}
interface Section { key: string; id: string; label: string; count: number; alpha: boolean; items: Row[] }

export default function ContactsApp() {
  const { t, lang, rootClass } = useUI();
  const { user, signOut } = useSession();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("list");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = usePersisted<SortKey>("enishi.sort", () => "first");
  const [shown, setShown] = useState(PAGE);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof FormErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<FormErrors>({});

  const [modalId, setModalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Counters that alternate animation classes so CSS animations replay.
  const [listAnim, setListAnim] = useState(0);
  const [flip, setFlip] = useState(0);
  const [favPop, setFavPop] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bumpList = () => setListAnim((n) => n + 1);
  const bumpFlip = () => setFlip((n) => n + 1);

  const showToast = useCallback((next: Omit<ToastState, "id">) => {
    clearTimeout(toastTimer.current);
    setToast({ ...next, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3300);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const list = await api.listContacts();
      setContacts(list);
      setStatus("ok");
      bumpList();
      bumpFlip();
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) return; // session handler signs out
      setStatus("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // ---------- derived list ----------
  const alpha = sort === "first" || sort === "last";
  const keyOf = useCallback((c: Contact) => (sort === "last" ? c.lastName || c.firstName : c.firstName), [sort]);
  const qn = norm(q).trim();
  const qd = q.replace(/\D/g, "");

  const { tagCounts, tagNames } = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => c.tags.forEach((tg) => { counts[tg] = (counts[tg] ?? 0) + 1; }));
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, lang));
    return { tagCounts: counts, tagNames: names };
  }, [contacts, lang]);

  const sorted = useMemo(() => {
    const filtered = contacts.filter((c) => {
      if (favOnly && !c.favorite) return false;
      if (tag && !c.tags.includes(tag)) return false;
      if (!qn) return true;
      if (norm([fullName(c), c.email, c.company, c.phone].join(" ")).includes(qn)) return true;
      return qd.length >= 3 && c.phone.replace(/\D/g, "").includes(qd);
    });
    return filtered.sort((a, b) => {
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return norm(keyOf(a)).localeCompare(norm(keyOf(b)), lang) || norm(fullName(a)).localeCompare(norm(fullName(b)), lang);
    });
  }, [contacts, favOnly, tag, qn, qd, sort, keyOf, lang]);

  const bucket = useCallback((c: Contact) => {
    if (alpha) return indexLetter(keyOf(c));
    const d = daysAgo(sort === "newest" ? c.createdAt : c.updatedAt);
    return d <= 7 ? t.b_week : d <= 31 ? t.b_month : d <= 92 ? t.b_quarter : t.b_older;
  }, [alpha, keyOf, sort, t]);

  const secId = (b: string) => `sec-${norm(b).replace(/[^a-z0-9]+/g, "-")}`;

  const sections = useMemo(() => {
    const counts: Record<string, number> = {};
    sorted.forEach((c) => { const b = bucket(c); counts[b] = (counts[b] ?? 0) + 1; });
    const out: Section[] = [];
    let idx = 0;
    sorted.slice(0, shown).forEach((c) => {
      const b = bucket(c);
      let cur = out[out.length - 1];
      if (!cur || cur.key !== b) {
        cur = { key: b, id: secId(b), label: alpha ? t.letter(b) : b, count: counts[b], alpha, items: [] };
        out.push(cur);
      }
      const full = fullName(c);
      let pre = full, hit = "", post = "";
      if (qn) {
        const i = norm(full).indexOf(qn);
        if (i >= 0) { pre = full.slice(0, i); hit = full.slice(i, i + qn.length); post = full.slice(i + qn.length); }
      }
      cur.items.push({
        id: c.id, i: Math.min(idx++, 14), pre, hit, post,
        sub: [c.jobTitle, c.company].filter(Boolean).join(" · ") || (isFamily(c) ? t.family : t.no_company),
        ini: initials(c), tone: avatarTone(full), fav: c.favorite,
      });
    });
    return out;
  }, [sorted, shown, bucket, alpha, qn, t]);

  const present = useMemo(() => new Set(alpha ? sorted.map(bucket) : []), [alpha, sorted, bucket]);
  const active = activeLetter ?? (alpha && sections[0] ? sections[0].key : null);

  const resetListView = () => { setShown(PAGE); setActiveLetter(null); bumpList(); };

  const jumpTo = (letter: string) => {
    const idx = sorted.findIndex((c) => bucket(c) === letter);
    if (idx < 0) return;
    const go = () => {
      const sc = scrollRef.current;
      const el = sc?.querySelector<HTMLElement>(`#${secId(letter)}`);
      if (sc && el) sc.scrollTo({ top: el.offsetTop });
    };
    setActiveLetter(letter);
    if (idx >= shown) { setShown(idx + PAGE); requestAnimationFrame(() => requestAnimationFrame(go)); }
    else go();
  };

  const onListScroll = () => {
    if (!alpha) return;
    const sc = scrollRef.current;
    if (!sc) return;
    let cur: string | null = null;
    sc.querySelectorAll<HTMLElement>("[data-sec]").forEach((s) => {
      if (s.offsetTop - sc.scrollTop <= 12) cur = s.dataset.sec ?? null;
    });
    if (cur && cur !== activeLetter) setActiveLetter(cur);
  };

  // ---------- selection & editing ----------
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const pick = (id: string) => {
    if (id === selectedId && pane !== "edit") { setPane("detail"); return; }
    setSelectedId(id); setPane("detail"); setForm(null); setEditingId(null); setModalId(null); setFavPop(0); bumpFlip();
  };

  const startForm = (f: FormState, id: string | null) => {
    setForm(f); setEditingId(id); setTouched({}); setSubmitted(false); setServerErrors({}); setPane("edit"); bumpFlip();
  };
  const newContact = () => startForm(blankForm(), null);
  const newFromQuery = () => {
    const f = blankForm();
    const v = q.trim();
    if (v.includes("@")) f.email = v;
    else if (PHONE_RE.test(v)) f.phone = v;
    else f.firstName = titleCase(v);
    startForm(f, null);
  };
  const editContact = () => { if (selected) startForm(formFrom(selected), selected.id); };

  const closeForm = () => {
    setPane(selectedId && contacts.some((c) => c.id === selectedId) ? "detail" : "list");
    setForm(null); setEditingId(null); setTouched({}); setSubmitted(false); setServerErrors({}); bumpFlip();
  };

  const save = async () => {
    if (!form) return;
    let f = form;
    if (f.tagDraft.trim()) {
      const extra = f.tagDraft.trim().toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");
      f = { ...f, tagDraft: "", tags: f.tags.includes(extra) ? f.tags : [...f.tags, extra] };
      setForm(f);
    }
    const errs = validateForm(f, editingId, contacts, t);
    setSubmitted(true);
    setServerErrors({});
    const first = (["firstName", "email", "phone"] as const).find((k) => errs[k]);
    if (first) { setTimeout(() => document.getElementById(`f-${first}`)?.focus(), 0); return; }

    const { tagDraft: _draft, ...input } = f;
    const payload: ContactInput = {
      ...input,
      firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(), company: input.company.trim(), jobTitle: input.jobTitle.trim(), notes: input.notes.trim(),
    };
    setSaving(true);
    try {
      const saved = editingId ? await api.updateContact(editingId, payload) : await api.createContact(payload);
      setContacts((list) => (editingId ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved]));
      setSelectedId(saved.id); setPane("detail"); setForm(null); setEditingId(null); setTouched({}); setSubmitted(false);
      bumpFlip();
      showToast({ msg: "saved", kind: "ok" });
    } catch (err) {
      if (err instanceof RequestError && (err.status === 409 || err.status === 400) && err.body.fields) {
        const dupName = err.body.duplicateId ? contacts.find((c) => c.id === err.body.duplicateId) : undefined;
        setServerErrors({
          ...(err.body.fields.firstName ? { firstName: t.e_first } : {}),
          ...(err.body.fields.phone ? { phone: t.e_tel } : {}),
          ...(err.body.fields.email ? { email: dupName ? t.e_dup(fullName(dupName)) : t.e_email, dupId: err.body.duplicateId } : {}),
        });
      } else if (!(err instanceof RequestError && err.status === 401)) {
        showToast({ msg: "save_failed", kind: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleFav = async () => {
    if (!selected) return;
    const next = !selected.favorite;
    setFavPop((n) => n + 1);
    setContacts((list) => list.map((c) => (c.id === selected.id ? { ...c, favorite: next } : c)));
    try {
      const saved = await api.updateContact(selected.id, { favorite: next });
      setContacts((list) => list.map((c) => (c.id === saved.id ? saved : c)));
    } catch {
      setContacts((list) => list.map((c) => (c.id === selected.id ? { ...c, favorite: !next } : c)));
      showToast({ msg: "save_failed", kind: "error" });
    }
  };

  const copy = (text: string, msg: ToastKey) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    showToast({ msg, kind: "ok" });
  };

  const confirmDelete = async () => {
    if (!modalId) return;
    const id = modalId;
    setDeleting(true);
    try {
      await api.deleteContact(id);
      const idx = sorted.findIndex((c) => c.id === id);
      const next = sorted[idx + 1] ?? sorted[idx - 1] ?? null;
      setContacts((list) => list.filter((c) => c.id !== id));
      setModalId(null); setSelectedId(next ? next.id : null); setPane("list"); bumpFlip();
      showToast({ msg: "deleted", kind: "ok" });
    } catch (err) {
      setModalId(null);
      if (!(err instanceof RequestError && err.status === 401)) showToast({ msg: "delete_failed", kind: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // ---------- render ----------
  const ok = status === "ok";
  const total = contacts.length;
  const filtersOn = !!tag || favOnly;
  const showForm = pane === "edit" && !!form;
  const countLabel = status === "loading" ? t.loading : status === "error" ? t.offline
    : sorted.length === total ? t.count(total) : t.count_of(sorted.length, total);
  const modalContact = contacts.find((c) => c.id === modalId) ?? null;
  const formErrors = form ? { ...validateForm(form, editingId, contacts, t), ...serverErrors } : {};

  return (
    <div className={rootClass} lang={lang} data-pane={pane} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <header className="fx-header glass app-header">
        <Brand />
        <div className="fx-search" style={{ flex: "1 1 480px", maxWidth: 580, marginLeft: 16 }}>
          <label htmlFor="busca" className="sr">{t.search_label}</label>
          <div className="field search-field">
            <Search className="ico" />
            <input id="busca" type="search" autoComplete="off" placeholder={t.search_ph} value={q}
              onChange={(e) => { setQ(e.target.value); setShown(PAGE); setActiveLetter(null); if (pane !== "edit") setPane("list"); }} />
            {q && (
              <button type="button" className="btn btn-light btn-icon btn-sm pill" style={{ animation: "fx-chip .3s var(--spring)" }}
                aria-label={t.clear_search} onClick={() => { setQ(""); resetListView(); }}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <LangMenu onChange={() => { bumpList(); bumpFlip(); }} />
        <ThemeToggle />
        <button type="button" className="btn btn-light btn-icon tip" data-tip={user ? t.account(user.username) : t.logout}
          aria-label={t.logout} onClick={signOut}>
          <LogOut />
        </button>
        <button type="button" className="btn btn-primary pill only-wide" style={{ padding: "0 18px 0 14px" }} onClick={newContact}>
          <Plus sw={2.2} />{t.new_contact}
        </button>
        <button type="button" className="btn btn-primary btn-icon pill only-narrow" aria-label={t.new_contact} onClick={newContact}>
          <Plus size={20} sw={2.2} />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* List column */}
        <section className="fx-list" aria-label={t.list_label}>
          <div className="list-tools">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p className="tnum list-count" aria-live="polite">{countLabel}</p>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <label htmlFor="ordem" className="sr">{t.sort_label}</label>
                <select id="ordem" className="select" value={sort}
                  onChange={(e) => { setSort(e.target.value as SortKey); resetListView(); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}>
                  <option value="first">{t.sort_first}</option>
                  <option value="last">{t.sort_last}</option>
                  <option value="newest">{t.sort_newest}</option>
                  <option value="updated">{t.sort_updated}</option>
                </select>
                <ChevronDown size={14} sw={2.4} style={{ position: "absolute", right: 10, pointerEvents: "none", color: "var(--muted)" }} />
              </div>
              <button type="button" role="switch" className="switch" aria-checked={favOnly}
                onClick={() => { setFavOnly((v) => !v); resetListView(); }}>
                <span className="track"><span className="thumb" /></span>{t.fav_only}
              </button>
            </div>
            {tagNames.length > 0 && status !== "error" && (
              <div className="hscroll tag-row" role="group" aria-label={t.filter_tag}>
                <button type="button" className={tag ? "chip" : "chip on"} aria-pressed={!tag} onClick={() => { setTag(null); resetListView(); }}>
                  {t.all}<span className="n">{total}</span>
                </button>
                {tagNames.map((tg) => (
                  <button key={tg} type="button" className={tag === tg ? "chip on" : "chip"} aria-pressed={tag === tg}
                    onClick={() => { setTag(tag === tg ? null : tg); resetListView(); }}>
                    {tg}<span className="n">{tagCounts[tg]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <div className={`scroll ${listAnim % 2 ? "lb" : "la"}`} ref={scrollRef} onScroll={onListScroll}
              style={{ flex: 1, minWidth: 0, position: "relative", paddingBottom: 12 }}>

              {ok && sorted.length > 0 && (
                <>
                  {sections.map((sec) => (
                    <section key={sec.key} id={sec.id} data-sec={sec.key} aria-label={sec.label} style={{ paddingBottom: 6 }}>
                      <h3 className="sec-head glass" style={{ margin: "0 0 4px" }}>
                        <span className={sec.alpha ? "sec-tab" : "sec-tab wide"}>{sec.key}</span>
                        <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", paddingBottom: 6 }}>{sec.count}</span>
                      </h3>
                      {sec.items.map((r) => (
                        <button key={r.id} type="button" className="row" style={{ ["--i" as string]: r.i }}
                          aria-current={r.id === selectedId} onClick={() => pick(r.id)}>
                          <span className={`av av-${r.tone}`} style={{ width: 42, height: 42, fontSize: 14 }} aria-hidden="true">{r.ini}</span>
                          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span className="row-name ellipsis" style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-0.005em" }}>
                              {r.pre}{r.hit && <mark>{r.hit}</mark>}{r.post}
                            </span>
                            <span className="ellipsis" style={{ fontSize: 13, color: "var(--muted)" }}>{r.sub}</span>
                          </span>
                          {r.fav && <Star size={16} style={{ color: "var(--warning)", flex: "none" }} />}
                          <ChevronRight size={16} sw={2.2} className="go" style={{ flex: "none" }} />
                        </button>
                      ))}
                    </section>
                  ))}
                  {sorted.length > shown && (
                    <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <p className="tnum" style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{t.showing(Math.min(shown, sorted.length), sorted.length)}</p>
                      <button type="button" className="btn btn-bordered pill" onClick={() => setShown((n) => n + PAGE)}>
                        <ArrowDown size={16} />{t.load_more}
                      </button>
                    </div>
                  )}
                </>
              )}

              {status === "loading" && <ListSkeleton label={t.loading_sr} />}

              {status === "error" && (
                <div role="alert" className="list-state">
                  <span className="throb state-icon danger"><WifiOff size={24} /></span>
                  <h2 className="fadeup state-title" style={{ ["--d" as string]: 1 }}>{t.err_title}</h2>
                  <p className="fadeup state-body" style={{ ["--d" as string]: 2 }}>{t.err_body}</p>
                  <button type="button" className="btn btn-primary pill fadeup" style={{ ["--d" as string]: 3 }} onClick={() => void load()}>
                    <Refresh />{t.retry}
                  </button>
                  <p className="tnum fadeup" style={{ ["--d" as string]: 4, margin: 0, fontSize: 12, color: "var(--muted)" }}>GET /api/contacts</p>
                </div>
              )}

              {ok && total === 0 && (
                <div className="list-state" style={{ padding: "56px 28px", gap: 16 }}>
                  <div aria-hidden="true" className="bob empty-art">
                    <div className="empty-back" />
                    <div className="empty-tab" />
                    <div className="ruled empty-front" />
                    <div className="pulse empty-plus"><Plus size={20} sw={2.4} /></div>
                  </div>
                  <h2 className="fadeup state-title" style={{ ["--d" as string]: 1, margin: "12px 0 0", fontSize: 24, lineHeight: "30px", letterSpacing: "-0.015em" }}>{t.empty_title}</h2>
                  <p className="fadeup state-body" style={{ ["--d" as string]: 2 }}>{t.empty_body}</p>
                  <button type="button" className="btn btn-primary pill fadeup" style={{ ["--d" as string]: 3 }} onClick={newContact}>
                    <UserPlus />{t.empty_cta}
                  </button>
                </div>
              )}

              {ok && total > 0 && sorted.length === 0 && (
                <div role="status" className="list-state">
                  <span className="wiggle state-icon"><SearchX size={24} /></span>
                  <h2 className="fadeup state-title" style={{ ["--d" as string]: 1, overflowWrap: "anywhere" }}>{q ? t.nores_q(q.trim()) : t.nores_f}</h2>
                  <p className="fadeup state-body" style={{ ["--d" as string]: 2 }}>{q ? t.nores_body_q + (filtersOn ? t.nores_extra : "") : t.nores_body_f}</p>
                  <div className="fadeup" style={{ ["--d" as string]: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-bordered pill" onClick={() => { setQ(""); setTag(null); setFavOnly(false); resetListView(); }}>
                      {q ? t.clear_search : t.clear_filters}
                    </button>
                    {q && <button type="button" className="btn btn-primary pill" onClick={newFromQuery}>{t.create_q(titleCase(q))}</button>}
                  </div>
                </div>
              )}
            </div>

            <nav className={alpha && ok && sorted.length ? "az" : "az off"} aria-label={t.az_label} title={alpha ? "" : t.az_off}>
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) =>
                alpha && present.has(l)
                  ? <a key={l} href={`#${secId(l)}`} data-l={l} aria-current={l === active} aria-label={t.go_letter(l)}
                      onClick={(e) => { e.preventDefault(); jumpTo(l); }}>{l}</a>
                  : <span key={l} aria-hidden="true">{l}</span>,
              )}
            </nav>
          </div>
        </section>

        {/* Detail / edit column */}
        <main className="fx-detail scroll desk" style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <div className="fx-detail-inner">
            {showForm && form && (
              <ContactForm
                form={form} setForm={setForm} errors={formErrors} touched={touched} setTouched={setTouched}
                submitted={submitted} saving={saving} editing={contacts.find((c) => c.id === editingId) ?? null}
                tagNames={tagNames} flip={flip}
                onCancel={closeForm} onSave={() => void save()}
                onOpenDuplicate={(id) => { setSelectedId(id); setPane("detail"); setForm(null); setEditingId(null); setSubmitted(false); setTouched({}); bumpFlip(); }}
              />
            )}
            {!showForm && ok && selected && (
              <ContactCard
                contact={selected} sortKey={sort} flip={flip} favPop={favPop}
                onBack={() => setPane("list")} onEdit={editContact} onToggleFav={() => void toggleFav()}
                onDelete={() => setModalId(selected.id)}
                onFilterTag={(tg) => { setTag(tg); setPane("list"); resetListView(); }}
                onCopy={copy}
              />
            )}
            {!showForm && status === "loading" && <CardSkeleton />}
            {!showForm && !selected && status !== "loading" && (
              <div className="pick-empty">
                <div aria-hidden="true" className="bob ruled pick-art" />
                <p className="fadeup" style={{ ["--d" as string]: 2, margin: "14px 0 0", fontSize: 15 }}>{total === 0 ? t.pick_empty : t.pick}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {modalContact && (
        <DeleteModal name={fullName(modalContact)} busy={deleting} onCancel={() => setModalId(null)} onConfirm={() => void confirmDelete()} />
      )}
      <Toast toast={toast} onClose={() => { clearTimeout(toastTimer.current); setToast(null); }} />
    </div>
  );
}

const SKEL = ["62%/40%", "48%/55%", "70%/35%", "55%/48%", "40%/60%", "66%/30%", "52%/44%", "60%/38%", "45%/50%"];

function ListSkeleton({ label }: { label: string }) {
  return (
    <>
      <div aria-hidden="true">
        <div className="sec-head"><span className="sk" style={{ width: 32, height: 26, borderRadius: "8px 8px 0 0" }} /></div>
        {SKEL.map((p) => {
          const [a, b] = p.split("/");
          return (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 12, height: 64, padding: "0 20px" }}>
              <span className="sk" style={{ width: 42, height: 42, borderRadius: 999, flex: "none" }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="sk" style={{ height: 12, width: a }} /><span className="sk" style={{ height: 10, width: b }} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="sr" role="status">{label}</p>
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="stack">
      <div className="card" aria-hidden="true" style={{ padding: "30px 28px" }}>
        <span className="card-tab"><span className="sk" style={{ width: 14, height: 12 }} /></span>
        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <span className="sk" style={{ width: 80, height: 80, borderRadius: 999, flex: "none" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="sk" style={{ height: 28, width: "55%" }} /><span className="sk" style={{ height: 14, width: "38%" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <span className="sk" style={{ height: 32, width: 120, borderRadius: 999 }} />
          <span className="sk" style={{ height: 32, width: 84, borderRadius: 999 }} />
          <span className="sk" style={{ height: 32, width: 72, borderRadius: 999 }} />
        </div>
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="sk" style={{ height: 14, width: "70%" }} /><span className="sk" style={{ height: 14, width: "48%" }} />
          <span className="sk" style={{ height: 14, width: "58%" }} /><span className="sk" style={{ height: 14, width: "42%" }} />
          <span className="sk" style={{ height: 96, width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

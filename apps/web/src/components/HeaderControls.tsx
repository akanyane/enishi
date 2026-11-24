import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LANGS, type Lang } from "../lib/i18n";
import { useUI } from "../lib/ui";
import { BrandMark, Check, ChevronDown, Globe, Moon, Sun } from "./Icons";

export function LangMenu({ onChange }: { onChange?: (l: Lang) => void }) {
  const { lang, setLang, t } = useUI();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  // Focus the checked item when the menu opens.
  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? menuRef.current?.querySelector<HTMLElement>(".mi");
    el?.focus({ preventScroll: true });
  }, [open]);

  const onBlur = () => {
    setTimeout(() => {
      if (wrapRef.current && !wrapRef.current.contains(document.activeElement)) setOpen(false);
    }, 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(".mi"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); btnRef.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  };

  return (
    <div className="menu-wrap" ref={wrapRef} onBlur={onBlur}>
      <button ref={btnRef} type="button" className="btn btn-light" style={{ gap: 6, padding: "0 10px" }}
        aria-haspopup="menu" aria-expanded={open} aria-label={`${t.language}: ${current.name}`} onClick={() => setOpen((o) => !o)}>
        <Globe />
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.04em" }}>{current.code}</span>
        <ChevronDown size={14} sw={2.4} style={{ color: "var(--muted)", transition: "transform .35s var(--spring)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className="menu" role="menu" aria-label={t.language} ref={menuRef} onKeyDown={onKeyDown}>
          <p className="menu-h" style={{ margin: 0 }}>{t.language}</p>
          {LANGS.map((l) => (
            <button key={l.id} type="button" role="menuitemradio" className="mi" aria-checked={l.id === lang} lang={l.id}
              onClick={() => { setLang(l.id); setOpen(false); onChange?.(l.id); btnRef.current?.focus(); }}>
              <span className="code">{l.code}</span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span>{l.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{l.sample}</span>
              </span>
              <Check size={16} sw={2.6} className="ck" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const { dark, t, toggleTheme } = useUI();
  const label = dark ? t.theme_to_light : t.theme_to_dark;
  return (
    <button type="button" className="btn btn-light btn-icon tip" data-tip={label} aria-label={label} onClick={toggleTheme}>
      {dark ? <Sun className="wiggle" key="sun" /> : <Moon className="wiggle" key="moon" />}
    </button>
  );
}

export function Brand() {
  return (
    <a className="brand" href="#" aria-label="enishi" onClick={(e) => e.preventDefault()}>
      <BrandMark />
      <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>enishi</span>
    </a>
  );
}

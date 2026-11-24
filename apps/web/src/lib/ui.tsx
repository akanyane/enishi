import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { DICTS, detectLang, type Dict, type Lang } from "./i18n";
import { prefersDark, usePersisted } from "./prefs";

interface UI {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  dark: boolean;
  /** Class for a screen's `.fx` root. */
  rootClass: string;
  /** Toggles the theme, revealing it in a circle from the click point when supported. */
  toggleTheme: (e?: React.MouseEvent<HTMLElement>) => void;
}

const UIContext = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersisted<Lang>("enishi.lang", detectLang);
  const [dark, setDark] = usePersisted<boolean>("enishi.dark", prefersDark);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.body.style.background = dark ? "#0E1619" : "#F3F5F2";
  }, [lang, dark]);

  const toggleTheme = useCallback((e?: React.MouseEvent<HTMLElement>) => {
    const next = !dark;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce || !e) { setDark(next); return; }
    const rc = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rc.left + rc.width / 2;
    const y = e.clientY || rc.top + rc.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => flushSync(() => setDark(next)));
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
  }, [dark, setDark]);

  return (
    <UIContext.Provider value={{ lang, setLang, t: DICTS[lang] ?? DICTS["pt-BR"], dark, rootClass: dark ? "fx dark" : "fx", toggleTheme }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error("useUI must be used inside UIProvider");
  return ui;
}

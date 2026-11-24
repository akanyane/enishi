import type { Contact, ContactInput } from "@enishi/shared";

export type SortKey = "first" | "last" | "newest" | "updated";

/** Lowercase and strip accents, so "João" matches "joao". */
export const norm = (s: string | undefined | null) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Stable 0–7 index for the avatar palette, derived from the full name. */
export const avatarTone = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 8;
};

export const fullName = (c: Pick<Contact, "firstName" | "lastName">) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

export const initials = (c: Pick<Contact, "firstName" | "lastName">) => {
  const first = c.firstName.trim();
  let second = c.lastName.trim().charAt(0);
  if (!second) second = first.split(/\s+/)[1]?.charAt(0) ?? "";
  return (first.charAt(0) + second).toUpperCase() || "?";
};

export const indexLetter = (s: string) => {
  const ch = norm(s).trim().charAt(0);
  return /[a-z]/.test(ch) ? ch.toUpperCase() : "#";
};

export const daysAgo = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);

export const longDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });

export const relativeDate = (iso: string, lang: string) => {
  const d = Math.max(0, daysAgo(iso));
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (d < 30) return rtf.format(-d, "day");
  const m = Math.round(d / 30);
  if (m < 12) return rtf.format(-m, "month");
  return rtf.format(-Math.round(d / 365), "year");
};

export const cleanTag = (t: string) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");

export const isFamily = (c: Contact) => c.tags.some((t) => ["familia", "family"].includes(norm(t)));

export const titleCase = (s: string) =>
  s.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^[0-9+().\-\s]+$/;

export type FormState = ContactInput & { tagDraft: string };

export const blankForm = (): FormState => ({
  firstName: "", lastName: "", email: "", phone: "", company: "", jobTitle: "",
  notes: "", tags: [], favorite: false, tagDraft: "",
});

export const formFrom = (c: Contact): FormState => ({
  firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone,
  company: c.company, jobTitle: c.jobTitle, notes: c.notes, tags: [...c.tags],
  favorite: c.favorite, tagDraft: "",
});

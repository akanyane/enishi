import { useEffect, useRef, type KeyboardEvent } from "react";
import { useUI } from "../lib/ui";
import { AlertCircle, CheckCircle, Trash, X } from "./Icons";

interface ModalProps {
  name: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ name, busy, onCancel, onConfirm }: ModalProps) {
  const { t } = useUI();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the safe action first and give focus back to the trigger on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
    if (e.key !== "Tab") return;
    // Keep focus inside the dialog.
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} onKeyDown={onKeyDown}>
      <div ref={dialogRef} className="modal" role="alertdialog" aria-modal="true" aria-labelledby="m-t" aria-describedby="m-d">
        <span className="ic modal-icon"><Trash size={22} /></span>
        <h2 id="m-t" className="modal-title">{t.m_title(name)}</h2>
        <p id="m-d" style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "var(--muted)" }}>{t.m_body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 26, flexWrap: "wrap" }}>
          <button ref={cancelRef} type="button" className="btn btn-bordered" onClick={onCancel}>{t.cancel}</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}{t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

/** i18n keys a toast can show; translated at render time so a language switch applies. */
export type ToastKey = "saved" | "deleted" | "copied_email" | "copied_phone" | "save_failed" | "delete_failed";

export interface ToastState {
  id: number;
  msg: ToastKey;
  kind: "ok" | "error";
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  const { t } = useUI();
  return (
    <div aria-live="polite" role="status">
      {toast && (
        // `key` restarts the entry and drain animations for each new toast.
        <div className="toast" key={toast.id}>
          {toast.kind === "ok"
            ? <CheckCircle size={20} sw={2.2} className="ok" style={{ flex: "none" }} />
            : <AlertCircle size={20} sw={2.2} className="toast-err" style={{ flex: "none" }} />}
          <span style={{ flex: 1 }}>{t[toast.msg]}</span>
          <button type="button" aria-label={t.close} onClick={onClose}><X size={16} sw={2.2} /></button>
          <span className="bar" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

'use client';
// In-app alert dialog, replacing the browser's confirm()/alert() boxes.
// Built on <dialog> + showModal(): focus is trapped inside, Escape cancels, the page behind is inert.
import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface AskOptions {
  title: string;
  message?: string;
  /** Label of the main button. */
  confirm?: string;
  /** Label of the dismiss button. Pass null for a single-button notice. */
  cancel?: string | null;
  /** Main action destroys something: red button, and focus starts on Cancel. */
  danger?: boolean;
}

type Pending = AskOptions & { resolve: (ok: boolean) => void };

/**
 * `const [dialog, ask] = useAlertDialog();` then render `{dialog}` and `if (await ask({...})) ...`.
 * Resolves true for the main button, false for cancel, Escape, or a click on the backdrop.
 */
export function useAlertDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ask = useCallback((o: AskOptions) => new Promise<boolean>(resolve => setPending({ ...o, resolve })), []);
  const close = useCallback((ok: boolean) => {
    setPending(p => { p?.resolve(ok); return null; });
  }, []);
  const dialog = pending ? <AlertDialog {...pending} onClose={close} /> : null;
  return [dialog, ask] as const;
}

function AlertDialog({ title, message, confirm = 'OK', cancel = 'Cancel', danger, onClose }: AskOptions & { onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const safe = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    // Start on the button that does no harm.
    (danger && cancel !== null ? safe.current : main.current)?.focus();
    return () => d.close();
  }, [danger, cancel]);

  return (
    <dialog ref={ref} className="alert-dialog" role="alertdialog" aria-modal="true"
      aria-labelledby={`${id}-t`} aria-describedby={message ? `${id}-m` : undefined}
      onCancel={e => { e.preventDefault(); onClose(false); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(false); }}>
      <div className="alert-body">
        <h2 id={`${id}-t`}>{title}</h2>
        {message && <p id={`${id}-m`}>{message}</p>}
        <div className="alert-actions">
          {cancel !== null && <button ref={safe} type="button" className="btn light" onClick={() => onClose(false)}>{cancel}</button>}
          <button ref={main} type="button" className={`btn ${danger ? 'danger-solid' : ''}`} onClick={() => onClose(true)}>{confirm}</button>
        </div>
      </div>
    </dialog>
  );
}

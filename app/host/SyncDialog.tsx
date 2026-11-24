'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

/**
 * "Sync devices": turn on a private link that keeps this browser's quizzes in step with every device that opens it.
 * No email or password: whoever has the link has the quizzes, so it's shown here only.
 */
export default function SyncDialog({ secret, status, onEnable, onDisable, onClose }: {
  secret: string | null; status: string;
  onEnable: () => void; onDisable: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const url = secret && typeof location !== 'undefined' ? `${location.origin}/host?sync=${secret}` : '';

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (!url) { setQr(''); return; }
    QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [url]);

  async function copy() {
    const ok = await navigator.clipboard?.writeText(url).then(() => true, () => false);
    setCopied(!!ok);
  }

  return (
    <dialog ref={ref} className="alert-dialog sync-dialog" aria-labelledby="sync-title"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="alert-body">
        <h2 id="sync-title">☁️ Sync your quizzes</h2>
        {!secret ? (
          <>
            <p>Your quizzes are saved in this browser. Turn on sync to get a private link: open it on your laptop, phone
              or school computer and the same quizzes are there, kept up to date both ways. No email or password needed.</p>
            <p className="muted">Anyone with the link can see and change these quizzes, so keep it to yourself.</p>
            <div className="alert-actions">
              <button type="button" className="btn light" onClick={onClose}>Not now</button>
              <button type="button" className="btn" onClick={onEnable}>Turn on sync</button>
            </div>
          </>
        ) : (
          <>
            <p>Open this link on another device, or scan the code, and your quizzes will be there. Bookmark it so you never lose them.</p>
            <div className="sync-link">
              {qr && <div className="sync-qr" role="img" aria-label="QR code for your sync link" dangerouslySetInnerHTML={{ __html: qr }} />}
              <div className="sync-url">
                <code>{url}</code>
                <button type="button" className="btn small" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
                <span className="muted sync-status" aria-live="polite">{status}</span>
              </div>
            </div>
            <p className="muted">Keep it private: anyone with the link can see and change these quizzes.</p>
            <div className="alert-actions">
              <button type="button" className="btn light" onClick={onDisable}>Stop syncing this browser</button>
              <button type="button" className="btn" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

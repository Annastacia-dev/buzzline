'use client';
import { useEffect, useRef, useState } from 'react';
import { readXlsxRows, rowsToQuestions } from '@/lib/spreadsheet';
import { downloadTemplate } from '@/lib/template';
import type { Quiz } from '@/lib/types';

type Step = { label: string; state: 'wait' | 'run' | 'ok' | 'fail' };
type Phase =
  | { kind: 'pick' }
  | { kind: 'work'; file: string; steps: Step[] }
  | { kind: 'done'; file: string; steps: Step[]; quiz: Quiz; skipped: string[] }
  | { kind: 'fail'; file: string; steps: Step[]; error: string; skipped: string[] };

const MAX_BYTES = 5 * 1024 * 1024;
// Parsing takes milliseconds; a short pause per step lets people see what was checked.
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

/** "fashion_brands_15_kahoot_import.xlsx" → "Fashion brands": drop the extension, Kahoot/import words and a trailing question count. */
function titleFrom(name: string) {
  const t = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b(kahoot|import|v\d+)\b/gi, ' ').replace(/\s+/g, ' ').trim().replace(/\s+\d+$/, '');
  return t ? t[0].toUpperCase() + t.slice(1) : 'Imported quiz';
}

/**
 * "Import spreadsheet": pick or drop a Kahoot-format .xlsx (or an older Buzzline .json), watch each step run,
 * then see what was added and which rows were skipped, or why the file didn't work.
 */
export default function ImportDialog({ onImport, onRestore, onClose }: {
  onImport: (q: Quiz) => void; onRestore: (list: unknown[]) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [drag, setDrag] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    alive.current = true;
    return () => { alive.current = false; d.close(); };
  }, []);

  const busy = phase.kind === 'work';
  const close = () => { if (!busy) onClose(); };

  async function run(f: File) {
    const json = /\.json$/i.test(f.name);
    let steps: Step[] = [
      { label: `Reading ${f.name}`, state: 'run' },
      { label: json ? 'Checking the quiz file' : 'Finding the header row', state: 'wait' },
      { label: 'Checking each question', state: 'wait' },
      { label: 'Adding the quiz', state: 'wait' },
    ];
    let at = 0;
    const show = (s: Step[]) => { steps = s; if (alive.current) setPhase({ kind: 'work', file: f.name, steps: s }); };
    const next = async (label?: string) => {
      await pause(380);
      show(steps.map((s, i) => (i === at ? { ...s, state: 'ok' } : i === at + 1 ? { ...s, label: label ?? s.label, state: 'run' } : s)));
      at++;
    };
    show(steps);

    try {
      if (f.size > MAX_BYTES) throw new Error('That file is too big (5 MB max).');
      if (!/\.(xlsx|json)$/i.test(f.name)) throw new Error('Pick a Kahoot-style .xlsx spreadsheet. Older .xls and .csv files need saving as .xlsx first.');
      let quiz: Quiz, skipped: string[] = [];

      if (json) {
        const text = await f.text();
        await next();
        let q: { title?: string; questions?: unknown; quizzes?: unknown[] } | unknown[];
        try { q = JSON.parse(text); } catch { throw new Error('That .json file isn’t a Buzzline quiz or backup.'); }
        if (Array.isArray(q) || Array.isArray((q as { quizzes?: unknown[] }).quizzes)) {
          // A backup holds many quizzes: hand it to the studio's restore, which reports for itself.
          onRestore(Array.isArray(q) ? q : (q as { quizzes: unknown[] }).quizzes);
          onClose();
          return;
        }
        if (!Array.isArray((q as Quiz).questions) || !(q as Quiz).questions.length) throw new Error('That .json file has no questions.');
        await next(`Checking ${(q as Quiz).questions.length} questions`);
        quiz = { title: (q as Quiz).title || titleFrom(f.name), questions: (q as Quiz).questions };
      } else {
        const bytes = new Uint8Array(await f.arrayBuffer());
        let rows: string[][];
        try { rows = readXlsxRows(bytes); } catch { throw new Error('That file couldn’t be opened as a spreadsheet. Is it a real .xlsx?'); }
        await next();
        const filled = rows.filter(r => r.some(c => c)).length;
        const res = rowsToQuestions(rows); // throws when there is no header row
        await next(`Checking ${Math.max(filled - 1, 0)} row${filled === 2 ? '' : 's'}`);
        skipped = res.skipped;
        if (!res.questions.length) {
          throw Object.assign(new Error(skipped.length ? 'None of the rows could be used as a question.' : 'The spreadsheet has no questions under the header row.'), { skipped });
        }
        quiz = { title: titleFrom(f.name), questions: res.questions };
      }

      await next();
      onImport(quiz);
      await pause(300);
      const final = steps.map(s => ({ ...s, state: 'ok' as const }));
      if (alive.current) setPhase({ kind: 'done', file: f.name, steps: final, quiz, skipped });
    } catch (e) {
      const failed = steps.map((s, i) => (i === at ? { ...s, state: 'fail' as const } : s));
      const error = (e as Error).message || 'Something went wrong reading that file.';
      if (alive.current) setPhase({ kind: 'fail', file: f.name, steps: failed, error, skipped: (e as { skipped?: string[] }).skipped ?? [] });
    }
  }

  function pick(f: File | undefined) { if (f && !busy) run(f); }

  const n = phase.kind === 'done' ? phase.quiz.questions.length : 0;
  const title =
    phase.kind === 'done' ? (phase.skipped.length ? 'Imported, with a few rows skipped' : 'Quiz imported')
      : phase.kind === 'fail' ? 'Couldn’t import that file'
        : phase.kind === 'work' ? 'Importing…' : '⇪ Import a spreadsheet';

  return (
    <dialog ref={ref} className="alert-dialog import-dialog" aria-labelledby="import-title"
      onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="alert-body" aria-busy={busy}>
        {(phase.kind === 'done' || phase.kind === 'fail') && (
          <div className={`import-badge ${phase.kind === 'done' ? 'ok' : 'bad'}`} aria-hidden>{phase.kind === 'done' ? '✓' : '✕'}</div>
        )}
        <h2 id="import-title">{title}</h2>

        {phase.kind === 'pick' && (
          <>
            <p>Turn a Kahoot-style spreadsheet into a quiz: one question per row, with Question, Answer 1–4, Time limit and Correct answer columns.</p>
            <button type="button" className={`import-drop ${drag ? 'over' : ''}`}
              onClick={() => input.current?.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}>
              <span className="import-icon" aria-hidden>📄</span>
              <b>Choose a spreadsheet</b>
              <span className="muted">or drop it here · .xlsx up to 5 MB</span>
            </button>
            <input ref={input} type="file" hidden
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json"
              onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <p className="import-hint">No spreadsheet yet? <button type="button" className="linkbtn" onClick={downloadTemplate}>Download the template</button></p>
          </>
        )}

        {phase.kind !== 'pick' && (
          <ol className="import-steps" aria-live="polite">
            {phase.steps.map((s, i) => (
              <li key={i} className={s.state}>
                <span className="import-mark" aria-hidden>{s.state === 'ok' ? '✓' : s.state === 'fail' ? '✕' : s.state === 'run' ? '' : '•'}</span>
                <span>{s.label}</span>
                <span className="sr-only">{s.state === 'ok' ? ' done' : s.state === 'fail' ? ' failed' : s.state === 'run' ? ' in progress' : ''}</span>
              </li>
            ))}
          </ol>
        )}

        {phase.kind === 'done' && (
          <div className="import-result" role="status">
            <p><b>{phase.quiz.title}</b> is ready with {n} question{n === 1 ? '' : 's'}. It’s saved in this browser and open in the studio.</p>
            <ul className="import-preview">
              {phase.quiz.questions.slice(0, 4).map((q, i) => <li key={i}><span>{i + 1}</span>{q.q || 'Untitled question'}</li>)}
              {n > 4 && <li className="more">…and {n - 4} more</li>}
            </ul>
            {phase.skipped.length > 0 && <Skipped rows={phase.skipped} />}
          </div>
        )}

        {phase.kind === 'fail' && (
          <div className="import-result" role="alert">
            <p className="import-error">{phase.error}</p>
            {phase.skipped.length > 0 && <Skipped rows={phase.skipped} open />}
            <p className="import-hint">Check the file has a header row with Question, Answer 1 and Answer 2, or start from the <button type="button" className="linkbtn" onClick={downloadTemplate}>template</button>.</p>
          </div>
        )}

        <div className="alert-actions">
          {phase.kind === 'pick' && <button type="button" className="btn light" onClick={close}>Cancel</button>}
          {phase.kind === 'work' && <button type="button" className="btn" disabled>Importing…</button>}
          {phase.kind === 'done' && <>
            <button type="button" className="btn light" onClick={() => setPhase({ kind: 'pick' })}>Import another</button>
            <button type="button" className="btn" onClick={close} autoFocus>Open the quiz</button>
          </>}
          {phase.kind === 'fail' && <>
            <button type="button" className="btn light" onClick={close}>Close</button>
            <button type="button" className="btn" onClick={() => setPhase({ kind: 'pick' })} autoFocus>Try another file</button>
          </>}
        </div>
      </div>
    </dialog>
  );
}

/** The rows that couldn't become questions, with the reason for each. */
function Skipped({ rows, open }: { rows: string[]; open?: boolean }) {
  return (
    <details className="import-skipped" open={open}>
      <summary>{rows.length} row{rows.length === 1 ? ' was' : 's were'} skipped</summary>
      <ul>{rows.slice(0, 20).map(s => <li key={s}>{s}</li>)}{rows.length > 20 && <li>…and {rows.length - 20} more</li>}</ul>
    </details>
  );
}

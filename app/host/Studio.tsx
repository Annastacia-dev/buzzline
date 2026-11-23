'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { blankQuestion, sampleQuiz } from '@/lib/sample';
import type { Quiz, Question } from '@/lib/types';
import { useAlertDialog } from '@/lib/dialog';
import GenerateDialog from './GenerateDialog';
import { importSpreadsheet, TIMES } from '@/lib/spreadsheet';
import { downloadTemplate } from '@/lib/template';
import { QuizSelect } from '@/lib/select';
import { Shape } from '@/lib/client';

const KEY = 'bz.quizzes';
const uid = () => Math.random().toString(36).slice(2, 10);

/** Quiz library + editor. Quizzes live in this browser's localStorage. */
export default function Studio({ onHost, error }: { onHost: (q: Quiz) => void; error: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [dialog, ask] = useAlertDialog();
  const [selId, setSelId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  // Preview shows a quiz without giving away the answers; "Edit quiz" shows answers and every control.
  const [tab, setTab] = useState<'preview' | 'edit'>('preview');
  // The question shown in the main card; the rail on the left lists them all.
  const [cur, setCur] = useState(0);
  // Drag and drop in the rail: which question is being dragged and where it would land.
  const [drag, setDrag] = useState<{ from: number; at: number } | null>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let list: Quiz[] = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
    if (!list.length) list = [sampleQuiz()];
    setQuizzes(list);
    setSelId(list[0].id!);
  }, []);

  const save = (list: Quiz[]) => { setQuizzes(list); localStorage.setItem(KEY, JSON.stringify(list)); };
  const quiz = quizzes.find(q => q.id === selId);
  const update = (fn: (q: Quiz) => Quiz) => save(quizzes.map(q => (q.id === selId ? fn(structuredClone(q)) : q)));
  const setQ = (i: number, fn: (q: Question) => void) => update(z => { fn(z.questions[i]); return z; });

  function addQuiz(q?: Quiz) {
    const nq = { ...(q ?? { title: 'New quiz', questions: [blankQuestion()] }), id: uid() };
    save([nq, ...quizzes]);
    setSelId(nq.id);
    setCur(0);
    setTab(q ? 'preview' : 'edit'); // a blank quiz opens ready to write
  }

  /** Moves question `from` so it lands before position `at` (0…length). */
  function moveQuestion(from: number, at: number) {
    const to = at > from ? at - 1 : at;
    if (to === from) return;
    update(z => { const [item] = z.questions.splice(from, 1); z.questions.splice(to, 0, item); return z; });
    // Keep showing the same question wherever it ends up.
    setCur(c => c === from ? to : from < c && to >= c ? c - 1 : from > c && to <= c ? c + 1 : c);
  }
  const endDrag = () => setDrag(null);

  // "+ Add question": add a blank question at the end, open it for editing and put the cursor in its text.
  const focusNew = useRef(false);
  function addQuestion() {
    if (!quiz) return;
    focusNew.current = true;
    setTab('edit');
    setCur(quiz.questions.length);
    update(z => { z.questions.push(blankQuestion()); return z; });
  }
  const ci = quiz ? Math.min(cur, quiz.questions.length - 1) : 0;
  const cq = quiz?.questions[ci];
  useEffect(() => {
    // Keep the current question visible in the rail, and the card scrolled to its top.
    railRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    stageRef.current?.scrollTo({ top: 0 });
    if (focusNew.current && tab === 'edit') {
      focusNew.current = false;
      stageRef.current?.querySelector<HTMLInputElement>('input.field')?.focus();
    }
  }, [ci, selId, tab]);

  /** ↑ ↓ (← → on phones) move between questions in the rail. */
  function onRailKey(e: React.KeyboardEvent) {
    if (!quiz) return;
    const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = Math.min(quiz.questions.length - 1, Math.max(0, ci + d));
    setCur(n);
    railRef.current?.querySelectorAll<HTMLButtonElement>('.qthumb')[n]?.focus();
  }

  async function remove() {
    if (!quiz) return;
    const ok = await ask({ title: `Delete "${quiz.title}"?`, message: 'This removes the quiz from this browser and can’t be undone.', confirm: 'Delete quiz', danger: true });
    if (!ok) return;
    const rest = quizzes.filter(q => q.id !== selId);
    save(rest);
    setSelId(rest[0]?.id ?? '');
  }

  /** A Kahoot-format spreadsheet (.xlsx) becomes a new quiz; older Buzzline .json files still work too. */
  async function importQuiz(f: File | undefined) {
    if (!f) return;
    // "fashion_brands_15_kahoot_import.xlsx" → "Fashion brands": drop the extension, Kahoot/import words and a trailing question count.
    const title = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\b(kahoot|import|v\d+)\b/gi, ' ').replace(/\s+/g, ' ').trim().replace(/\s+\d+$/, '');
    try {
      if (/\.json$/i.test(f.name)) {
        const q = JSON.parse(await f.text());
        if (!Array.isArray(q.questions)) throw new Error('Pick a Kahoot-style .xlsx spreadsheet.');
        addQuiz({ title: q.title || title, questions: q.questions });
        return;
      }
      const { questions, skipped } = await importSpreadsheet(f);
      if (!questions.length) throw new Error(skipped.length ? `No usable questions. ${skipped.slice(0, 3).join('; ')}` : 'The spreadsheet has no questions under the header row.');
      addQuiz({ title: title ? title[0].toUpperCase() + title.slice(1) : 'Imported quiz', questions });
      if (skipped.length) ask({
        title: `Imported ${questions.length} question${questions.length === 1 ? '' : 's'}, skipped ${skipped.length}`,
        message: skipped.slice(0, 6).join('\n') + (skipped.length > 6 ? `\n…and ${skipped.length - 6} more` : ''),
        confirm: 'OK', cancel: null,
      });
    } catch (e) {
      ask({ title: "Couldn't import that file", message: (e as Error).message || 'Pick a Kahoot-style .xlsx spreadsheet.', confirm: 'OK', cancel: null });
    }
  }

  return (
    <div className="studio">
      {dialog}
      {generating && <GenerateDialog onClose={() => setGenerating(false)} onDone={q => { setGenerating(false); addQuiz(q); }} />}
      <aside className="side">
        <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
        <button className="btn small" onClick={() => addQuiz()}>+ New quiz</button>
        <button className="btn small ai" onClick={() => setGenerating(true)}>✨ Generate with AI</button>
        <button className="btn ghost small" onClick={() => fileRef.current?.click()} title="Kahoot-format .xlsx: Question, Answer 1–4, Time limit, Correct answer(s)">⇪ Import spreadsheet</button>
        <button type="button" className="linkbtn" onClick={downloadTemplate}>Download spreadsheet template</button>
        <h3>Your quizzes</h3>
        <div className="qlist">
          {quizzes.map(q => (
            <button key={q.id} className={q.id === selId ? 'on' : ''} onClick={() => { setSelId(q.id!); setCur(0); setTab('preview'); }}>
              {q.title || 'Untitled'}<small>{q.questions.length} question{q.questions.length === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost small" onClick={() => addQuiz(sampleQuiz())}>Add sample</button>
          <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.json,application/json" hidden onChange={e => { importQuiz(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </aside>

      {quiz && cq ? (
        <section className="editor">
          <div className="editor-top">
            <input className="field" value={quiz.title} onChange={e => update(z => ({ ...z, title: e.target.value }))} placeholder="Quiz title" aria-label="Quiz title" title="Click to rename" maxLength={120} />
            <button className="btn" onClick={() => onHost(quiz)}>Host this quiz <span aria-hidden>→</span></button>
          </div>
          <div className="editor-bar">
            <div className="tabs" role="tablist" aria-label="Quiz view">
              <button type="button" role="tab" id="tab-preview" aria-selected={tab === 'preview'} aria-controls="quiz-panel"
                className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>👀 Preview</button>
              <button type="button" role="tab" id="tab-edit" aria-selected={tab === 'edit'} aria-controls="quiz-panel"
                className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>✏️ Edit quiz</button>
            </div>
            <span className="muted quiz-meta">
              {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · about {Math.max(1, Math.round(quiz.questions.reduce((t, q) => t + q.time + 15, 0) / 60))} min
            </span>
            <span className="spacer" />
            <button className="btn small" onClick={addQuestion}>+ Add question</button>
            <button className="btn ghost small" onClick={remove}>Delete quiz</button>
          </div>
          {error && <div className="card error" style={{ padding: 14 }}>{error}</div>}

          <div className="qwork">
            <nav className="qrail" aria-label="Questions">
              <ol ref={railRef} onKeyDown={onRailKey}>
                {quiz.questions.map((q, i) => {
                  const dropBefore = !!drag && drag.at === i && drag.at !== drag.from && drag.at !== drag.from + 1;
                  const dropAfter = !!drag && i === quiz.questions.length - 1 && drag.at === quiz.questions.length && drag.from !== i;
                  return (
                    <li key={i} className={`${drag?.from === i ? 'dragging' : ''} ${dropBefore ? 'drop-before' : ''} ${dropAfter ? 'drop-after' : ''}`}
                      onDragOver={e => {
                        if (!drag) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        const r = e.currentTarget.getBoundingClientRect();
                        const row = getComputedStyle(e.currentTarget.parentElement!).flexDirection === 'row';
                        const at = (row ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2) ? i : i + 1;
                        if (at !== drag.at) setDrag({ ...drag, at });
                      }}
                      onDrop={e => { e.preventDefault(); if (drag) moveQuestion(drag.from, drag.at); endDrag(); }}>
                      <button type="button" className={`qthumb ${i === ci ? 'on' : ''}`} aria-current={i === ci ? 'true' : undefined}
                        draggable={tab === 'edit'}
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); setDrag({ from: i, at: i }); }}
                        onDragEnd={endDrag}
                        onClick={() => setCur(i)}>
                        <span className="qthumb-top">
                          <span className="qthumb-n">{i + 1}</span>
                          <span className="qthumb-time">⏱ {q.time}s{q.double ? ' · 2×' : ''}</span>
                        </span>
                        <span className="qthumb-q">{q.q || <i>No question text yet</i>}</span>
                        <span className={`qthumb-ans ${q.answers.length === 2 ? 'two' : ''}`} aria-hidden>
                          {q.answers.map((_, j) => <span key={j} className={`c${j} ${tab === 'edit' && q.correct === j ? 'right' : ''}`} />)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button type="button" className="btn ghost small qrail-add" onClick={addQuestion}>+ Add question</button>
            </nav>

            <div id="quiz-panel" role="tabpanel" aria-labelledby={tab === 'edit' ? 'tab-edit' : 'tab-preview'} className="qstage" ref={stageRef}>
              {tab === 'preview'
                ? <p className="muted preview-note">Answers are hidden here so the quiz stays a surprise. Open <b>Edit quiz</b> to see and change them.</p>
                : <p className="muted preview-note">Drag questions in the list to reorder them. The filled circle marks the correct answer.</p>}
              {tab === 'preview' ? (
                <article className="card pcard flash" key={`p${ci}`}>
                  <header>
                    <span className="pill dark">Question {ci + 1}</span>
                    <span className="pill">⏱ {cq.time}s</span>
                    {cq.double && <span className="pill">2× points</span>}
                  </header>
                  <h2>{cq.q || <span className="muted">No question text yet</span>}</h2>
                  <div className={`pans ${cq.answers.length === 2 ? 'two' : ''}`}>
                    {cq.answers.map((a, j) => (
                      <div key={j} className={`pans-tile c${j}`}><Shape i={j} /><span>{a || '—'}</span></div>
                    ))}
                  </div>
                </article>
              ) : (
                <div className="card qcard flash" key={`e${ci}`}>
                  <div className="qcard-head">
                    <span className="qnum">Question {ci + 1}</span>
                    <span className="spacer" />
                    <QuizSelect size="sm" icon="⏱" label={`Question ${ci + 1} time limit`} value={cq.time}
                      onChange={t => setQ(ci, x => { x.time = t; })}
                      options={(TIMES.includes(cq.time) ? TIMES : [...TIMES, cq.time].sort((a, b) => a - b)).map(t => ({ value: t, label: `${t}s` }))} />
                    <label><input type="checkbox" checked={!!cq.double} onChange={e => setQ(ci, x => { x.double = e.target.checked; })} /> 2× points</label>
                    <button className="iconbtn" title="Toggle 2 / 4 answers" aria-label={`Question ${ci + 1}: switch to ${cq.answers.length === 4 ? 2 : 4} answers`} onClick={() => setQ(ci, x => {
                      if (x.answers.length === 4) { x.answers = ['True', 'False']; x.correct = Math.min(x.correct, 1); }
                      else x.answers = [...x.answers, '', ''];
                    })}>{cq.answers.length === 4 ? '2' : '4'}</button>
                    <button className="iconbtn" title="Move up" aria-label={`Move question ${ci + 1} up`} disabled={ci === 0} onClick={() => moveQuestion(ci, ci - 1)}>↑</button>
                    <button className="iconbtn" title="Move down" aria-label={`Move question ${ci + 1} down`} disabled={ci === quiz.questions.length - 1} onClick={() => moveQuestion(ci, ci + 2)}>↓</button>
                    <button className="iconbtn" title="Duplicate" aria-label={`Duplicate question ${ci + 1}`} onClick={() => { update(z => { z.questions.splice(ci + 1, 0, structuredClone(z.questions[ci])); return z; }); setCur(ci + 1); }}>⧉</button>
                    <button className="iconbtn" title="Delete" aria-label={`Delete question ${ci + 1}`} disabled={quiz.questions.length === 1} onClick={() => { update(z => { z.questions.splice(ci, 1); return z; }); setCur(Math.max(0, Math.min(ci, quiz.questions.length - 2))); }}>✕</button>
                  </div>
                  <input className="field" value={cq.q} placeholder="Type your question" aria-label={`Question ${ci + 1} text`} style={{ fontSize: 20, fontWeight: 700 }}
                    onChange={e => setQ(ci, x => { x.q = e.target.value; })} />
                  <div className="ans-edit">
                    {cq.answers.map((a, j) => (
                      <label key={j} className={`c${j}`} title="Select the correct answer">
                        <input type="radio" name={`correct-${ci}`} checked={cq.correct === j} onChange={() => setQ(ci, x => { x.correct = j; })} aria-label={`Answer ${j + 1} is correct`} />
                        <input type="text" value={a} placeholder={`Answer ${j + 1}`} aria-label={`Question ${ci + 1} answer ${j + 1}`} onChange={e => setQ(ci, x => { x.answers[j] = e.target.value; })} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="qstage-nav">
                <button className="btn light small" disabled={ci === 0} onClick={() => setCur(ci - 1)}><span aria-hidden>←</span> Previous</button>
                <span className="muted" aria-live="polite">Question {ci + 1} of {quiz.questions.length}</span>
                {ci < quiz.questions.length - 1
                  ? <button className="btn light small" onClick={() => setCur(ci + 1)}>Next <span aria-hidden>→</span></button>
                  : <button className="btn small" onClick={addQuestion}>+ Add question</button>}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="center"><p className="muted">No quiz selected. Create one to get started.</p></div>
      )}
    </div>
  );
}

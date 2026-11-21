'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { blankQuestion, sampleQuiz } from '@/lib/sample';
import type { Quiz, Question } from '@/lib/types';

const KEY = 'bz.quizzes';
const uid = () => Math.random().toString(36).slice(2, 10);

/** Quiz library + editor. Quizzes live in this browser's localStorage. */
export default function Studio({ onHost, error }: { onHost: (q: Quiz) => void; error: string }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selId, setSelId] = useState<string>('');
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

  function addQuiz(q: Quiz = { title: 'New quiz', questions: [blankQuestion()] }) {
    const nq = { ...q, id: uid() };
    save([nq, ...quizzes]);
    setSelId(nq.id);
  }

  function remove() {
    if (!quiz || !confirm(`Delete "${quiz.title}"?`)) return;
    const rest = quizzes.filter(q => q.id !== selId);
    save(rest);
    setSelId(rest[0]?.id ?? '');
  }

  function exportQuiz() {
    if (!quiz) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ title: quiz.title, questions: quiz.questions }, null, 2)], { type: 'application/json' }));
    a.download = `${quiz.title.replace(/[^\w-]+/g, '_') || 'quiz'}.json`;
    a.click();
  }

  async function importQuiz(f: File | undefined) {
    if (!f) return;
    try {
      const q = JSON.parse(await f.text());
      if (!Array.isArray(q.questions)) throw new Error();
      addQuiz({ title: q.title || f.name, questions: q.questions });
    } catch { alert('That file is not a Buzzline quiz.'); }
  }

  return (
    <div className="studio">
      <aside className="side">
        <Link href="/" className="logo"><span className="dot" />Buzzline</Link>
        <button className="btn small" onClick={() => addQuiz()}>+ New quiz</button>
        <h3>Your quizzes</h3>
        <div className="qlist">
          {quizzes.map(q => (
            <button key={q.id} className={q.id === selId ? 'on' : ''} onClick={() => setSelId(q.id!)}>
              {q.title || 'Untitled'}<small>{q.questions.length} question{q.questions.length === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost small" onClick={() => fileRef.current?.click()}>Import</button>
          <button className="btn ghost small" onClick={() => addQuiz(sampleQuiz())}>Add sample</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { importQuiz(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </aside>

      {quiz ? (
        <section className="editor">
          <div className="editor-top">
            <input className="field" value={quiz.title} onChange={e => update(z => ({ ...z, title: e.target.value }))} placeholder="Quiz title" />
            <button className="btn" onClick={() => onHost(quiz)}>▶ Host this quiz</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost small" onClick={exportQuiz}>Export JSON</button>
            <button className="btn ghost small" onClick={remove}>Delete quiz</button>
          </div>
          {error && <div className="card error" style={{ padding: 14 }}>{error}</div>}

          {quiz.questions.map((q, i) => (
            <div className="card qcard" key={i}>
              <div className="qcard-head">
                <span>Question {i + 1}</span>
                <span className="spacer" />
                <label>⏱ <select value={q.time} onChange={e => setQ(i, x => { x.time = Number(e.target.value); })}>
                  {[5, 10, 15, 20, 30, 45, 60, 90].map(t => <option key={t} value={t}>{t}s</option>)}
                </select></label>
                <label><input type="checkbox" checked={!!q.double} onChange={e => setQ(i, x => { x.double = e.target.checked; })} /> 2× points</label>
                <button className="iconbtn" title="Toggle 2 / 4 answers" onClick={() => setQ(i, x => {
                  if (x.answers.length === 4) { x.answers = ['True', 'False']; x.correct = Math.min(x.correct, 1); }
                  else x.answers = [...x.answers, '', ''];
                })}>{q.answers.length === 4 ? '2' : '4'}</button>
                <button className="iconbtn" title="Move up" disabled={i === 0} onClick={() => update(z => { [z.questions[i - 1], z.questions[i]] = [z.questions[i], z.questions[i - 1]]; return z; })}>↑</button>
                <button className="iconbtn" title="Move down" disabled={i === quiz.questions.length - 1} onClick={() => update(z => { [z.questions[i + 1], z.questions[i]] = [z.questions[i], z.questions[i + 1]]; return z; })}>↓</button>
                <button className="iconbtn" title="Duplicate" onClick={() => update(z => { z.questions.splice(i + 1, 0, structuredClone(z.questions[i])); return z; })}>⧉</button>
                <button className="iconbtn" title="Delete" disabled={quiz.questions.length === 1} onClick={() => update(z => { z.questions.splice(i, 1); return z; })}>✕</button>
              </div>
              <input className="field" value={q.q} placeholder="Type your question" style={{ fontSize: 20, fontWeight: 700 }}
                onChange={e => setQ(i, x => { x.q = e.target.value; })} />
              <div className="ans-edit">
                {q.answers.map((a, j) => (
                  <label key={j} className={`c${j}`} title="Select the correct answer">
                    <input type="radio" name={`correct-${i}`} checked={q.correct === j} onChange={() => setQ(i, x => { x.correct = j; })} />
                    <input type="text" value={a} placeholder={`Answer ${j + 1}`} onChange={e => setQ(i, x => { x.answers[j] = e.target.value; })} />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn ghost" onClick={() => update(z => { z.questions.push(blankQuestion()); return z; })}>+ Add question</button>
        </section>
      ) : (
        <div className="center"><p className="muted">No quiz selected. Create one to get started.</p></div>
      )}
    </div>
  );
}

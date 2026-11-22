// Reads quiz spreadsheets in the Kahoot import format, in the browser.
// Accepts both Kahoot's official template (instruction rows, then a header row like
// "Question - max 120 characters") and the plain form: a header row with Question, Answer 1–4,
// Time limit (seconds), Correct answer(s), then one question per row.
import { unzipSync, strFromU8 } from 'fflate';
import type { Question } from './types';

export const TIMES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 240];
const MAX_ROWS = 500;

export interface SheetImport { questions: Question[]; skipped: string[] }

/** Nearest allowed time limit; 10s (the default) when the cell is empty or not a number. */
export function snapTime(v: unknown) {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  if (!n) return 10;
  return TIMES.reduce((best, t) => (Math.abs(t - n) < Math.abs(best - n) ? t : best), TIMES[0]);
}

/** Column letters of a cell reference ("AB12" → 27, zero-based). */
function colIndex(ref: string) {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(el: Element | null) {
  if (!el) return '';
  // Rich text has several <t> runs; phonetic hints (<rPh>) are not part of the value.
  return Array.from(el.getElementsByTagName('t')).filter(t => t.parentElement?.tagName !== 'rPh').map(t => t.textContent ?? '').join('');
}

/** Rows of the first worksheet as arrays of cell strings. */
export function readXlsxRows(data: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(data); } catch { throw new Error("This file isn't a valid .xlsx spreadsheet"); }
  const xml = (name: string) => (files[name] ? new DOMParser().parseFromString(strFromU8(files[name]), 'application/xml') : null);

  // Find the first sheet through the workbook, falling back to sheet1.xml.
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = xml('xl/workbook.xml'), rels = xml('xl/_rels/workbook.xml.rels');
  const firstSheet = wb?.getElementsByTagName('sheet')[0];
  const rid = firstSheet?.getAttribute('r:id') ?? firstSheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const target = rid && rels ? Array.from(rels.getElementsByTagName('Relationship')).find(r => r.getAttribute('Id') === rid)?.getAttribute('Target') : null;
  if (target) sheetPath = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');

  const sheet = xml(sheetPath);
  if (!sheet) throw new Error('No worksheet found in this file');
  const shared = Array.from(xml('xl/sharedStrings.xml')?.getElementsByTagName('si') ?? []).map(textOf);

  const rows: string[][] = [];
  for (const row of Array.from(sheet.getElementsByTagName('row')).slice(0, MAX_ROWS)) {
    const out: string[] = [];
    Array.from(row.getElementsByTagName('c')).forEach((c, i) => {
      const ref = c.getAttribute('r');
      const col = ref ? colIndex(ref) : i;
      if (col > 30) return;
      const type = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      let val: string;
      if (type === 's') val = shared[Number(v)] ?? '';
      else if (type === 'inlineStr') val = textOf(c.getElementsByTagName('is')[0]);
      else if (type === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
      else val = v;
      out[col] = val.trim();
    });
    rows.push(Array.from(out, x => x ?? ''));
  }
  return rows;
}

/** Turns spreadsheet rows into questions, reporting the rows it had to skip. */
export function rowsToQuestions(rows: string[][]): SheetImport {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const headerAt = rows.findIndex(r => r.some(c => norm(c).startsWith('question')) && r.some(c => /^answer ?1\b/.test(norm(c))));
  if (headerAt < 0) throw new Error('Could not find the header row (Question, Answer 1, Answer 2…)');
  const head = rows[headerAt].map(norm);
  const find = (re: RegExp) => head.findIndex(h => re.test(h));
  const col = {
    q: find(/^question/),
    a: [1, 2, 3, 4].map(n => find(new RegExp(`^answer ?${n}\\b`))),
    time: find(/^time/),
    correct: find(/^correct/),
  };

  const questions: Question[] = [], skipped: string[] = [];
  rows.slice(headerAt + 1).forEach((r, i) => {
    const line = headerAt + i + 2; // spreadsheet row number
    const q = (r[col.q] ?? '').trim();
    const cells = col.a.map(c => (c >= 0 ? (r[c] ?? '').trim() : ''));
    if (!q && cells.every(a => !a)) return; // blank row
    if (!q) { skipped.push(`Row ${line}: no question text`); return; }

    // Keep filled answers, remembering their original numbers (1–4) for the correct-answer column.
    const kept = cells.map((a, j) => ({ a, n: j + 1 })).filter(x => x.a);
    if (kept.length < 2) { skipped.push(`Row ${line}: needs at least 2 answers`); return; }
    if (new Set(kept.map(x => x.a.toLowerCase())).size !== kept.length) { skipped.push(`Row ${line}: two answers are the same`); return; }

    // "Correct answer(s)" holds answer numbers, e.g. "3" or "1,3". Buzzline has one right answer: use the first.
    const nums = String(r[col.correct] ?? '').split(/[^\d]+/).map(Number).filter(Boolean);
    const correct = kept.findIndex(x => nums.includes(x.n));
    if (correct < 0) { skipped.push(`Row ${line}: no valid correct answer`); return; }

    questions.push({ q: q.slice(0, 200), answers: kept.map(x => x.a.slice(0, 80)), correct, time: snapTime(r[col.time]) });
  });
  return { questions, skipped };
}

export async function importSpreadsheet(file: File): Promise<SheetImport> {
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is too big (5 MB max)');
  return rowsToQuestions(readXlsxRows(new Uint8Array(await file.arrayBuffer())));
}

// Builds the downloadable quiz template (.xlsx) in the browser. Same columns as Kahoot's import,
// so a filled-in template works in both Buzzline's "Import spreadsheet" and Kahoot.
import { zipSync, strToU8 } from 'fflate';

const HEADER = ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Time limit (seconds)', 'Correct answer(s)'];
const EXAMPLES: (string | number)[][] = [
  ['Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Mercury', 20, 2],
  ['How many legs does a spider have?', '6', '8', '10', '12', 10, 2],
  ['The Great Wall of China is visible from the Moon with the naked eye.', 'True', 'False', '', '', 10, 2],
  ['Which of these is the largest ocean?', 'Atlantic', 'Indian', 'Arctic', 'Pacific', 30, 4],
];
const WIDTHS = [60, 22, 22, 22, 22, 20, 18];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i: number) => String.fromCharCode(65 + i);

function cell(v: string | number, ref: string, style: number) {
  if (typeof v === 'number') return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
  if (!v) return '';
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function sheetXml() {
  const rows = [HEADER, ...EXAMPLES].map((r, i) =>
    `<row r="${i + 1}">${r.map((v, j) => cell(v, `${colName(j)}${i + 1}`, i === 0 ? 1 : 2)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${WIDTHS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rows}</sheetData>
</worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBE18A"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildTemplate(): Uint8Array {
  const x = (s: string) => strToU8(s);
  return zipSync({
    '[Content_Types].xml': x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    '_rels/.rels': x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Quiz" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/worksheets/sheet1.xml': x(sheetXml()),
    'xl/styles.xml': x(STYLES),
  });
}

export function downloadTemplate() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildTemplate() as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = 'buzzline-quiz-template.xlsx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

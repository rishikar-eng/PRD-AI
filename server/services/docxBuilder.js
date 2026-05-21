/**
 * PRD → .docx converter.
 *
 * Produces a styled Word document from the markdown PRD text. The output is
 * opens cleanly in Google Docs, Word, LibreOffice, and Pages — and stays editable.
 *
 * Template:
 *   - Cover page with title + metadata table
 *   - 13 PRD sections, numbered, each on a fresh page or flowing naturally
 *   - Footer with page numbers
 *
 * Markdown elements supported in section bodies:
 *   - paragraphs (default)
 *   - `### Sub-heading`
 *   - `- ` / `* ` bullet lists
 *   - `1. ` numbered lists
 *   - `[ ] ` checkbox lists (rendered as ☐ bullet)
 *   - inline `**bold**`, `*italic*`, `` `code` ``
 *   - ``` ```code blocks``` ``` (rendered monospace)
 */

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  Footer, PageNumber, NumberFormat,
  LevelFormat, convertInchesToTwip,
  ShadingType,
} from 'docx';

const RIAN_PINK = 'EC4899';
const RIAN_DARK = '1A1A1A';
const RIAN_GREY = '666666';
const RIAN_LIGHT_BG = 'F7F7F9';

/**
 * Parse the AI-generated PRD markdown into ordered sections.
 * Returns: [{ title, body }, ...] in document order.
 */
function parseSections(md) {
  const lines = md.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ title: s.title, body: s.body.join('\n').trim() }));
}

/** Render a single line of markdown into an array of TextRun (handles **bold**, *italic*, `code`). */
function inlineRuns(line) {
  const runs = [];
  // Tokenize on **, *, `
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: line.slice(lastIndex, match.index) }));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else if (token.startsWith('`')) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: 'Consolas', shading: { type: ShadingType.SOLID, fill: 'EFEFF2', color: 'auto' } }));
    } else if (token.startsWith('*')) {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    runs.push(new TextRun({ text: line.slice(lastIndex) }));
  }
  return runs.length ? runs : [new TextRun({ text: line })];
}

/**
 * Convert a section body (markdown) into an array of docx Paragraph/Table elements.
 */
function renderSectionBody(body) {
  const out = [];
  const lines = body.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — skip
    if (trimmed === '') {
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      for (const cl of codeLines) {
        out.push(new Paragraph({
          spacing: { before: 60, after: 60 },
          shading: { type: ShadingType.SOLID, fill: 'F7F7F9', color: 'auto' },
          children: [new TextRun({ text: cl || ' ', font: 'Consolas', size: 20 })],
        }));
      }
      continue;
    }

    // Sub-heading ###
    const sub = trimmed.match(/^###\s+(.+)$/);
    if (sub) {
      out.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: sub[1], bold: true, size: 26, color: RIAN_DARK })],
      }));
      i++;
      continue;
    }

    // Checkbox list
    const checkbox = trimmed.match(/^\[\s*[xX ]?\s*\]\s+(.+)$/);
    if (checkbox) {
      out.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({ text: '☐  ', size: 22 }),
          ...inlineRuns(checkbox[1]),
        ],
      }));
      i++;
      continue;
    }

    // Numbered list
    const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      out.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: convertInchesToTwip(0.4) },
        children: [
          new TextRun({ text: `${numbered[1]}. `, bold: true }),
          ...inlineRuns(numbered[2]),
        ],
      }));
      i++;
      continue;
    }

    // Bullet list
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      out.push(new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: convertInchesToTwip(0.4) },
        children: [
          new TextRun({ text: '•  ' }),
          ...inlineRuns(bullet[1]),
        ],
      }));
      i++;
      continue;
    }

    // Default paragraph
    out.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      children: inlineRuns(trimmed),
    }));
    i++;
  }

  return out;
}

/** Cover-page metadata row. */
function metaRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, fill: RIAN_LIGHT_BG, color: 'auto' },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({
          children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 18, color: RIAN_GREY })],
        })],
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({
          children: [new TextRun({ text: value || '—', size: 22, color: RIAN_DARK })],
        })],
      }),
    ],
  });
}

export async function buildPRDDocx({ prdText, featureName, role, author, version = 'v1.0', status = 'FINALIZED' }) {
  const sections = parseSections(prdText);
  const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const coverChildren = [
    // Top accent bar
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: RIAN_PINK, color: 'auto' },
      spacing: { before: 0, after: 600 },
      children: [new TextRun({ text: ' ', size: 4 })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: 'RIAN', bold: true, size: 24, color: RIAN_PINK, characterSpacing: 30 })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 600 },
      children: [new TextRun({ text: 'Product Requirements Document', size: 24, color: RIAN_GREY })],
    }),
    // Feature title
    new Paragraph({
      spacing: { before: 200, after: 800 },
      children: [new TextRun({ text: featureName || 'Untitled Feature', bold: true, size: 56, color: RIAN_DARK })],
    }),
    // Metadata table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E3E3E8' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E3E3E8' },
        left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E3E3E8' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      },
      rows: [
        metaRow('Owner', author || '—'),
        metaRow('Role', role || '—'),
        metaRow('Date', formattedDate),
        metaRow('Version', version),
        metaRow('Status', status),
      ],
    }),
    new Paragraph({ children: [], pageBreakBefore: false }),
  ];

  // Body sections
  const bodyChildren = [];
  sections.forEach((section, index) => {
    bodyChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: index === 0,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: `${index + 1}. `, bold: true, size: 32, color: RIAN_PINK }),
        new TextRun({ text: section.title, bold: true, size: 32, color: RIAN_DARK }),
      ],
    }));
    bodyChildren.push(...renderSectionBody(section.body));
  });

  const doc = new Document({
    creator: 'Rian PRD Pipeline',
    title: featureName || 'Untitled Feature',
    description: 'Product Requirements Document',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: RIAN_DARK },
          paragraph: { spacing: { line: 320 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18, color: RIAN_GREY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: RIAN_GREY }),
                new TextRun({ text: ' of ', size: 18, color: RIAN_GREY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: RIAN_GREY }),
              ],
            })],
          }),
        },
        children: [...coverChildren, ...bodyChildren],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

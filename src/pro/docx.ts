import {
  AlignmentType,
  convertMillimetersToTwip,
  Document,
  Footer,
  HeadingLevel,
  LeaderType,
  LineRuleType,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from "docx";
import { HEADINGS } from "./prompts";
import type { WrittenCoursework } from "./types";

const FONT = "Times New Roman";
const SIZE = 28; // half-points => 14pt
const LINE = 360; // twips => 1.5 spacing
const BLANK = "____________________";

/** A4 width 210mm minus the 30mm left and 15mm right margins. */
const TEXT_WIDTH_MM = 165;
/** Times New Roman 14pt at 1.5 spacing on A4 with these margins. */
const LINES_PER_PAGE = 30;
const CHARS_PER_LINE = 65;
/** A heading plus the whitespace Word puts above and below it. */
const HEADING1_LINES = 4;
const HEADING2_LINES = 3;

/** Splits **bold** / *italic* markers into docx runs. */
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push(new TextRun(text.slice(last, match.index)));
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
    }
    last = match.index + token.length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length ? runs : [new TextRun(text)];
}

/** Turns a model-written block of prose into body paragraphs. */
function bodyParagraphs(text: string): Paragraph[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: Paragraph[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((l) => /^([-•*—]|\d+[.)])\s+/.test(l));

    if (isList) {
      for (const line of lines) {
        out.push(
          new Paragraph({
            children: inlineRuns(line.replace(/^([-•*—]|\d+[.)])\s+/, "")),
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: 60 },
          }),
        );
      }
      continue;
    }

    out.push(
      new Paragraph({
        children: inlineRuns(lines.join(" ")),
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertMillimetersToTwip(12.5) },
        spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: 0 },
      }),
    );
  }
  return out;
}

function centered(text: string, opts: { bold?: boolean; size?: number; after?: number } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? SIZE })],
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: opts.after ?? 0 },
  });
}

function sectionHeading(text: string, level: 1 | 2): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 240, after: 240, line: LINE, lineRule: LineRuleType.AUTO },
    pageBreakBefore: level === 1,
  });
}

function titlePage(doc: WrittenCoursework): Paragraph[] {
  const h = HEADINGS[doc.docLang];
  const m = doc.meta;
  const year = m.year ?? String(new Date().getFullYear());
  const gap = (n = 1) => Array.from({ length: n }, () => centered(""));

  return [
    centered((m.university ?? BLANK).toUpperCase(), { bold: true }),
    centered(m.faculty ?? BLANK),
    centered(m.department ?? BLANK),
    centered(m.direction ?? BLANK),
    ...gap(4),
    centered(h.courseworkLabel, { bold: true, size: 36, after: 120 }),
    ...gap(1),
    centered(`${h.topicLabel}`, { bold: false }),
    centered(`«${doc.topic}»`, { bold: true, size: 32 }),
    ...gap(6),
    new Paragraph({
      children: [new TextRun({ text: `${h.studentLabel} ${m.student ?? BLANK}` })],
      alignment: AlignmentType.RIGHT,
      spacing: { line: LINE, lineRule: LineRuleType.AUTO },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: m.group ? `${m.group}` : `${BLANK}` }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${h.supervisorLabel} ${m.supervisor ?? BLANK}` })],
      alignment: AlignmentType.RIGHT,
      spacing: { line: LINE, lineRule: LineRuleType.AUTO },
    }),
    ...gap(4),
    centered(`${m.city ?? BLANK} — ${year}`),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ── contents page ────────────────────────────────────────────────────────────
// Word's TOC field renders blank until an application computes it, and the
// viewers students actually use — WPS, Google Docs, phone previews, Telegram's
// own — never do. So the contents are written out literally, with page numbers
// derived from the generated text.

interface ContentsEntry {
  text: string;
  page: number;
  indent: boolean;
}

/** How many rendered lines a block of body prose occupies. */
function linesForBody(text: string): number {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .reduce((sum, block) => sum + Math.max(1, Math.ceil(block.length / CHARS_PER_LINE)), 0);
}

function pagesFor(lines: number): number {
  return Math.max(1, Math.ceil(lines / LINES_PER_PAGE));
}

/**
 * Walks the document the way Word will lay it out. Every level-1 heading starts
 * a fresh page (pageBreakBefore), so chapter boundaries are exact; only the
 * position of a subsection inside its chapter is an estimate.
 */
function planContents(doc: WrittenCoursework): ContentsEntry[] {
  const h = HEADINGS[doc.docLang];
  const entries: ContentsEntry[] = [];

  const entryCount = 2 + doc.chapters.reduce((n, c) => n + 1 + c.sections.length, 0) + 1;
  const contentsPages = pagesFor(entryCount + 3);

  // page 1 is the title page, then the contents, then the body.
  let page = 1 + contentsPages + 1;

  entries.push({ text: h.intro, page, indent: false });
  page += pagesFor(HEADING1_LINES + linesForBody(doc.intro));

  doc.chapters.forEach((chapter, ci) => {
    entries.push({
      text: `${h.chapter(ci + 1)} ${chapter.title.toUpperCase()}`,
      page,
      indent: false,
    });

    let linesUsed = HEADING1_LINES;
    chapter.sections.forEach((section, si) => {
      entries.push({
        text: `${ci + 1}.${si + 1}. ${section.title}`,
        page: page + Math.floor(linesUsed / LINES_PER_PAGE),
        indent: true,
      });
      linesUsed += HEADING2_LINES + linesForBody(section.body);
    });

    page += pagesFor(linesUsed);
  });

  entries.push({ text: h.conclusion, page, indent: false });
  page += pagesFor(HEADING1_LINES + linesForBody(doc.conclusion));

  entries.push({ text: h.references, page, indent: false });

  return entries;
}

function contentsParagraphs(doc: WrittenCoursework): Paragraph[] {
  const h = HEADINGS[doc.docLang];

  const out: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: h.contents, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: LINE, lineRule: LineRuleType.AUTO },
    }),
  ];

  for (const entry of planContents(doc)) {
    out.push(
      new Paragraph({
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: convertMillimetersToTwip(TEXT_WIDTH_MM),
            leader: LeaderType.DOT,
          },
        ],
        indent: entry.indent ? { left: convertMillimetersToTwip(10) } : undefined,
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: 40 },
        children: [
          new TextRun({ text: entry.text, bold: !entry.indent }),
          new TextRun({ children: [new Tab()] }),
          new TextRun({ text: String(entry.page) }),
        ],
      }),
    );
  }

  return out;
}

export async function buildCourseworkDocx(doc: WrittenCoursework): Promise<Buffer> {
  const h = HEADINGS[doc.docLang];
  const children: Paragraph[] = [];

  children.push(...titlePage(doc));

  // Contents, written out as real text so every viewer shows it.
  children.push(...contentsParagraphs(doc));

  // Introduction
  children.push(sectionHeading(h.intro, 1));
  children.push(...bodyParagraphs(doc.intro));

  // Chapters
  doc.chapters.forEach((chapter, ci) => {
    children.push(sectionHeading(`${h.chapter(ci + 1)} ${chapter.title.toUpperCase()}`, 1));
    chapter.sections.forEach((section, si) => {
      children.push(sectionHeading(`${ci + 1}.${si + 1}. ${section.title}`, 2));
      children.push(...bodyParagraphs(section.body));
    });
  });

  // Conclusion
  children.push(sectionHeading(h.conclusion, 1));
  children.push(...bodyParagraphs(doc.conclusion));

  // References
  children.push(sectionHeading(h.references, 1));
  doc.references.forEach((reference, index) => {
    children.push(
      new Paragraph({
        children: inlineRuns(`${index + 1}. ${reference}`),
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: LINE, lineRule: LineRuleType.AUTO, after: 60 },
        indent: { left: convertMillimetersToTwip(8), hanging: convertMillimetersToTwip(8) },
      }),
    );
  });

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE, color: "000000" },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE, lineRule: LineRuleType.AUTO },
          },
        },
        heading1: {
          run: { font: FONT, size: SIZE, bold: true, color: "000000" },
          paragraph: { spacing: { before: 240, after: 240, line: LINE, lineRule: LineRuleType.AUTO } },
        },
        heading2: {
          run: { font: FONT, size: SIZE, bold: true, color: "000000" },
          paragraph: { spacing: { before: 200, after: 160, line: LINE, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              right: convertMillimetersToTwip(15),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
            },
          },
        },
        footers: {
          first: new Footer({ children: [new Paragraph("")] }),
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

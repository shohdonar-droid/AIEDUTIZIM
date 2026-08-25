import PptxGenJS from "pptxgenjs";
import { HEADINGS } from "./prompts";
import type { SlideContent, WrittenDeck } from "./types";

/**
 * pptxgenjs 4.x ships an ESM build whose default export is double-wrapped
 * ({ default: ctor }); 3.x exported the constructor directly. The bundled
 * .d.ts describes the 3.x shape in both cases, so unwrap at runtime and keep
 * the imported name for type positions.
 */
const PptxCtor = ((PptxGenJS as unknown as { default?: typeof PptxGenJS }).default
  ?? PptxGenJS) as typeof PptxGenJS;

/**
 * Palette: the validated reference categorical set, first three slots.
 * Verified with the dataviz validator against a #FFFFFF slide surface —
 * 3 slots clear every gate on all-pairs; a 4th (yellow) fails the
 * normal-vision floor against orange, so doughnuts are capped at 3 slices
 * and anything wider becomes a single-hue bar chart instead.
 */
const SERIES = ["2a78d6", "eb6834", "1baf7a"] as const;

const INK = "0B0B0B"; // primary ink
const INK_SOFT = "52514E"; // secondary ink
const MUTED = "898781"; // axis / caption
const RULE = "E1E0D9"; // hairline
const PANEL = "F1F5FA"; // card surface
const PAPER = "FFFFFF";
const ACCENT = SERIES[0];
const DEEP = "13324F"; // cover / divider ground
const DEEP_SOFT = "2C5077"; // muted mark on the deep ground

/** Ordinal ramp for ordered steps — light→dark, none lighter than step 250. */
const STEPS: { fill: string; ink: string }[] = [
  { fill: "86b6ef", ink: INK },
  { fill: "5598e7", ink: INK },
  { fill: "2a78d6", ink: PAPER },
  { fill: "1c5cab", ink: PAPER },
  { fill: "184f95", ink: PAPER },
];

const FONT = "Calibri";

// Slide is 10 × 5.625 in.
const M = 0.6; // side margin
const W = 10 - M * 2; // content width
const BODY_TOP = 1.55;
const BODY_BOTTOM = 5.15;

type Slide = ReturnType<PptxGenJS["addSlide"]>;

// ── chrome ───────────────────────────────────────────────────────────────────

function slideTitle(slide: Slide, title: string, subtitle?: string): void {
  slide.addText(title, {
    x: M,
    y: 0.4,
    w: W,
    h: 0.68,
    fontFace: FONT,
    fontSize: 26,
    bold: true,
    color: INK,
    valign: "middle",
  });
  slide.addShape("rect", {
    x: M,
    y: 1.16,
    w: 1.05,
    h: 0.055,
    fill: { color: ACCENT },
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: M + 1.25,
      y: 1.05,
      w: W - 1.25,
      h: 0.28,
      fontFace: FONT,
      fontSize: 12,
      color: MUTED,
      valign: "middle",
    });
  }
}

function slideFooter(slide: Slide, deck: WrittenDeck, index: number): void {
  slide.addShape("line", {
    x: M,
    y: 5.3,
    w: W,
    h: 0,
    line: { color: RULE, width: 1 },
  });
  slide.addText(deck.topic, {
    x: M,
    y: 5.34,
    w: W - 0.8,
    h: 0.24,
    fontFace: FONT,
    fontSize: 9,
    color: MUTED,
    valign: "middle",
  });
  slide.addText(String(index), {
    x: 10 - M - 0.6,
    y: 5.34,
    w: 0.6,
    h: 0.24,
    fontFace: FONT,
    fontSize: 9,
    color: MUTED,
    align: "right",
    valign: "middle",
  });
}

function sourceLine(slide: Slide, source: string): void {
  if (!source.trim()) return;
  slide.addText(source, {
    x: M,
    y: 4.92,
    w: W,
    h: 0.22,
    fontFace: FONT,
    fontSize: 9,
    italic: true,
    color: MUTED,
  });
}

// ── layouts ──────────────────────────────────────────────────────────────────

function layoutBullets(slide: Slide, c: SlideContent): void {
  const items = c.items.slice(0, 6);
  const n = Math.max(1, items.length);
  const gap = Math.min(0.78, (BODY_BOTTOM - BODY_TOP) / n);
  const size = n >= 5 ? 15 : 17;

  items.forEach((text, i) => {
    const y = BODY_TOP + i * gap;
    slide.addShape("ellipse", {
      x: M + 0.1,
      y: y + 0.04,
      w: 0.34,
      h: 0.34,
      fill: { color: ACCENT },
    });
    slide.addText(String(i + 1), {
      x: M + 0.1,
      y: y + 0.04,
      w: 0.34,
      h: 0.34,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: PAPER,
      align: "center",
      valign: "middle",
    });
    slide.addText(text, {
      x: M + 0.62,
      y,
      w: W - 0.72,
      h: gap - 0.06,
      fontFace: FONT,
      fontSize: size,
      color: INK,
      valign: "top",
      lineSpacingMultiple: 1.1,
    });
  });
}

function layoutCards(slide: Slide, c: SlideContent): void {
  const items = c.items.slice(0, 4);
  const n = Math.max(1, items.length);
  const gapX = 0.24;
  const w = (W - gapX * (n - 1)) / n;
  const y = 1.75;
  const h = 2.9;

  items.forEach((text, i) => {
    const x = M + i * (w + gapX);
    slide.addShape("roundRect", {
      x,
      y,
      w,
      h,
      fill: { color: PANEL },
      line: { color: RULE, width: 1 },
      rectRadius: 0.08,
    });
    slide.addShape("ellipse", {
      x: x + 0.24,
      y: y + 0.26,
      w: 0.42,
      h: 0.42,
      fill: { color: ACCENT },
    });
    slide.addText(String(i + 1), {
      x: x + 0.24,
      y: y + 0.26,
      w: 0.42,
      h: 0.42,
      fontFace: FONT,
      fontSize: 13,
      bold: true,
      color: PAPER,
      align: "center",
      valign: "middle",
    });
    slide.addText(text, {
      x: x + 0.24,
      y: y + 0.85,
      w: w - 0.48,
      h: h - 1.1,
      fontFace: FONT,
      fontSize: n >= 4 ? 13 : 15,
      color: INK,
      valign: "top",
      lineSpacingMultiple: 1.12,
    });
  });
}

function layoutStats(slide: Slide, c: SlideContent): void {
  const stats = c.stats.slice(0, 3);
  const n = Math.max(1, stats.length);
  const gapX = 0.3;
  const w = (W - gapX * (n - 1)) / n;
  const y = 2.25; // block is ~2.1 high — sits centred in the body region

  stats.forEach((stat, i) => {
    const x = M + i * (w + gapX);
    slide.addText(stat.value, {
      x,
      y,
      w,
      h: 1.15,
      fontFace: FONT,
      fontSize: 54,
      bold: true,
      color: SERIES[i % SERIES.length],
      align: "center",
      valign: "middle",
    });
    slide.addShape("line", {
      x: x + w * 0.3,
      y: y + 1.2,
      w: w * 0.4,
      h: 0,
      line: { color: RULE, width: 1 },
    });
    slide.addText(stat.label, {
      x,
      y: y + 1.32,
      w,
      h: 0.8,
      fontFace: FONT,
      fontSize: 13,
      color: INK_SOFT,
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.1,
    });
  });

  sourceLine(slide, c.source);
}

function layoutCompare(slide: Slide, c: SlideContent): void {
  const gapX = 0.3;
  const w = (W - gapX) / 2;
  const columns: [string, string[], string][] = [
    [c.labelLeft || "", c.items.slice(0, 5), SERIES[0]],
    [c.labelRight || "", c.itemsRight.slice(0, 5), SERIES[1]],
  ];

  columns.forEach(([label, items, color], col) => {
    const x = M + col * (w + gapX);
    slide.addShape("roundRect", {
      x,
      y: 1.6,
      w,
      h: 0.52,
      fill: { color },
      rectRadius: 0.06,
    });
    slide.addText(label, {
      x: x + 0.2,
      y: 1.6,
      w: w - 0.4,
      h: 0.52,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: PAPER,
      valign: "middle",
    });

    if (items.length > 0) {
      slide.addText(
        items.map((text) => ({
          text,
          options: {
            bullet: { characterCode: "2013" }, // en dash
            fontFace: FONT,
            fontSize: 14,
            color: INK,
            paraSpaceAfter: 10,
            lineSpacingMultiple: 1.1,
          },
        })),
        { x: x + 0.12, y: 2.32, w: w - 0.24, h: 2.6, valign: "top" },
      );
    }
  });
}

function layoutProcess(slide: Slide, c: SlideContent): void {
  const items = c.items.slice(0, 5);
  const n = Math.max(1, items.length);
  const overlap = 0.14;
  const w = (W + overlap * (n - 1)) / n;
  const y = 1.95;
  const h = 0.92;

  // The step label sits below the chevron rather than inside it: a chevron's
  // left notch and right point eat into the usable box, and long Uzbek words
  // get clipped by the neighbouring arrow.
  items.forEach((text, i) => {
    const step = STEPS[Math.min(i, STEPS.length - 1)];
    const x = M + i * (w - overlap);

    slide.addShape("chevron", { x, y, w, h, fill: { color: step.fill } });
    slide.addText(String(i + 1), {
      x,
      y,
      w,
      h,
      fontFace: FONT,
      fontSize: 22,
      bold: true,
      color: step.ink,
      align: "center",
      valign: "middle",
    });
    slide.addText(text, {
      x: x + 0.1,
      y: y + h + 0.18,
      w: w - 0.2,
      h: 1.05,
      fontFace: FONT,
      fontSize: n >= 5 ? 12 : 13.5,
      color: INK,
      align: "center",
      valign: "top",
      lineSpacingMultiple: 1.12,
    });
  });

  if (c.subtitle) {
    slide.addText(c.subtitle, {
      x: M,
      y: 4.25,
      w: W,
      h: 0.7,
      fontFace: FONT,
      fontSize: 13,
      color: INK_SOFT,
      align: "center",
      valign: "top",
    });
  }
}

/**
 * PowerPoint's default number format rounds to whole numbers, which turns
 * 1.32 / 1.44 / 1.58 into "1 / 1 / 2". Derive the format from the data.
 */
function numberFormat(values: number[]): string {
  const decimals = Math.min(
    2,
    Math.max(
      0,
      ...values.map((v) => {
        const text = String(v);
        const dot = text.indexOf(".");
        return dot === -1 ? 0 : text.length - dot - 1;
      }),
    ),
  );
  return decimals === 0 ? "#,##0" : `#,##0.${"0".repeat(decimals)}`;
}

function layoutChart(pptx: PptxGenJS, slide: Slide, c: SlideContent): void {
  const labels = c.chartCategories.slice(0, 8);
  const values = c.chartValues.slice(0, labels.length);
  if (labels.length === 0 || values.length !== labels.length) {
    layoutBullets(slide, c);
    return;
  }

  // A doughnut is only legible while every slice pair stays separable — the
  // validated set is three. Wider data goes to a single-hue bar chart, where
  // colour carries no meaning at all.
  const doughnut = c.chartType === "pie" && labels.length <= 3;

  if (doughnut) {
    slide.addChart(
      pptx.ChartType.doughnut,
      [{ name: c.chartUnit || "", labels, values }],
      {
        x: M + 0.5,
        y: 1.6,
        w: W - 1,
        h: 3.2,
        holeSize: 55,
        chartColors: [...SERIES],
        dataBorder: { pt: 2, color: PAPER }, // 2px surface gap between slices
        showLegend: true,
        legendPos: "r",
        legendFontFace: FONT,
        legendFontSize: 12,
        legendColor: INK,
        showPercent: true,
        dataLabelColor: PAPER,
        dataLabelFontFace: FONT,
        dataLabelFontSize: 12,
        dataLabelFontBold: true,
      },
    );
  } else {
    slide.addChart(
      pptx.ChartType.bar,
      [{ name: c.chartUnit || "", labels, values }],
      {
        x: M + 0.1,
        y: 1.6,
        w: W - 0.2,
        h: 3.2,
        barDir: "col",
        barGapWidthPct: 120, // thin marks
        chartColors: [ACCENT],
        showLegend: false,
        showValue: true, // direct labels — no reliance on colour or gridlines
        dataLabelColor: INK,
        dataLabelFontFace: FONT,
        dataLabelFontSize: 11,
        dataLabelPosition: "outEnd",
        dataLabelFormatCode: numberFormat(values),
        catAxisLabelFontFace: FONT,
        catAxisLabelFontSize: 11,
        catAxisLabelColor: INK_SOFT,
        catAxisLineShow: true,
        catGridLine: { style: "none" },
        valAxisLabelFontFace: FONT,
        valAxisLabelFontSize: 10,
        valAxisLabelColor: MUTED,
        valAxisLabelFormatCode: numberFormat(values),
        valAxisLineShow: false,
        valGridLine: { color: RULE, size: 1 },
        border: { pt: 0, color: PAPER },
      },
    );
  }

  sourceLine(slide, c.source);
}

function layoutQuote(slide: Slide, c: SlideContent): void {
  slide.addShape("rect", {
    x: M,
    y: 1.85,
    w: 0.07,
    h: 2.4,
    fill: { color: ACCENT },
  });
  slide.addText("“", {
    x: M + 0.22,
    y: 1.5,
    w: 1,
    h: 0.9,
    fontFace: "Georgia",
    fontSize: 60,
    color: STEPS[0].fill,
  });
  slide.addText(c.items[0] ?? c.subtitle ?? "", {
    x: M + 0.35,
    y: 2.1,
    w: W - 0.6,
    h: 1.9,
    fontFace: FONT,
    fontSize: 19,
    italic: true,
    color: INK,
    valign: "top",
    lineSpacingMultiple: 1.2,
  });
  if (c.source) {
    slide.addText(`— ${c.source}`, {
      x: M + 0.35,
      y: 4.1,
      w: W - 0.6,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12,
      color: MUTED,
    });
  }
}

function layoutSection(slide: Slide, c: SlideContent, ordinal: number): void {
  slide.background = { color: DEEP };
  slide.addText(String(ordinal).padStart(2, "0"), {
    x: M,
    y: 1.35,
    w: 2,
    h: 1.5,
    fontFace: FONT,
    fontSize: 88,
    bold: true,
    color: DEEP_SOFT,
    valign: "middle",
  });
  slide.addShape("rect", {
    x: M,
    y: 2.95,
    w: 1.05,
    h: 0.06,
    fill: { color: SERIES[1] },
  });
  slide.addText(c.title, {
    x: M,
    y: 3.15,
    w: W,
    h: 1.1,
    fontFace: FONT,
    fontSize: 30,
    bold: true,
    color: PAPER,
    valign: "top",
  });
  if (c.subtitle) {
    slide.addText(c.subtitle, {
      x: M,
      y: 4.2,
      w: W,
      h: 0.5,
      fontFace: FONT,
      fontSize: 13,
      color: "A9C3DC",
    });
  }
}

// ── deck ─────────────────────────────────────────────────────────────────────

export async function buildDeckPptx(deck: WrittenDeck): Promise<Buffer> {
  const h = HEADINGS[deck.docLang];
  const pptx = new PptxCtor();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = deck.author || "Kurs Ishi Bot";
  pptx.title = deck.topic;
  pptx.subject = deck.subject;

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: DEEP };
  cover.addShape("rect", { x: M, y: 1.5, w: 0.09, h: 1.55, fill: { color: SERIES[1] } });
  cover.addText(deck.topic, {
    x: M + 0.35,
    y: 1.45,
    w: W - 0.35,
    h: 1.65,
    fontFace: FONT,
    fontSize: 31,
    bold: true,
    color: PAPER,
    valign: "middle",
  });
  cover.addText(deck.subject, {
    x: M + 0.35,
    y: 3.2,
    w: W - 0.35,
    h: 0.4,
    fontFace: FONT,
    fontSize: 15,
    color: "A9C3DC",
  });
  if (deck.author) {
    cover.addText(deck.author, {
      x: M + 0.35,
      y: 4.35,
      w: W - 0.35,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      color: "8FA9C2",
    });
  }

  // Body
  let sectionOrdinal = 0;
  deck.slides.forEach((content, i) => {
    const slide = pptx.addSlide();
    const index = i + 2;

    if (content.layout === "section") {
      sectionOrdinal += 1;
      layoutSection(slide, content, sectionOrdinal);
      if (content.note) slide.addNotes(content.note);
      return;
    }

    slide.background = { color: PAPER };
    slideTitle(slide, content.title, content.subtitle && content.layout !== "process" ? content.subtitle : undefined);

    switch (content.layout) {
      case "cards":
        layoutCards(slide, content);
        break;
      case "stats":
        layoutStats(slide, content);
        break;
      case "compare":
        layoutCompare(slide, content);
        break;
      case "process":
        layoutProcess(slide, content);
        break;
      case "chart":
        layoutChart(pptx, slide, content);
        break;
      case "quote":
        layoutQuote(slide, content);
        break;
      default:
        layoutBullets(slide, content);
    }

    slideFooter(slide, deck, index);
    if (content.note) slide.addNotes(content.note);
  });

  // Closing
  const end = pptx.addSlide();
  end.background = { color: DEEP };
  end.addShape("rect", { x: 4.475, y: 2.05, w: 1.05, h: 0.06, fill: { color: SERIES[1] } });
  end.addText(h.thanks, {
    x: M,
    y: 2.3,
    w: W,
    h: 0.9,
    fontFace: FONT,
    fontSize: 30,
    bold: true,
    color: PAPER,
    align: "center",
    valign: "middle",
  });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

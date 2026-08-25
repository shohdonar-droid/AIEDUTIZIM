import { config } from "./config";
import type {
  DocLang,
  Outline,
  OrderSpec,
  SlideContent,
  WrittenCoursework,
  WrittenDeck,
} from "./types";
import { completeJson, completeText, mapLimit } from "./claude";
import {
  HEADINGS,
  LANG_NAME,
  OUTLINE_SCHEMA,
  outlinePrompt,
  outlineSystem,
  writerSystem,
} from "./prompts";

/** Words that fit on one A4 page: Times New Roman 14pt, 1.5 spacing. */
const WORDS_PER_PAGE = 260;
/** Title page + contents + references consume roughly this many pages. */
const OVERHEAD_PAGES = 3;

export type ProgressFn = (percent: number, stage: string) => void | Promise<void>;

// ── outline (the free preview) ───────────────────────────────────────────────

export async function generateOutline(topic: string, docLang: DocLang): Promise<Outline> {
  const outline = await completeJson<Outline>({
    system: outlineSystem(docLang),
    prompt: outlinePrompt(topic, docLang),
    schema: OUTLINE_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
  });

  // Defensive: the schema guarantees shape, not sanity.
  outline.chapters = (outline.chapters ?? [])
    .filter((c) => c.title)
    .map((c) => ({ ...c, sections: (c.sections ?? []).filter((s) => s.title) }))
    .filter((c) => c.sections.length > 0);

  if (outline.chapters.length === 0) throw new Error("Outline came back empty");
  return outline;
}

/** Renders the outline as the numbered plan shown in Telegram and in MUNDARIJA. */
export function formatOutline(outline: Outline, docLang: DocLang, html = true): string {
  const h = HEADINGS[docLang];
  const b = (s: string) => (html ? `<b>${escapeHtml(s)}</b>` : s);
  const plain = (s: string) => (html ? escapeHtml(s) : s);

  const lines: string[] = [h.intro];
  outline.chapters.forEach((chapter, ci) => {
    lines.push(`\n${b(`${h.chapter(ci + 1)} ${chapter.title.toUpperCase()}`)}`);
    chapter.sections.forEach((section, si) => {
      lines.push(`   ${ci + 1}.${si + 1}. ${plain(section.title)}`);
    });
  });
  lines.push(`\n${h.conclusion}`);
  lines.push(h.references);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── full coursework ──────────────────────────────────────────────────────────

export async function generateCoursework(
  spec: OrderSpec,
  onProgress: ProgressFn,
): Promise<WrittenCoursework> {
  const docLang = spec.docLang;
  const outline = spec.outline ?? (await generateOutline(spec.topic, docLang));
  const subject = outline.subject || spec.subject;
  const system = writerSystem(docLang, subject);

  const bodyWords = Math.max(1200, (spec.pages - OVERHEAD_PAGES) * WORDS_PER_PAGE);
  const introWords = Math.round(bodyWords * 0.09);
  const conclusionWords = Math.round(bodyWords * 0.08);
  const sectionCount = outline.chapters.reduce((sum, c) => sum + c.sections.length, 0);
  const sectionWords = Math.max(300, Math.round((bodyWords * 0.83) / Math.max(1, sectionCount)));

  const planText = formatOutline(outline, docLang, false);
  const context =
    `Paper title: "${outline.title}"\n` +
    `Subject: ${subject}\n` +
    `Full plan of the paper:\n${planText}\n`;

  // 1. Introduction
  await onProgress(10, "intro");
  const intro = await completeText({
    system,
    prompt:
      `${context}\n` +
      `Write the ${HEADINGS[docLang].intro} section, about ${introWords} words.\n\n` +
      `It must cover, as continuous prose: why the topic matters now; the degree to which it has been studied; ` +
      `the aim of the paper; the tasks that follow from that aim; the object and subject of research; ` +
      `the research methods used; and the structure of the work.`,
    maxTokens: 8000,
  });

  // 2. Body sections, written in parallel with bounded concurrency
  const jobs = outline.chapters.flatMap((chapter, ci) =>
    chapter.sections.map((section, si) => ({ chapter, ci, section, si })),
  );

  let finished = 0;
  const bodies = await mapLimit(jobs, config.generation.concurrency, async (job) => {
    const number = `${job.ci + 1}.${job.si + 1}`;
    const text = await completeText({
      system,
      prompt:
        `${context}\n` +
        `Write subsection ${number} — "${job.section.title}" — inside chapter "${job.chapter.title}".\n` +
        `Target length: about ${sectionWords} words.\n\n` +
        `Cover these points, developed into argument rather than listed:\n` +
        job.section.points.map((p) => `- ${p}`).join("\n") +
        `\n\nStay inside this subsection's scope; neighbouring subsections are written separately, so do not ` +
        `summarise the whole chapter or preview what comes next.`,
      maxTokens: 8000,
    });

    finished += 1;
    await onProgress(
      10 + Math.round((finished / jobs.length) * 65),
      `chapter:${finished}:${jobs.length}`,
    );
    return { key: number, body: text };
  });

  const bodyByKey = new Map(bodies.map((b) => [b.key, b.body]));

  // 3. Conclusion
  await onProgress(80, "conclusion");
  const conclusion = await completeText({
    system,
    prompt:
      `${context}\n` +
      `Write the ${HEADINGS[docLang].conclusion} section, about ${conclusionWords} words.\n\n` +
      `Draw together what the paper established chapter by chapter, state the practical proposals that follow, ` +
      `and note which questions remain open. Introduce no new material.`,
    maxTokens: 6000,
  });

  // 4. References
  await onProgress(88, "references");
  const references = await generateReferences(outline.title, subject, docLang);

  return {
    topic: outline.title || spec.topic,
    subject,
    docLang,
    meta: spec.meta,
    intro,
    chapters: outline.chapters.map((chapter, ci) => ({
      title: chapter.title,
      sections: chapter.sections.map((section, si) => ({
        title: section.title,
        body: bodyByKey.get(`${ci + 1}.${si + 1}`) ?? "",
      })),
    })),
    conclusion,
    references,
  };
}

async function generateReferences(
  title: string,
  subject: string,
  docLang: DocLang,
): Promise<string[]> {
  const result = await completeJson<{ references: string[] }>({
    system:
      `You compile bibliographies for undergraduate papers in ${LANG_NAME[docLang]}.\n` +
      `List sources you are genuinely confident exist: legislation and government decrees, publications of ` +
      `statistical agencies and ministries, long-established textbooks, and well-known international ` +
      `organisations' reports. Prefer widely cited, verifiable works over obscure ones. ` +
      `Do not invent DOIs, issue numbers, or page ranges you are unsure of. ` +
      `Order: legal acts first, then books and textbooks, then articles, then web resources.`,
    prompt:
      `Paper title: "${title}"\nSubject: ${subject}\n\n` +
      `Give 15-20 bibliography entries formatted as a single line each, ready to paste into a numbered list ` +
      `(no leading numbers).`,
    schema: {
      type: "object",
      properties: { references: { type: "array", items: { type: "string" } } },
      required: ["references"],
      additionalProperties: false,
    },
    maxTokens: 4000,
    effort: "medium",
  });

  return (result.references ?? []).map((r) => r.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
}

// ── slide deck ───────────────────────────────────────────────────────────────

export async function generateDeck(
  spec: OrderSpec,
  onProgress: ProgressFn,
): Promise<WrittenDeck> {
  const docLang = spec.docLang;
  await onProgress(20, "slides");

  const outline = spec.outline;
  const planHint = outline
    ? `The presentation accompanies a paper with this plan:\n${formatOutline(outline, docLang, false)}\n`
    : "";

  const result = await completeJson<{ subject: string; slides: SlideContent[] }>({
    system:
      `You design student presentations in ${LANG_NAME[docLang]}.\n\n` +
      `Each slide picks the layout that fits its content. Deck-wide, vary them — a deck ` +
      `where every slide is "bullets" is a document with page breaks, not a presentation:\n\n` +
      `- "bullets"  — 3-5 points, each a complete thought of 8-16 words. The default, but not the only one.\n` +
      `- "cards"    — 2-4 short parallel items (types, principles, factors). Each ≤ 12 words.\n` +
      `- "stats"    — 1-3 headline figures. value is short ("32%", "1,8 mln"); label says what it measures.\n` +
      `- "compare"  — two opposed sets: advantages/disadvantages, before/after, two countries.\n` +
      `                labelLeft/labelRight name the columns; items = left, itemsRight = right.\n` +
      `- "process"  — 3-5 ordered steps or stages, each ≤ 10 words.\n` +
      `- "chart"    — real quantitative data. "bar" for any comparison; "pie" ONLY for parts of a\n` +
      `                whole with AT MOST 3 categories. chartValues are plain numbers, same length\n` +
      `                as chartCategories.\n` +
      `- "quote"    — one definition, legal provision or citation worth a slide. Put it in items[0].\n` +
      `- "section"  — a divider announcing the next part. Title only, no body.\n\n` +
      `Aim for roughly: half bullets, and the rest spread across the others. Use at least one ` +
      `"stats" or "chart" slide when the topic has any quantitative dimension, and a "section" ` +
      `divider before each major part of a deck longer than 10 slides.\n\n` +
      `Figures must be defensible. Use magnitudes you are genuinely confident about, and put the ` +
      `origin in "source" (e.g. the statistics agency, a ministry report, a named organisation). ` +
      `Never invent a precise number tied to a specific year you are unsure of — round, or choose a ` +
      `different layout. Leave "source" empty when a slide carries no figures.\n\n` +
      `Every slide: a title of at most 8 words, one idea, no repetition of another slide, and a ` +
      `"note" giving the presenter one sentence to say beyond what is on screen.\n\n` +
      `Fill every field of the object. Fields your layout does not use get "" or [].\n` +
      `Do not produce a title slide or a closing slide — the template adds those.`,
    prompt:
      `Topic: "${spec.topic}"\n${planHint}\n` +
      `Produce exactly ${spec.slides} slides, and name the academic subject this belongs to.`,
    schema: {
      type: "object",
      properties: {
        subject: { type: "string" },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              layout: {
                type: "string",
                enum: [
                  "bullets",
                  "cards",
                  "stats",
                  "compare",
                  "process",
                  "chart",
                  "quote",
                  "section",
                ],
              },
              title: { type: "string" },
              subtitle: { type: "string" },
              items: { type: "array", items: { type: "string" } },
              itemsRight: { type: "array", items: { type: "string" } },
              labelLeft: { type: "string" },
              labelRight: { type: "string" },
              stats: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    label: { type: "string" },
                  },
                  required: ["value", "label"],
                  additionalProperties: false,
                },
              },
              chartType: { type: "string", enum: ["bar", "pie", "none"] },
              chartCategories: { type: "array", items: { type: "string" } },
              chartValues: { type: "array", items: { type: "number" } },
              chartUnit: { type: "string" },
              source: { type: "string" },
              note: { type: "string" },
            },
            required: [
              "layout",
              "title",
              "subtitle",
              "items",
              "itemsRight",
              "labelLeft",
              "labelRight",
              "stats",
              "chartType",
              "chartCategories",
              "chartValues",
              "chartUnit",
              "source",
              "note",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["subject", "slides"],
      additionalProperties: false,
    },
    maxTokens: 16000,
  });

  await onProgress(85, "packaging");

  return {
    topic: outline?.title || spec.topic,
    subject: result.subject || spec.subject,
    docLang,
    author: spec.meta.student ?? "",
    slides: (result.slides ?? []).map(normaliseSlide).filter(hasContent),
  };
}

/** Fills any field the model left out so the renderer never sees undefined. */
function normaliseSlide(slide: Partial<SlideContent>): SlideContent {
  const chartValues = (slide.chartValues ?? []).filter((v) => typeof v === "number");
  const chartCategories = slide.chartCategories ?? [];
  return {
    layout: slide.layout ?? "bullets",
    title: (slide.title ?? "").trim(),
    subtitle: (slide.subtitle ?? "").trim(),
    items: (slide.items ?? []).filter(Boolean),
    itemsRight: (slide.itemsRight ?? []).filter(Boolean),
    labelLeft: (slide.labelLeft ?? "").trim(),
    labelRight: (slide.labelRight ?? "").trim(),
    stats: (slide.stats ?? []).filter((s) => s?.value),
    // A chart is only a chart when the two arrays line up.
    chartType:
      chartCategories.length > 0 && chartCategories.length === chartValues.length
        ? slide.chartType ?? "bar"
        : "none",
    chartCategories,
    chartValues,
    chartUnit: (slide.chartUnit ?? "").trim(),
    source: (slide.source ?? "").trim(),
    note: (slide.note ?? "").trim(),
  };
}

/** Drops slides that would render as an empty frame. */
function hasContent(slide: SlideContent): boolean {
  if (!slide.title) return false;
  if (slide.layout === "section") return true;
  return (
    slide.items.length > 0 ||
    slide.itemsRight.length > 0 ||
    slide.stats.length > 0 ||
    slide.chartType !== "none"
  );
}

import type { DocLang } from "./types";

export const LANG_NAME: Record<DocLang, string> = {
  uz: "Uzbek (Latin script)",
  ru: "Russian",
  en: "English",
};

/** Section headings used by the document builder, per language. */
export const HEADINGS: Record<
  DocLang,
  {
    contents: string;
    intro: string;
    conclusion: string;
    references: string;
    chapter: (n: number) => string;
    courseworkLabel: string;
    topicLabel: string;
    studentLabel: string;
    supervisorLabel: string;
    thanks: string;
    planLabel: string;
  }
> = {
  uz: {
    contents: "MUNDARIJA",
    intro: "KIRISH",
    conclusion: "XULOSA",
    references: "FOYDALANILGAN ADABIYOTLAR RO'YXATI",
    chapter: (n) => `${romanize(n)} BOB.`,
    courseworkLabel: "KURS ISHI",
    topicLabel: "Mavzu:",
    studentLabel: "Bajardi:",
    supervisorLabel: "Ilmiy rahbar:",
    thanks: "E'tiboringiz uchun rahmat!",
    planLabel: "Reja",
  },
  ru: {
    contents: "СОДЕРЖАНИЕ",
    intro: "ВВЕДЕНИЕ",
    conclusion: "ЗАКЛЮЧЕНИЕ",
    references: "СПИСОК ИСПОЛЬЗОВАННОЙ ЛИТЕРАТУРЫ",
    chapter: (n) => `ГЛАВА ${romanize(n)}.`,
    courseworkLabel: "КУРСОВАЯ РАБОТА",
    topicLabel: "Тема:",
    studentLabel: "Выполнил(а):",
    supervisorLabel: "Научный руководитель:",
    thanks: "Спасибо за внимание!",
    planLabel: "План",
  },
  en: {
    contents: "TABLE OF CONTENTS",
    intro: "INTRODUCTION",
    conclusion: "CONCLUSION",
    references: "REFERENCES",
    chapter: (n) => `CHAPTER ${romanize(n)}.`,
    courseworkLabel: "COURSE PAPER",
    topicLabel: "Topic:",
    studentLabel: "Prepared by:",
    supervisorLabel: "Supervisor:",
    thanks: "Thank you for your attention!",
    planLabel: "Outline",
  },
};

export function romanize(n: number): string {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, symbol] of map) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out || "I";
}

export function outlineSystem(docLang: DocLang): string {
  return [
    `You are an experienced university supervisor who plans undergraduate course papers ("kurs ishi").`,
    `You write entirely in ${LANG_NAME[docLang]}.`,
    ``,
    `A well-formed plan has:`,
    `- a refined academic title derived from the student's rough topic;`,
    `- 3 chapters, each with 3 subsections, moving from theory to analysis to practical proposals;`,
    `- subsection titles that are specific claims or areas, not generic filler like "General information";`,
    `- 3-5 concrete talking points per subsection so a writer knows exactly what belongs there.`,
    ``,
    `Chapter and subsection titles carry no numbering — numbering is added by the document template.`,
  ].join("\n");
}

export function outlinePrompt(topic: string, docLang: DocLang): string {
  return [
    `Student's topic: "${topic}"`,
    ``,
    `Produce the plan for a course paper on this topic in ${LANG_NAME[docLang]}.`,
    `Also name the academic subject (fan / предмет) this topic belongs to, and write a two-sentence`,
    `summary of what the paper will argue.`,
  ].join("\n");
}

export const OUTLINE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Refined academic title of the paper" },
    subject: { type: "string", description: "Academic subject, e.g. Iqtisodiyot nazariyasi" },
    summary: { type: "string", description: "Two sentences on what the paper argues" },
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                points: { type: "array", items: { type: "string" } },
              },
              required: ["title", "points"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "sections"],
        additionalProperties: false,
      },
    },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["title", "subject", "summary", "chapters", "keywords"],
  additionalProperties: false,
} as const;

export function writerSystem(docLang: DocLang, subject: string): string {
  return [
    `You write undergraduate course papers ("kurs ishi") in ${LANG_NAME[docLang]}.`,
    `Subject area: ${subject}.`,
    ``,
    `House style:`,
    `- Academic register, third person, no first-person "I" and no address to the reader.`,
    `- Flowing paragraphs of 4-7 sentences. Prose, not bullet lists, unless a short enumeration genuinely helps.`,
    `- Definitions, classifications, causes and consequences, and concrete examples where they earn their place.`,
    `- Where figures would normally appear, give plausible orders of magnitude and name the kind of source they come`,
    `  from (state statistics agency, ministry report) rather than inventing precise numbers attributed to a specific year.`,
    `- Uzbek context is welcome when the topic allows it.`,
    ``,
    `Output rules:`,
    `- Plain text only. No markdown headings, no "##", no numbering of the section you are given.`,
    `- Do not restate the section title as the first line.`,
    `- Do not write meta-commentary about the writing process.`,
    `- Separate paragraphs with a blank line.`,
  ].join("\n");
}

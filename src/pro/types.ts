// Types for the Claude-powered "Pro" services.
// Ported from the standalone kurs-ishi bot; DB-row and UI-language types dropped.

/** Language the academic document itself is written in. */
export type DocLang = "uz" | "ru" | "en";

export type OrderType = "coursework" | "slides";

export interface OutlineSection {
  title: string;
  points: string[];
}

export interface OutlineChapter {
  title: string;
  sections: OutlineSection[];
}

/** Result of the free "reja" (plan) preview. */
export interface Outline {
  title: string;
  subject: string;
  summary: string;
  chapters: OutlineChapter[];
  keywords: string[];
}

/** Optional data the student can supply for the title page. */
export interface TitlePageMeta {
  university?: string;
  faculty?: string;
  department?: string;
  direction?: string;
  group?: string;
  student?: string;
  supervisor?: string;
  city?: string;
  year?: string;
}

/** Everything needed to render a document, stored as JSON on the order row. */
export interface OrderSpec {
  type: OrderType;
  topic: string;
  subject: string;
  pages: number;
  slides: number; // 0 = no slides
  docLang: DocLang;
  outline: Outline | null;
  meta: TitlePageMeta;
}
/** Written sections, produced by the generator and consumed by the doc builders. */
export interface WrittenChapter {
  title: string;
  sections: { title: string; body: string }[];
}

export interface WrittenCoursework {
  topic: string;
  subject: string;
  docLang: DocLang;
  meta: TitlePageMeta;
  intro: string;
  chapters: WrittenChapter[];
  conclusion: string;
  references: string[];
}

export type SlideLayout =
  | "bullets" // numbered list — the workhorse
  | "cards" // 2-4 short parallel items
  | "stats" // 1-3 headline figures
  | "compare" // two opposed columns
  | "process" // 3-5 ordered steps
  | "chart" // bar or doughnut with data
  | "quote" // a definition or citation worth its own slide
  | "section"; // divider before a new part

export interface SlideStat {
  value: string;
  label: string;
}

/**
 * One slide. The shape is flat rather than a discriminated union because
 * structured outputs require every property to be present — unused fields come
 * back as empty strings/arrays and the renderer ignores them.
 */
export interface SlideContent {
  layout: SlideLayout;
  title: string;
  subtitle: string;
  items: string[];
  itemsRight: string[];
  labelLeft: string;
  labelRight: string;
  stats: SlideStat[];
  chartType: "bar" | "pie" | "none";
  chartCategories: string[];
  chartValues: number[];
  chartUnit: string;
  /** Where the figures come from — shown under charts and stat rows. */
  source: string;
  note: string;
}

export interface WrittenDeck {
  topic: string;
  subject: string;
  docLang: DocLang;
  author: string;
  slides: SlideContent[];
}

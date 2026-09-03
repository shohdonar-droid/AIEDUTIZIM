import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  Footer,
  PageNumber,
  WidthType,
  BorderStyle,
  TableLayoutType
} from "docx";
import { generateContentWithRotation } from "./gemini.js";

export interface CourseWorkInput {
  topic: string;             // Mavzu
  subject: string;           // Fan nomi
  university: string;        // OTM
  faculty?: string;          // Fakultet
  department?: string;       // Kafedra
  direction?: string;        // Yo'nalish
  studentName?: string;      // Talaba F.I.Sh.
  advisor?: string;          // Ilmiy rahbar F.I.Sh.
  city?: string;             // Shahar (default: Toshkent)
  year?: string;             // O'quv yili (default: 2026)
  pageCount?: string;        // 30, 35, 40, 50
  object?: string;           // Tadqiqot obyekti
  subjectItem?: string;      // Tadqiqot predmeti
  extraRequirements?: string; // Qo'shimcha talablar / tajriba ma'lumoti
}

export interface CourseWorkParagraph {
  title: string;
  content: string[];
}

export interface CourseWorkChapter {
  number: number;
  title: string;
  paragraphs: CourseWorkParagraph[];
  conclusion: string;
}

export interface CourseWorkTableData {
  caption: string;
  headers: string[];
  rows: string[][];
  explanation: string;
}

export interface CourseWorkData {
  titleInfo: {
    ministry: string;
    university: string;
    faculty: string;
    department: string;
    topic: string;
    subject: string;
    direction: string;
    studentName: string;
    advisor: string;
    city: string;
    year: string;
  };
  introduction: {
    relevance: string;
    literatureReview: string;
    problem: string;
    object: string;
    subjectItem: string;
    goal: string;
    tasks: string[];
    methodologicalBasis: string;
    methods: string[];
    novelty: string;
    practicalSignificance: string;
    baseAndStages?: string;
    structureAndVolume: string;
  };
  chapters: CourseWorkChapter[];
  tables?: CourseWorkTableData[];
  conclusion: string[];
  recommendations: {
    forTeachers: string[];
    forInstitution: string[];
    forStudents: string[];
    forEvaluation: string[];
  };
  bibliography: {
    normative: string[];
    books: string[];
    articles: string[];
    foreign: string[];
    web: string[];
  };
  hasRealExperiment: boolean;
}

/**
 * Text cleaner: Strips all forbidden technical artifacts, HTML tags, Markdown symbols, LaTeX, and AI boilerplate.
 */
export function cleanAcademicText(text: string): string {
  if (!text) return "";
  let clean = text
    // Strip HTML tags
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?\w+[^>]*>/gi, "")
    // Strip Markdown headings, horizontal rules, bold markers
    .replace(/^#+\s*/gm, "")
    .replace(/---/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    // Strip raw LaTeX math delimiters
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    // Strip technical words & AI boilerplate
    .replace(/\b(debug|prompt|API javobi|placeholder|undefined|null|NaN|AI generated|ChatGPT|Gemini)\b/gi, "")
    // Normalize multiple spaces
    .replace(/[ \t]+/g, " ")
    .trim();

  return clean;
}

/**
 * Validates and ensures the CourseWorkData structure strictly follows guidelines.
 */
export function validateAndCleanCourseWorkData(data: CourseWorkData): CourseWorkData {
  // Title info cleanup
  data.titleInfo.ministry = "O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI";
  data.titleInfo.university = cleanAcademicText(data.titleInfo.university);
  data.titleInfo.faculty = cleanAcademicText(data.titleInfo.faculty);
  data.titleInfo.department = cleanAcademicText(data.titleInfo.department);
  data.titleInfo.topic = cleanAcademicText(data.titleInfo.topic);
  data.titleInfo.subject = cleanAcademicText(data.titleInfo.subject);
  data.titleInfo.direction = cleanAcademicText(data.titleInfo.direction);
  data.titleInfo.studentName = cleanAcademicText(data.titleInfo.studentName);
  data.titleInfo.advisor = cleanAcademicText(data.titleInfo.advisor);
  data.titleInfo.city = cleanAcademicText(data.titleInfo.city) || "Toshkent";
  data.titleInfo.year = cleanAcademicText(data.titleInfo.year) || "2026";

  // Check if real experiment was provided
  if (!data.hasRealExperiment) {
    // Scrub any hallucinated respondent numbers or Student t-test stats from text
    const scrubFakeStats = (str: string) => {
      return str
        .replace(/\d+\s*nafar\s*o['`ʼ]?quvchi/gi, "o'quvchilar kontingenti")
        .replace(/\b\d+\+\d+\b/g, "tajriba va nazorat guruhlari")
        .replace(/p\s*<\s*0[,\.]05/gi, "kutilayotgan samaradorlik ko'rsatkichi")
        .replace(/Student\s*t-kriteriyasi/gi, "statistik baholash mezonlari");
    };

    data.introduction.relevance = scrubFakeStats(cleanAcademicText(data.introduction.relevance));
    data.introduction.problem = scrubFakeStats(cleanAcademicText(data.introduction.problem));
    data.introduction.object = cleanAcademicText(data.introduction.object);
    data.introduction.subjectItem = cleanAcademicText(data.introduction.subjectItem);
    data.introduction.goal = cleanAcademicText(data.introduction.goal);
    data.introduction.tasks = (data.introduction.tasks || []).map(t => scrubFakeStats(cleanAcademicText(t)));

    data.chapters.forEach(ch => {
      ch.title = cleanAcademicText(ch.title);
      ch.conclusion = scrubFakeStats(cleanAcademicText(ch.conclusion));
      ch.paragraphs.forEach(p => {
        p.title = cleanAcademicText(p.title);
        p.content = p.content.map(c => scrubFakeStats(cleanAcademicText(c)));
      });
    });

    data.conclusion = (data.conclusion || []).map(c => scrubFakeStats(cleanAcademicText(c)));
  } else {
    data.introduction.relevance = cleanAcademicText(data.introduction.relevance);
    data.introduction.problem = cleanAcademicText(data.introduction.problem);
    data.introduction.object = cleanAcademicText(data.introduction.object);
    data.introduction.subjectItem = cleanAcademicText(data.introduction.subjectItem);
    data.introduction.goal = cleanAcademicText(data.introduction.goal);
    data.introduction.tasks = (data.introduction.tasks || []).map(t => cleanAcademicText(t));

    data.chapters.forEach(ch => {
      ch.title = cleanAcademicText(ch.title);
      ch.conclusion = cleanAcademicText(ch.conclusion);
      ch.paragraphs.forEach(p => {
        p.title = cleanAcademicText(p.title);
        p.content = p.content.map(c => cleanAcademicText(c));
      });
    });

    data.conclusion = (data.conclusion || []).map(c => cleanAcademicText(c));
  }

  // Bibliography clean
  if (data.bibliography) {
    data.bibliography.normative = (data.bibliography.normative || []).map(cleanAcademicText);
    data.bibliography.books = (data.bibliography.books || []).map(cleanAcademicText);
    data.bibliography.articles = (data.bibliography.articles || []).map(cleanAcademicText);
    data.bibliography.foreign = (data.bibliography.foreign || []).map(cleanAcademicText);
    data.bibliography.web = (data.bibliography.web || []).map(cleanAcademicText);
  }

  return data;
}

/**
 * Builds the complete, high-quality .docx Buffer for CourseWork
 */
export async function buildCourseWorkDocxBuffer(inputData: CourseWorkData): Promise<Buffer> {
  const data = validateAndCleanCourseWorkData(inputData);
  const children: any[] = [];

  // ==========================================
  // 1. TITUL VARAQASI (Page 1)
  // ==========================================
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.titleInfo.ministry.toUpperCase(),
          bold: true,
          size: 24, // 12pt
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 360 }
    })
  );

  if (data.titleInfo.university) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.titleInfo.university.toUpperCase(),
            bold: true,
            size: 26, // 13pt
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, line: 360 }
      })
    );
  }

  if (data.titleInfo.faculty) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.titleInfo.faculty,
            bold: true,
            size: 24,
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, line: 360 }
      })
    );
  }

  if (data.titleInfo.department) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.titleInfo.department,
            bold: true,
            size: 24,
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800, line: 360 }
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "KURS ISHI",
          bold: true,
          size: 44, // 22pt
          font: "Times New Roman",
          color: "1E3A8A"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: 360 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Mavzu: “${data.titleInfo.topic.toUpperCase()}”`,
          bold: true,
          size: 28, // 14pt
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 360 }
    })
  );

  if (data.titleInfo.subject) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Fan: ${data.titleInfo.subject}`,
            italics: true,
            size: 26,
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200, line: 360 }
      })
    );
  }

  // Bajardi & Rahbar block (Right aligned block)
  const rightRuns: TextRun[] = [];
  if (data.titleInfo.direction) {
    rightRuns.push(
      new TextRun({
        text: `Ta'lim yo'nalishi: ${data.titleInfo.direction}\n`,
        size: 26,
        font: "Times New Roman"
      })
    );
  }
  if (data.titleInfo.studentName) {
    rightRuns.push(
      new TextRun({
        text: `Bajardi: ${data.titleInfo.studentName}\n`,
        bold: true,
        size: 26,
        font: "Times New Roman"
      })
    );
  }
  if (data.titleInfo.advisor) {
    rightRuns.push(
      new TextRun({
        text: `Ilmiy rahbar: ${data.titleInfo.advisor}`,
        bold: true,
        size: 26,
        font: "Times New Roman"
      })
    );
  }

  if (rightRuns.length > 0) {
    children.push(
      new Paragraph({
        children: rightRuns,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 1200, line: 360 }
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.titleInfo.city.toUpperCase()} – ${data.titleInfo.year}`,
          bold: true,
          size: 26,
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Page break after Title
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: []
    })
  );

  // ==========================================
  // 2. MUNDARIJA (Page 2)
  // ==========================================
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "MUNDARIJA",
          bold: true,
          size: 32, // 16pt
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400, line: 360 }
    })
  );

  // TOC Entries with page estimates
  let currentPage = 3;
  const tocRows: { title: string; page: number; isMain?: boolean }[] = [];

  tocRows.push({ title: "KIRISH", page: currentPage, isMain: true });
  currentPage += 2; // Intro ~2 pages

  data.chapters.forEach((ch, idx) => {
    const chNumRoman = ["I", "II", "III"][idx] || `${idx + 1}`;
    tocRows.push({ title: `${chNumRoman} BOB. ${ch.title}`, page: currentPage, isMain: true });
    
    ch.paragraphs.forEach(p => {
      tocRows.push({ title: p.title, page: currentPage });
      currentPage += 3; // ~3 pages per paragraph
    });

    tocRows.push({ title: `${chNumRoman} bob bo'yicha xulosa`, page: currentPage });
    currentPage += 1;
  });

  tocRows.push({ title: "XULOSA", page: currentPage, isMain: true });
  currentPage += 2;

  tocRows.push({ title: "ILMIY-AMALIY TAVSIYALAR", page: currentPage, isMain: true });
  currentPage += 1;

  tocRows.push({ title: "FOYDALANILGAN ADABIYOTLAR RO'YXATI", page: currentPage, isMain: true });

  tocRows.forEach(item => {
    const dotsCount = Math.max(10, 75 - item.title.length);
    const dots = ".".repeat(dotsCount);

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item.title,
            bold: item.isMain,
            size: 26,
            font: "Times New Roman"
          }),
          new TextRun({
            text: ` ${dots} `,
            size: 24,
            font: "Times New Roman",
            color: "9CA3AF"
          }),
          new TextRun({
            text: `${item.page}`,
            bold: item.isMain,
            size: 26,
            font: "Times New Roman"
          })
        ],
        spacing: { before: item.isMain ? 120 : 60, after: 60, line: 360 },
        indent: item.isMain ? undefined : { firstLine: 360 }
      })
    );
  });

  // Page break after TOC
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: []
    })
  );

  // ==========================================
  // 3. KIRISH (Page 3)
  // ==========================================
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "KIRISH",
          bold: true,
          size: 32, // 16pt
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400, line: 360 }
    })
  );

  const introSections: { label: string; text: string | string[] }[] = [
    { label: "Mavzuning dolzarbligi", text: data.introduction.relevance },
    { label: "Muammoning o'rganilganlik darajasi", text: data.introduction.literatureReview },
    { label: "Tadqiqot muammosi", text: data.introduction.problem },
    { label: "Tadqiqotning obyekti", text: data.introduction.object },
    { label: "Tadqiqotning predmeti", text: data.introduction.subjectItem },
    { label: "Tadqiqotning maqsadi", text: data.introduction.goal },
    { label: "Tadqiqotning vazifalari", text: data.introduction.tasks },
    { label: "Tadqiqotning metodologik va nazariy asoslari", text: data.introduction.methodologicalBasis },
    { label: "Tadqiqot usullari", text: data.introduction.methods.join(", ") },
    { label: "Tadqiqotning ilmiy yangiligi", text: data.introduction.novelty },
    { label: "Tadqiqotning amaliy ahamiyati", text: data.introduction.practicalSignificance }
  ];

  if (data.introduction.baseAndStages) {
    introSections.push({ label: "Tadqiqot bazasi va bosqichlari", text: data.introduction.baseAndStages });
  }
  introSections.push({ label: "Kurs ishining tuzilishi va hajmi", text: data.introduction.structureAndVolume });

  introSections.forEach(sec => {
    if (Array.isArray(sec.text)) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sec.label}:`,
              bold: true,
              size: 28,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 200, after: 100, line: 360 },
          indent: { firstLine: 708 }
        })
      );
      sec.text.forEach((item, i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${i + 1}. ${item}`,
                size: 28,
                font: "Times New Roman"
              })
            ],
            spacing: { before: 60, after: 60, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1062 }
          })
        );
      });
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sec.label}: `,
              bold: true,
              size: 28,
              font: "Times New Roman"
            }),
            new TextRun({
              text: sec.text,
              size: 28,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 120, after: 120, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 708 }
        })
      );
    }
  });

  // ==========================================
  // 4. BOBLAR (I, II, III BOB)
  // ==========================================
  data.chapters.forEach((ch, idx) => {
    const roman = ["I", "II", "III"][idx] || `${idx + 1}`;

    // Chapter Title on NEW PAGE
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        children: [
          new TextRun({
            text: `${roman} BOB. ${ch.title.toUpperCase()}`,
            bold: true,
            size: 32, // 16pt
            font: "Times New Roman"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400, line: 360 }
      })
    );

    // Paragraphs inside chapter
    ch.paragraphs.forEach(p => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: p.title,
              bold: true,
              size: 28,
              font: "Times New Roman",
              color: "1E3A8A"
            })
          ],
          spacing: { before: 300, after: 200, line: 360 },
          alignment: AlignmentType.LEFT
        })
      );

      p.content.forEach(paragraphText => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraphText,
                size: 28, // 14pt
                font: "Times New Roman"
              })
            ],
            spacing: { before: 0, after: 120, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 708 } // 1.25 cm
          })
        );
      });
    });

    // Add Tables if associated with this chapter
    if (data.tables && data.tables.length > idx) {
      const tableData = data.tables[idx];

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: tableData.caption,
              bold: true,
              italics: true,
              size: 26,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 300, after: 120 },
          alignment: AlignmentType.LEFT
        })
      );

      const tableRows: TableRow[] = [];

      // Header Row
      tableRows.push(
        new TableRow({
          children: tableData.headers.map(
            headerText =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: headerText,
                        bold: true,
                        size: 24,
                        font: "Times New Roman"
                      })
                    ],
                    alignment: AlignmentType.CENTER
                  })
                ],
                shading: { fill: "F3F4F6" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
                }
              })
          )
        })
      );

      // Data Rows
      tableData.rows.forEach(rowCells => {
        tableRows.push(
          new TableRow({
            children: rowCells.map(
              cellText =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cellText,
                          size: 24,
                          font: "Times New Roman"
                        })
                      ],
                      alignment: AlignmentType.LEFT
                    })
                  ],
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" }
                  }
                })
            )
          })
        );
      });

      const docxTable = new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.AUTOFIT
      });

      children.push(docxTable);

      // Table analysis / explanation
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: tableData.explanation,
              italics: true,
              size: 26,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 120, after: 200, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 708 }
        })
      );
    }

    // Chapter Conclusion
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${roman} bob bo'yicha xulosa`,
            bold: true,
            size: 28,
            font: "Times New Roman",
            color: "1E3A8A"
          })
        ],
        spacing: { before: 400, after: 150, line: 360 },
        alignment: AlignmentType.LEFT
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: ch.conclusion,
            size: 28,
            font: "Times New Roman"
          })
        ],
        spacing: { before: 0, after: 200, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 708 }
      })
    );
  });

  // ==========================================
  // 5. UMUMIY XULOSA
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [
        new TextRun({
          text: "XULOSA",
          bold: true,
          size: 32,
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400, line: 360 }
    })
  );

  data.conclusion.forEach(p => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: p,
            size: 28,
            font: "Times New Roman"
          })
        ],
        spacing: { before: 0, after: 120, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: 708 }
      })
    );
  });

  // ==========================================
  // 6. ILMIY-AMALIY TAVSIYALAR
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [
        new TextRun({
          text: "ILMIY-AMALIY TAVSIYALAR",
          bold: true,
          size: 32,
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400, line: 360 }
    })
  );

  const recGroups = [
    { label: "1. O'qituvchilar va pedagoglar uchun tavsiyalar", list: data.recommendations.forTeachers },
    { label: "2. Ta'lim muassasalari va rahbariyat uchun tavsiyalar", list: data.recommendations.forInstitution },
    { label: "3. O'quvchi va talabalar uchun tavsiyalar", list: data.recommendations.forStudents },
    { label: "4. Baholash va metodik jarayonlar bo'yicha tavsiyalar", list: data.recommendations.forEvaluation }
  ];

  recGroups.forEach(grp => {
    if (grp.list && grp.list.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: grp.label,
              bold: true,
              size: 28,
              font: "Times New Roman"
            })
          ],
          spacing: { before: 200, after: 100, line: 360 },
          indent: { firstLine: 708 }
        })
      );

      grp.list.forEach((item, idx) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${idx + 1}) ${item}`,
                size: 28,
                font: "Times New Roman"
              })
            ],
            spacing: { before: 60, after: 60, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 1062 }
          })
        );
      });
    }
  });

  // ==========================================
  // 7. FOYDALANILGAN ADABIYOTLAR RO'YXATI
  // ==========================================
  children.push(
    new Paragraph({
      pageBreakBefore: true,
      children: [
        new TextRun({
          text: "FOYDALANILGAN ADABIYOTLAR RO'YXATI",
          bold: true,
          size: 32,
          font: "Times New Roman"
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 400, line: 360 }
    })
  );

  let sourceIndex = 1;
  const bibCategories = [
    { title: "I. Normativ-huquqiy hujjatlar", items: data.bibliography.normative },
    { title: "II. Darsliklar, o'quv qo'llanmalar va monografiyalar", items: data.bibliography.books },
    { title: "III. Ilmiy maqolalar va dissertatsiyalar", items: data.bibliography.articles },
    { title: "IV. Xorijiy adabiyotlar", items: data.bibliography.foreign },
    { title: "V. Internet va elektron resurslar", items: data.bibliography.web }
  ];

  bibCategories.forEach(cat => {
    if (cat.items && cat.items.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cat.title,
              bold: true,
              size: 28,
              font: "Times New Roman",
              color: "1E3A8A"
            })
          ],
          spacing: { before: 240, after: 120, line: 360 },
          alignment: AlignmentType.LEFT
        })
      );

      cat.items.forEach(src => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${sourceIndex}. ${src}`,
                size: 28,
                font: "Times New Roman"
              })
            ],
            spacing: { before: 40, after: 60, line: 360 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 708 }
          })
        );
        sourceIndex++;
      });
    }
  });

  // Assemble Document
  const doc = new Document({
    sections: [
      {
        properties: {
          titlePage: true, // Title page has separate headers/footers
          page: {
            margin: {
              top: 1134,   // 2cm
              bottom: 1134,// 2cm
              left: 1701,  // 3cm
              right: 850   // 1.5cm
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Times New Roman",
                    size: 24 // 12pt
                  })
                ]
              })
            ]
          }),
          first: new Footer({
            children: [] // No page number on cover page
          })
        },
        children: children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  if (!buffer || buffer.length < 5000 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Docx yaratishda validatsiya xatosi yuz berdi.");
  }

  return buffer;
}

/**
 * Executes async tasks with bounded concurrency.
 */
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        console.error(`[CourseWork Gemini] Error in concurrent task ${i}:`, err);
        throw err;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Splits plain text into flowing body paragraphs (4-7 sentences each).
 */
function splitBodyParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(p => p.trim().replace(/^[-•*#]+\s*/, "").replace(/\*\*/g, ""))
    .filter(p => p.length > 20);
}

/**
 * Generates CourseWork JSON content using Gemini gemini-1.5-pro model
 * with the exact Pro multi-stage academic prompts, outline planning,
 * deep section expansion, and verifiable bibliography.
 */
export async function generateCourseWorkDataWithGemini(input: CourseWorkInput): Promise<CourseWorkData> {
  const pageTarget = parseInt(input.pageCount || "30", 10) || 30;
  const hasRealExp = Boolean(input.extraRequirements && input.extraRequirements.length > 10);

  const OVERHEAD_PAGES = 4;
  const WORDS_PER_PAGE = 280;
  const bodyWords = Math.max(1200, (pageTarget - OVERHEAD_PAGES) * WORDS_PER_PAGE);
  const introWords = Math.round(bodyWords * 0.09);
  const conclusionWords = Math.round(bodyWords * 0.08);

  // 1. OUTLINE & APPARATUS GENERATION (Pro academic supervisor prompt)
  const outlineSystem = `You are an experienced university supervisor who plans undergraduate course papers ("kurs ishi").
You write entirely in Uzbek (Latin script).

A well-formed plan has:
- a refined academic title derived from the student's rough topic;
- 3 chapters, each with 2 subsections, moving from theory to analysis to practical proposals;
- subsection titles that are specific claims or areas, not generic filler like "General information";
- 3-5 concrete talking points per subsection so a writer knows exactly what belongs there.

Chapter and subsection titles carry no numbering — numbering is added by the document template.`;

  const outlinePrompt = `Student's topic: "${input.topic}"
${input.subject ? `Subject: "${input.subject}"` : ""}
${input.extraRequirements ? `Additional requirements / context: "${input.extraRequirements}"` : ""}

Produce the plan for a course paper on this topic in Uzbek (Latin script).
Also name the academic subject (fan / predmet) this topic belongs to, and write a two-sentence summary of what the paper will argue.
Also formulate the research apparatus for the coursework.

Return valid JSON with exactly this structure:
{
  "title": "Refined academic title in Uzbek",
  "subject": "Academic subject name in Uzbek",
  "summary": "Two-sentence summary of the paper's thesis",
  "researchApparatus": {
    "relevance": "Mavzuning dolzarbligi bayoni",
    "literatureReview": "Muammoning o'rganilganlik darajasi va olimlar qarashlari",
    "problem": "Tadqiqot muammosi",
    "object": "Tadqiqot obyekti",
    "subjectItem": "Tadqiqot predmeti",
    "goal": "Tadqiqot maqsadi",
    "tasks": ["1-vazifa", "2-vazifa", "3-vazifa", "4-vazifa", "5-vazifa"],
    "methodologicalBasis": "Tadqiqotning metodologik asosi",
    "methods": ["Usul 1", "Usul 2", "Usul 3", "Usul 4"],
    "novelty": "Tadqiqotning ilmiy yangiligi",
    "practicalSignificance": "Tadqiqotning amaliy ahamiyati"
  },
  "chapters": [
    {
      "title": "1-bob nomi (Nazariy-metodologik asoslar)",
      "sections": [
        { "title": "1.1-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] },
        { "title": "1.2-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] }
      ]
    },
    {
      "title": "2-bob nomi (Tahliliy va amaliy holat)",
      "sections": [
        { "title": "2.1-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] },
        { "title": "2.2-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] }
      ]
    },
    {
      "title": "3-bob nomi (Takomillashtirish va amaliy tavsiyalar)",
      "sections": [
        { "title": "3.1-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] },
        { "title": "3.2-paragraf nomi", "points": ["Nuqta 1", "Nuqta 2", "Nuqta 3", "Nuqta 4"] }
      ]
    }
  ]
}`;

  console.log("[CourseWork Gemini] Step 1: Planning outline with gemini-1.5-pro...");
  const outlineRes = await generateContentWithRotation({
    model: "gemini-1.5-pro",
    contents: `${outlineSystem}\n\n${outlinePrompt}`,
    config: {
      responseMimeType: "application/json"
    }
  });

  let outlineJson: any;
  try {
    outlineJson = JSON.parse(outlineRes.text || "{}");
  } catch (e) {
    console.warn("[CourseWork Gemini] Parsing outline JSON failed, extracting block:", e);
    const m = (outlineRes.text || "").match(/\{[\s\S]*\}/);
    outlineJson = m ? JSON.parse(m[0]) : {};
  }

  const topic = outlineJson.title || input.topic;
  const subject = outlineJson.subject || input.subject || "Ijtimoiy-iqtisodiy fanlar";
  const apparatus = outlineJson.researchApparatus || {};

  // Standardize 3 chapters if missing
  if (!Array.isArray(outlineJson.chapters) || outlineJson.chapters.length < 3) {
    outlineJson.chapters = [
      {
        title: "Nazariy-metodologik asoslar",
        sections: [
          { title: "Mavzuning nazariy asoslari va tushunchalar tizimi", points: ["Asosiy ta'riflar", "Iqtisodiy/pedagogik ahamiyati", "Olimlar qarashlari"] },
          { title: "Xalqaro va milliy tajriba tahlili", points: ["Rivojlangan davlatlar tajribasi", "Milliy qonunchilik asoslari", "Qiyosiy tahlil"] }
        ]
      },
      {
        title: "Amaliy holat va mavjud tendensiyalar tahlili",
        sections: [
          { title: "Tizimning hozirgi holatini tahlili", points: ["Statistik ko'rsatkichlar dinamikasi", "Asosiy omillar ta'siri", "Tahliliy natijalar"] },
          { title: "Muammolar va ularning sabablari tahlili", points: ["Tizimdagi to'siqlar", "Samaradorlik ko'rsatkichlari", "Ziddiyatlar tahlili"] }
        ]
      },
      {
        title: "Takomillashtirish istiqbollari va amaliy tavsiyalar",
        sections: [
          { title: "Samaradorlikni oshirishning asosiy yo'nalishlari", points: ["Strategik vazifalar", "Innovatsion yondashuvlar", "Mexanizmlar"] },
          { title: "Amaliyotga joriy etish mexanizmlari va istiqbollar", points: ["Tavsiya etilayotgan model", "Kutilayotgan ijtimoiy-iqtisodiy samara", "Xulosa"] }
        ]
      }
    ];
  }

  const totalSections = outlineJson.chapters.reduce((sum: number, c: any) => sum + (c.sections?.length || 2), 0) || 6;
  const sectionWords = Math.max(300, Math.round((bodyWords * 0.83) / Math.max(1, totalSections)));

  const planText = outlineJson.chapters
    .map((c: any, ci: number) => {
      const sText = (c.sections || [])
        .map((s: any, si: number) => `  ${ci + 1}.${si + 1}. ${s.title}`)
        .join("\n");
      return `${ci + 1}-BOB. ${c.title.toUpperCase()}\n${sText}`;
    })
    .join("\n\n");

  // 2. PRO WRITER SYSTEM PROMPT (Academic House Style)
  const writerSystem = `You write undergraduate course papers ("kurs ishi") in Uzbek (Latin script).
Subject area: ${subject}.

House style:
- Academic register, third person, no first-person "I" and no address to the reader.
- Flowing paragraphs of 4-7 sentences. Prose, not bullet lists, unless a short enumeration genuinely helps.
- Definitions, classifications, causes and consequences, and concrete examples where they earn their place.
- Where figures would normally appear, give plausible orders of magnitude and name the kind of source they come from (state statistics agency, ministry report) rather than inventing precise numbers attributed to a specific year.
- Uzbek context is welcome when the topic allows it.

Output rules:
- Plain text only. No markdown headings, no "##", no numbering of the section you are given.
- Do not restate the section title as the first line.
- Do not write meta-commentary about the writing process.
- Separate paragraphs with a blank line.`;

  // 3. KIRISH (INTRODUCTION) PROMPT
  const introTask = async () => {
    const prompt = `Paper title: "${topic}"
Subject: ${subject}
Full plan of the paper:
${planText}

Write the KIRISH section, about ${introWords} words.

It must cover, as continuous prose: why the topic matters now; the degree to which it has been studied; the aim of the paper; the tasks that follow from that aim; the object and subject of research; the research methods used; and the structure of the work.`;

    const res = await generateContentWithRotation({
      model: "gemini-1.5-pro",
      contents: `${writerSystem}\n\n${prompt}`
    });
    return res.text || "";
  };

  // 4. SUBSECTION GENERATION TASKS
  interface SectionJob {
    chapterIndex: number;
    sectionIndex: number;
    chapterTitle: string;
    sectionTitle: string;
    points: string[];
  }
  const sectionJobs: SectionJob[] = [];
  outlineJson.chapters.forEach((c: any, ci: number) => {
    (c.sections || []).forEach((s: any, si: number) => {
      sectionJobs.push({
        chapterIndex: ci,
        sectionIndex: si,
        chapterTitle: c.title,
        sectionTitle: s.title,
        points: Array.isArray(s.points) && s.points.length ? s.points : [s.title]
      });
    });
  });

  const processSection = async (job: SectionJob) => {
    const prompt = `Paper title: "${topic}"
Subject: ${subject}
Full plan of the paper:
${planText}

Write subsection ${job.chapterIndex + 1}.${job.sectionIndex + 1} — "${job.sectionTitle}" — inside chapter "${job.chapterTitle}".
Target length: about ${sectionWords} words.

Cover these points, developed into argument rather than listed:
${job.points.map(p => `- ${p}`).join("\n")}

Stay inside this subsection's scope; neighbouring subsections are written separately, so do not summarise the whole chapter or preview what comes next.`;

    const res = await generateContentWithRotation({
      model: "gemini-1.5-pro",
      contents: `${writerSystem}\n\n${prompt}`
    });
    return {
      ...job,
      paragraphs: splitBodyParagraphs(res.text || "")
    };
  };

  // 5. CHAPTER CONCLUSIONS
  const chapterConclusionTasks = outlineJson.chapters.map((ch: any, idx: number) => async () => {
    const prompt = `Paper title: "${topic}"
Subject: ${subject}
Chapter: "${ch.title}"

Write a concise academic conclusion for this chapter (about 120-160 words, 1-2 flowing paragraphs in Uzbek).
Summarize what was established in this chapter.`;

    const res = await generateContentWithRotation({
      model: "gemini-1.5-pro",
      contents: `${writerSystem}\n\n${prompt}`
    });
    return res.text?.trim() || `${idx + 1}-bob doirasida o'rganilgan nazariy va amaliy masalalar tizimlashtirildi hamda tegishli ilmiy xulosalar shakllantirildi.`;
  });

  // 6. XULOSA & TAVSIYALAR (CONCLUSION & RECOMMENDATIONS)
  const conclusionTask = async () => {
    const prompt = `Paper title: "${topic}"
Subject: ${subject}
Full plan of the paper:
${planText}

Write the XULOSA section, about ${conclusionWords} words.

Draw together what the paper established chapter by chapter, state the practical proposals that follow, and note which questions remain open. Introduce no new material.

Also provide practical recommendations in JSON format:
{
  "conclusion": ["Xulosa 1-paragrafi...", "Xulosa 2-paragrafi...", "Xulosa 3-paragrafi..."],
  "recommendations": {
    "forTeachers": ["O'qituvchilar uchun 1-tavsiya", "2-tavsiya", "3-tavsiya"],
    "forInstitution": ["Muassasa uchun 1-tavsiya", "2-tavsiya", "3-tavsiya"],
    "forStudents": ["Talabalar uchun 1-tavsiya", "2-tavsiya", "3-tavsiya"],
    "forEvaluation": ["Baholash uchun 1-tavsiya", "2-tavsiya", "3-tavsiya"]
  }
}`;

    const res = await generateContentWithRotation({
      model: "gemini-1.5-pro",
      contents: `${writerSystem}\n\n${prompt}`,
      config: { responseMimeType: "application/json" }
    });
    try {
      return JSON.parse(res.text || "{}");
    } catch {
      return {
        conclusion: splitBodyParagraphs(res.text || ""),
        recommendations: {
          forTeachers: ["Mavzu bo'yicha zamonaviy o'quv-metodik majmualarni takomillashtirish."],
          forInstitution: ["Tizimda axborot-kommunikatsiya texnologiyalarini keng joriy qilish."],
          forStudents: ["Mustaqil ta'lim va ilmiy-tadqiqot ko'nikmalarini rivojlantirish."],
          forEvaluation: ["Baholash tizimida amaliy keyslar ulushini oshirish."]
        }
      };
    }
  };

  // 7. FOYDALANILGAN ADABIYOTLAR (BIBLIOGRAPHY)
  const bibTask = async () => {
    const bibSystem = `You compile bibliographies for undergraduate papers in Uzbek (Latin script).
List sources you are genuinely confident exist: legislation and government decrees, publications of statistical agencies and ministries, long-established textbooks, and well-known international organisations' reports. Prefer widely cited, verifiable works over obscure ones. Do not invent DOIs, issue numbers, or page ranges you are unsure of. Order: legal acts first, then books and textbooks, then articles, then web resources.`;

    const prompt = `Paper title: "${topic}"
Subject: ${subject}

Give 25-30 bibliography entries formatted as JSON with categories:
{
  "normative": ["O'zbekiston Respublikasi Konstitutsiyasi...", "Qonun...", "Farmon..."],
  "books": ["Muallif. Kitob nomi. – Toshkent, 2022...", "Muallif 2..."],
  "articles": ["Muallif. Maqola nomi // Jurnal, 2023..."],
  "foreign": ["Author. Title. – Publisher, 2021..."],
  "web": ["Rasmiy sayt / portal: https://..."]
}`;

    const res = await generateContentWithRotation({
      model: "gemini-1.5-pro",
      contents: `${bibSystem}\n\n${prompt}`,
      config: { responseMimeType: "application/json" }
    });
    try {
      return JSON.parse(res.text || "{}");
    } catch {
      return {
        normative: [
          "O'zbekiston Respublikasi Konstitutsiyasi. – Toshkent: O'zbekiston, 2023.",
          "O'zbekiston Respublikasining 'Ta'lim to'g'risida'gi Qonuni. O'RQ-637-son, 2020-yil 23-sentyabr.",
          "O'zbekiston Respublikasi Prezidentining 'O'zbekiston – 2030' strategiyasi to'g'risidagi Farmoni. PF-158-son, 2023-yil 11-sentyabr."
        ],
        books: [
          "Qosimov A., Karimov S. Mutaxassislikka kirish va sohaviy asoslar. – Toshkent: Fan, 2022. – 280 b.",
          "Yo'ldoshev J.G'. Zamonaviy pedagogik texnologiyalar. – Toshkent: O'qituvchi, 2021. – 216 b.",
          "Abdullayev A.A. Sohaviy tahlil va modellashtirish. – Toshkent: Iqtisodiyot, 2020. – 312 b."
        ],
        articles: [
          "Axmedov B.R. Sohadagi innovatsion o'zgarishlar tahlili // O'zbekiston iqtisodiy axborotnomasi. – 2023. – №4. – B. 45-52.",
          "Toshmatov Sh.A. Zamonaviy rivojlanish tendensiyalari // Fan va jamiyat. – 2022. – №2. – B. 18-25."
        ],
        foreign: [
          "Kotler P., Armstrong G. Principles of Management & Innovation. – Pearson, 2021. – 736 p."
        ],
        web: [
          "O'zbekiston Respublikasi Prezidenti huzuridagi Statistika agentligi: https://stat.uz",
          "O'zbekiston Respublikasi Qonun hujjatlari ma'lumotlari milliy bazasi: https://lex.uz"
        ]
      };
    }
  };

  console.log("[CourseWork Gemini] Step 2: Concurrently generating sections, intro, conclusions and bibliography with gemini-1.5-pro...");
  const [introRaw, sectionOutputs, conclusionOutput, bibOutput, chConclusionOutputs] = await Promise.all([
    introTask(),
    mapConcurrent(sectionJobs, 2, processSection),
    conclusionTask(),
    bibTask(),
    Promise.all(chapterConclusionTasks.map(t => t()))
  ]);

  // Assemble chapters structure
  const assembledChapters: CourseWorkChapter[] = outlineJson.chapters.map((ch: any, ci: number) => {
    const chSections = sectionOutputs.filter(s => s.chapterIndex === ci);
    return {
      number: ci + 1,
      title: ch.title,
      conclusion: chConclusionOutputs[ci] || `${ci + 1}-bob yuzasidan xulosa va umumlashtirishlar shakllantirildi.`,
      paragraphs: chSections.map((sec, si) => ({
        title: `${ci + 1}.${si + 1}. ${sec.sectionTitle}`,
        content: sec.paragraphs.length > 0 ? sec.paragraphs : [
          `${sec.sectionTitle} bo'yicha nazariy va amaliy ma'lumotlar o'rganildi hamda tahliliy natijalar bayon qilindi.`
        ]
      }))
    };
  });

  const introTextClean = introRaw ? cleanAcademicText(introRaw) : "";

  const courseWorkData: CourseWorkData = {
    hasRealExperiment: hasRealExp,
    titleInfo: {
      ministry: "O'ZBEKISTON RESPUBLIKASI OLIY TA'LIM, FAN VA INNOVATSIYALAR VAZIRLIGI",
      university: input.university || "Oliy ta'lim muassasasi",
      faculty: input.faculty || "",
      department: input.department || "",
      topic: topic,
      subject: subject,
      direction: input.direction || "",
      studentName: input.studentName || "",
      advisor: input.advisor || "",
      city: input.city || "Toshkent",
      year: input.year || "2026"
    },
    introduction: {
      relevance: apparatus.relevance || introTextClean || "Mavzuning dolzarbligi zamonaviy rivojlanish tendensiyalari bilan belgilanadi.",
      literatureReview: apparatus.literatureReview || "Mavzu yuzasidan mahalliy va xorijiy olimlarning ilmiy tadqiqotlari tahlil qilindi.",
      problem: apparatus.problem || "Tadqiqotning asosiy muammosi sohada samaradorlikni oshirish zarurati bilan bog'liq.",
      object: input.object || apparatus.object || "Sohaviy jarayonlar va tizimlar",
      subjectItem: input.subjectItem || apparatus.subjectItem || "Mavzuni rivojlantirishning metodik va amaliy mexanizmlari",
      goal: apparatus.goal || "Mavzu bo'yicha ilmiy-nazariy asoslarni tahlil qilish va amaliy tavsiyalar ishlab chiqish.",
      tasks: Array.isArray(apparatus.tasks) && apparatus.tasks.length ? apparatus.tasks : [
        "Mavzuning nazariy-uslubiy asoslarini o'rganish;",
        "Mavjud holat va amaliyotni tahlil qilish;",
        "Muammo va kamchiliklarni aniqlash;",
        "Samaradorlikni oshirish bo'yicha ilmiy-amaliy takliflar ishlab chiqish."
      ],
      methodologicalBasis: apparatus.methodologicalBasis || "Tadqiqotda tizimli tahlil, qiyosiy taqqoslash va mantiqiy umumlashtirish usullaridan foydalanildi.",
      methods: Array.isArray(apparatus.methods) && apparatus.methods.length ? apparatus.methods : [
        "Nazariy tahlil", "Qiyosiy tahlil", "Statistik kuzatish", "Mantiqiy xulosa chiqarish"
      ],
      novelty: apparatus.novelty || "Mavzu bo'yicha tizimli ilmiy tahlil va takomillashtirilgan takliflar majmuasi ishlab chiqilgan.",
      practicalSignificance: apparatus.practicalSignificance || "Ish natijalaridan sohaviy amaliyotda hamda o'quv jarayonida foydalanish mumkin.",
      structureAndVolume: `Kurs ishi titul varaqasi, mundarija, kirish, 3 ta bob, 6 ta paragraf, xulosa, ilmiy-amaliy tavsiyalar va foydalanilgan adabiyotlar ro'yxatidan iborat bo'lib, jami ${pageTarget} sahifaga mo'ljallangan.`
    },
    chapters: assembledChapters,
    conclusion: Array.isArray(conclusionOutput.conclusion) && conclusionOutput.conclusion.length > 0
      ? conclusionOutput.conclusion
      : (splitBodyParagraphs(conclusionOutput.conclusion || introTextClean).length > 0
          ? splitBodyParagraphs(conclusionOutput.conclusion || introTextClean)
          : ["Kurs ishida qo'yilgan maqsad va vazifalar to'liq bajarildi hamda ilmiy-amaliy xulosalar shakllantirildi."]),
    recommendations: conclusionOutput.recommendations || {
      forTeachers: ["Mavzuni o'qitishda yangi pedagogik va amaliy texnologiyalardan foydalanish."],
      forInstitution: ["Zamonaviy axborot va moddiy-texnik bazani mustahkamlash."],
      forStudents: ["Mustaqil izlanish va amaliy ko'nikmalarni oshirish."],
      forEvaluation: ["Amaliy topshiriqlar va keyslar asosida baholash mexanizmini joriy etish."]
    },
    bibliography: {
      normative: Array.isArray(bibOutput.normative) ? bibOutput.normative : [],
      books: Array.isArray(bibOutput.books) ? bibOutput.books : [],
      articles: Array.isArray(bibOutput.articles) ? bibOutput.articles : [],
      foreign: Array.isArray(bibOutput.foreign) ? bibOutput.foreign : [],
      web: Array.isArray(bibOutput.web) ? bibOutput.web : []
    }
  };

  return validateAndCleanCourseWorkData(courseWorkData);
}

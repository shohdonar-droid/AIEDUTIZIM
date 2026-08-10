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
 * Generates CourseWork JSON content from Gemini API based on user input parameters.
 */
export async function generateCourseWorkDataWithGemini(input: CourseWorkInput): Promise<CourseWorkData> {
  const pageTarget = parseInt(input.pageCount || "30", 10) || 30;
  const hasRealExp = Boolean(input.extraRequirements && input.extraRequirements.length > 10);

  const prompt = `SEN — AIEDUTIZIM platformasining PROFESSIONAL KURS ISHI YARATUVCHI AKADEMIK AI yordamchisisan.

Sening asosiy vazifang — foydalanuvchi bergan mavzu va ma'lumotlar asosida O'zbekiston oliy ta'lim muassasalarida foydalanishga mos, ilmiy-akademik uslubda yozilgan, mantiqan izchil va to'liq KURS ISHI tayyorlash.

MUHIM:
Kurs ishi oddiy referat yoki uzun AI matni bo'lmasligi kerak. U:
- kurs ishi standartidagi strukturaga;
- ilmiy-akademik uslubga;
- mantiqiy 3 bob va 6 paragraflar tizimiga;
- tadqiqot apparatiga (dolzarblik, muammo, obyekt, predmet, maqsad, vazifalar, ilmiy yangilik, amaliy ahamiyat);
- ilmiy tahlilga;
- amaliy tavsiyalarga;
- bibliografik tartibga javob berishi kerak.

TOPILGAN FAKTLAR VA METADATA:
- Mavzu: "${input.topic}"
- Fan: "${input.subject}"
- OTM: "${input.university}"
- Fakultet: "${input.faculty || "Fakultet berilmagan"}"
- Kafedra: "${input.department || "Kafedra berilmagan"}"
- Ta'lim yo'nalishi: "${input.direction || "Yo'nalish berilmagan"}"
- Talaba F.I.Sh: "${input.studentName || "Talaba kiritilmagan"}"
- Ilmiy rahbar F.I.Sh: "${input.advisor || "Ilmiy rahbar kiritilmagan"}"
- Shahar: "${input.city || "Toshkent"}"
- O'quv yili: "${input.year || "2026"}"
- Mo'ljallangan hajm: ${pageTarget} sahifa
- Tadqiqot obyekti: "${input.object || "Mavzuga mos akademik pedagogik/amaliy jarayon"}"
- Tadqiqot predmeti: "${input.subjectItem || "Mavzuga mos usul, mexanizm va metodik shart-sharoitlar"}"
- Real tajriba ma'lumotlari: ${hasRealExp ? "HA (" + input.extraRequirements + ")" : "YO'Q"}

QAT'IY TASHKILIY VA AKADEMIK QOIDALAR:
1. AKADEMIK HALOLLIK (SOXTA TAJRIBA TAQIQLANADI):
   ${
     !hasRealExp
       ? "Foydalanuvchi real tajriba-sinov ma'lumotlarini bermadi. SHUNING UCHUN HECH QACHON SOXTA RESPONDENTLAR SONI (masalan: '52 nafar o'quvchi'), FOIZLAR, BALLAR, STUDENT T-TEST, P-VALUE UYDURMA! III bobdagi 3.2-paragrafni 'Tajriba-sinov ishlarini tashkil etishning tavsiya etilayotgan modeli' yoki 'Taklif etilayotgan metodikaning amaliy qo'llash mexanizmi' deb yoz. Maqsad, bosqichlar, diagnostika, baholash mezonlari va kutilayotgan natijalarni ber."
       : "Foydalanuvchi kiritgan ushbu real tajriba ma'lumotlariga tayan: " + input.extraRequirements
   }

2. STRUKTURA (3 BOB, 6 PARAGRAF):
   - KIRISH (dolzarblik, muammoning o'rganilganlik darajasi, tadqiqot muammosi, obyekt, predmet, maqsad, 6-8 ta vazifa, metodologik asos va usullar, ilmiy yangilik, amaliy ahamiyat, kurs ishining tuzilishi)
   - I BOB: Nazariy-metodologik asoslar (1.1 va 1.2 paragraflar, I bob bo'yicha oraliq xulosa)
   - II BOB: Amaliy holat va zamonaviy yondashuvlar (2.1 va 2.2 paragraflar, II bob bo'yicha oraliq xulosa)
   - III BOB: Takomillashtirish va amaliy yechimlar / tavsiya etilayotgan model (3.1 va 3.2 paragraflar, III bob bo'yicha oraliq xulosa)
   - XULOSA (maqsad va vazifalarga muvofiq, qayta tiklanmaydigan mantiqiy umumlashtirish)
   - ILMIY-AMALIY TAVSIYALAR (o'qituvchi, muassasa, talaba va baholash uchun)
   - FOYDALANILGAN ADABIYOTLAR RO'YXATI (I. Normativ, II. Darsliklar va o'quv qo'llanmalar, III. Maqolalar, IV. Xorijiy adabiyotlar, V. Internet resurslari — kamida 25-30 ta tartibli ilmiy manbalar)

3. TIL VA USLUB:
   - Toza o'zbek adabiy tilida, rasmiy-akademik va ilmiy.
   - HECH QANDAY SHABLON AI GAPLARI ("ushbu mavzu juda dolzarb va muhim hisoblanadi" kabi) TAKRORLANMASIN.
   - Izchil terminologiya va mavzuga aloqador haqiqiy olimlar qarashlari tahlili.
   - Matn ichida texnik belgilar (markdown ###, **, html taglar, debug) umuman bo'lmasin.

JAVOB FAQAT TO'LIQ VA MUKAMMAL JSON FORMATIDA BO'LISHI SHART.`;

  const response = await generateContentWithRotation({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      maxOutputTokens: 16384,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT" as any,
        properties: {
          titleInfo: {
            type: "OBJECT" as any,
            properties: {
              ministry: { type: "STRING" as any },
              university: { type: "STRING" as any },
              faculty: { type: "STRING" as any },
              department: { type: "STRING" as any },
              topic: { type: "STRING" as any },
              subject: { type: "STRING" as any },
              direction: { type: "STRING" as any },
              studentName: { type: "STRING" as any },
              advisor: { type: "STRING" as any },
              city: { type: "STRING" as any },
              year: { type: "STRING" as any }
            },
            required: ["university", "topic", "studentName"]
          },
          introduction: {
            type: "OBJECT" as any,
            properties: {
              relevance: { type: "STRING" as any },
              literatureReview: { type: "STRING" as any },
              problem: { type: "STRING" as any },
              object: { type: "STRING" as any },
              subjectItem: { type: "STRING" as any },
              goal: { type: "STRING" as any },
              tasks: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              methodologicalBasis: { type: "STRING" as any },
              methods: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              novelty: { type: "STRING" as any },
              practicalSignificance: { type: "STRING" as any },
              baseAndStages: { type: "STRING" as any },
              structureAndVolume: { type: "STRING" as any }
            },
            required: ["relevance", "goal", "tasks", "methodologicalBasis"]
          },
          chapters: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                number: { type: "NUMBER" as any },
                title: { type: "STRING" as any },
                paragraphs: {
                  type: "ARRAY" as any,
                  items: {
                    type: "OBJECT" as any,
                    properties: {
                      title: { type: "STRING" as any },
                      content: { type: "ARRAY" as any, items: { type: "STRING" as any } }
                    },
                    required: ["title", "content"]
                  }
                },
                conclusion: { type: "STRING" as any }
              },
              required: ["number", "title", "paragraphs", "conclusion"]
            }
          },
          tables: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                caption: { type: "STRING" as any },
                headers: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                rows: {
                  type: "ARRAY" as any,
                  items: { type: "ARRAY" as any, items: { type: "STRING" as any } }
                },
                explanation: { type: "STRING" as any }
              },
              required: ["caption", "headers", "rows", "explanation"]
            }
          },
          conclusion: { type: "ARRAY" as any, items: { type: "STRING" as any } },
          recommendations: {
            type: "OBJECT" as any,
            properties: {
              forTeachers: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              forInstitution: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              forStudents: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              forEvaluation: { type: "ARRAY" as any, items: { type: "STRING" as any } }
            },
            required: ["forTeachers", "forInstitution"]
          },
          bibliography: {
            type: "OBJECT" as any,
            properties: {
              normative: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              books: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              articles: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              foreign: { type: "ARRAY" as any, items: { type: "STRING" as any } },
              web: { type: "ARRAY" as any, items: { type: "STRING" as any } }
            },
            required: ["normative", "books", "articles"]
          }
        },
        required: ["titleInfo", "introduction", "chapters", "conclusion", "recommendations", "bibliography"]
      }
    }
  });

  if (!response || !response.text) {
    throw new Error("AI orqali kurs ishi mazmunini generatsiya qilishda xatolik yuz berdi (javob bo'sh).");
  }

  const rawJson = JSON.parse(response.text);
  rawJson.hasRealExperiment = hasRealExp;

  // Fallback defaults for missing fields from user input
  rawJson.titleInfo.university = rawJson.titleInfo.university || input.university;
  rawJson.titleInfo.topic = input.topic;
  rawJson.titleInfo.subject = input.subject || rawJson.titleInfo.subject;
  rawJson.titleInfo.faculty = input.faculty || rawJson.titleInfo.faculty || "";
  rawJson.titleInfo.department = input.department || rawJson.titleInfo.department || "";
  rawJson.titleInfo.direction = input.direction || rawJson.titleInfo.direction || "";
  rawJson.titleInfo.studentName = input.studentName || rawJson.titleInfo.studentName || "";
  rawJson.titleInfo.advisor = input.advisor || rawJson.titleInfo.advisor || "";
  rawJson.titleInfo.city = input.city || rawJson.titleInfo.city || "Toshkent";
  rawJson.titleInfo.year = input.year || rawJson.titleInfo.year || "2026";

  return validateAndCleanCourseWorkData(rawJson as CourseWorkData);
}

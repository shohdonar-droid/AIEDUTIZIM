import PDFDocument from "pdfkit";
import * as archiverModule from "archiver";
import fs from "fs";
import type { Response } from "express";

function createArchiver(
  _format: "zip",
  options?: { zlib?: { level?: number } }
): archiverModule.Archiver {
  const mod = archiverModule as any;
  if (typeof mod.ZipArchive === "function") {
    return new mod.ZipArchive(options);
  }
  if (typeof mod.default === "function") {
    return mod.default("zip", options);
  }
  if (typeof mod.create === "function") {
    return mod.create("zip", options);
  }
  throw new Error("Archiver ZipArchive initializer topilmadi");
}

export interface DtmPdfQuestionSnapshot {
  order: number;
  questionId: string;
  originalQuestionId?: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer?: string;
  subjectId?: string;
  subjectName?: string;
  block?: string;
  mandatoryGroup?: string;
}

export interface DtmPdfAssignmentPayload {
  id: string;
  assignmentCode: string;
  organizationId: string;
  organizationName: string;
  studentId: string;
  studentNumericId: string;
  studentFullName: string;
  studentGroupOrClass?: string;
  mandatorySubjectsLabel?: string;
  mandatoryQuestions?: DtmPdfQuestionSnapshot[];
  block1SubjectName: string;
  block2SubjectName: string;
  block1Questions: DtmPdfQuestionSnapshot[];
  block2Questions: DtmPdfQuestionSnapshot[];
  totalQuestions?: number;
}

const FONT_REGULAR_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_MONO_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf";

function resolveFonts() {
  const hasRegular = fs.existsSync(FONT_REGULAR_PATH);
  const hasBold = fs.existsSync(FONT_BOLD_PATH);
  const hasMonoBold = fs.existsSync(FONT_MONO_BOLD_PATH);
  return {
    regular: hasRegular ? FONT_REGULAR_PATH : "Helvetica",
    bold: hasBold ? FONT_BOLD_PATH : "Helvetica-Bold",
    monoBold: hasMonoBold ? FONT_MONO_BOLD_PATH : "Courier-Bold",
  };
}

export function sanitizeArchiveSegment(value: string): string {
  return (
    (value || "item")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/['`‘’ʻ]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "item"
  );
}

/**
 * Generates an A4 print-ready Test Booklet PDF buffer for a single DTM assignment.
 * Supports 90-question format (1-30 Mandatory + 31-60 Block 1 + 61-90 Block 2) and legacy 60-question format.
 */
export function generateTestBookletPdfBuffer(assignment: DtmPdfAssignmentPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const fonts = resolveFonts();
      const mandatoryQs = [...(assignment.mandatoryQuestions || [])].sort((a, b) => a.order - b.order);
      const hasMandatory = mandatoryQs.length > 0;

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 42, bottom: 48, left: 42, right: 42 },
        bufferPages: true,
        info: {
          Title: `DTM Test Kitobchasi - ${assignment.studentNumericId}`,
          Author: "AIEDUTIZIM DTM Tizim",
          Subject: `${assignment.block1SubjectName} / ${assignment.block2SubjectName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Reg", fonts.regular);
      doc.registerFont("Bld", fonts.bold);
      doc.registerFont("MonoBld", fonts.monoBold);

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 84;
      const maxY = doc.page.height - 58;

      // Top Header Banner on Page 1
      const bannerH = hasMandatory ? 140 : 122;
      doc
        .roundedRect(42, 36, contentWidth, bannerH, 6)
        .lineWidth(1.2)
        .strokeColor("#1e293b")
        .fillAndStroke("#f8fafc", "#1e293b");

      doc.fillColor("#0f172a").font("Bld").fontSize(13).text("AIEDUTIZIM  |  DTM TIZIM", 56, 48);
      doc.fillColor("#334155").font("Bld").fontSize(10).text("INDIVIDUAL TEST KITOBCHASI", 56, 49, {
        width: contentWidth - 28,
        align: "right",
      });

      doc.moveTo(56, 68).lineTo(pageWidth - 56, 68).lineWidth(0.75).strokeColor("#cbd5e1").stroke();

      doc.fillColor("#334155").font("Reg").fontSize(9);
      doc
        .text(`Tashkilot: `, 56, 76, { continued: true })
        .font("Bld")
        .fillColor("#0f172a")
        .text(assignment.organizationName || "—");

      doc
        .fillColor("#334155")
        .font("Reg")
        .text(`O'quvchi F.I.Sh.: `, 56, 92, { continued: true })
        .font("Bld")
        .fillColor("#0f172a")
        .text(assignment.studentFullName || "—");

      if (assignment.studentGroupOrClass) {
        doc
          .fillColor("#334155")
          .font("Reg")
          .text(`Sinf / Guruh: `, 355, 92, { continued: true })
          .font("Bld")
          .fillColor("#0f172a")
          .text(assignment.studentGroupOrClass);
      }

      doc
        .fillColor("#334155")
        .font("Reg")
        .text(`O'quvchi ID: `, 56, 108, { continued: true })
        .font("MonoBld")
        .fillColor("#1d4ed8")
        .text(assignment.studentNumericId);
      doc
        .fillColor("#334155")
        .font("Reg")
        .text(`Variant ID: `, 250, 108, { continued: true })
        .font("MonoBld")
        .fillColor("#0f172a")
        .text(assignment.assignmentCode || assignment.id);

      doc.fillColor("#334155").font("Reg").fontSize(8.5);
      if (hasMandatory) {
        doc
          .text(`Majburiy fanlar (1–30 · 1.1 ball): `, 56, 126, { continued: true })
          .font("Bld")
          .fillColor("#1e3a8a")
          .text(assignment.mandatorySubjectsLabel || "Ona tili, Matematika, O'zbekiston tarixi");
        doc
          .fillColor("#334155")
          .font("Reg")
          .text(`1-blok (31–60 · 3.1 ball): `, 56, 142, { continued: true })
          .font("Bld")
          .fillColor("#0f172a")
          .text(assignment.block1SubjectName || "—");
        doc
          .fillColor("#334155")
          .font("Reg")
          .text(`2-blok (61–90 · 2.1 ball): `, 295, 142, { continued: true })
          .font("Bld")
          .fillColor("#0f172a")
          .text(assignment.block2SubjectName || "—");
        doc.y = 188;
      } else {
        doc
          .text(`1-blok (1–30): `, 56, 128, { continued: true })
          .font("Bld")
          .fillColor("#0f172a")
          .text(assignment.block1SubjectName || "—");
        doc
          .fillColor("#334155")
          .font("Reg")
          .text(`2-blok (31–60): `, 295, 128, { continued: true })
          .font("Bld")
          .fillColor("#0f172a")
          .text(assignment.block2SubjectName || "—");
        doc.y = 172;
      }

      const renderBlockSection = (
        title: string,
        questions: DtmPdfQuestionSnapshot[],
        options?: { bannerFill?: string; showMandatorySubHeaders?: boolean }
      ) => {
        if (doc.y + 42 > maxY) {
          doc.addPage();
        }
        const bannerY = doc.y;
        doc.roundedRect(42, bannerY, contentWidth, 24, 4).fill(options?.bannerFill || "#0f172a");
        doc.fillColor("#ffffff").font("Bld").fontSize(10).text(title, 54, bannerY + 6, {
          width: contentWidth - 24,
        });
        doc.y = bannerY + 34;

        let lastSubHeader = "";

        for (const q of questions) {
          if (options?.showMandatorySubHeaders) {
            const subTitle =
              q.order <= 10
                ? `1-majburiy fan: ${q.subjectName || "Ona tili"} (1–10)`
                : q.order <= 20
                ? `2-majburiy fan: ${q.subjectName || "Matematika"} (11–20)`
                : `3-majburiy fan: ${q.subjectName || "O'zbekiston tarixi"} (21–30)`;

            if (subTitle !== lastSubHeader) {
              lastSubHeader = subTitle;
              if (doc.y + 70 > maxY) {
                doc.addPage();
              }
              const subY = doc.y;
              doc.roundedRect(42, subY, contentWidth, 18, 3).fill("#eff6ff");
              doc.fillColor("#1e3a8a").font("Bld").fontSize(8.5).text(subTitle.toUpperCase(), 50, subY + 4.5, {
                width: contentWidth - 16,
              });
              doc.y = subY + 25;
            }
          }

          const qText = `${q.order}. ${q.questionText || ""}`;
          const optTexts = [
            `A) ${q.optionA || ""}`,
            `B) ${q.optionB || ""}`,
            `C) ${q.optionC || ""}`,
            `D) ${q.optionD || ""}`,
          ];

          doc.font("Bld").fontSize(9.5);
          const qHeight = doc.heightOfString(qText, { width: contentWidth });
          doc.font("Reg").fontSize(9);
          const optsHeight = optTexts.reduce(
            (sum, t) => sum + doc.heightOfString(t, { width: contentWidth - 18 }) + 2,
            0
          );
          const neededHeight = qHeight + optsHeight + 14;

          if (doc.y + neededHeight > maxY) {
            doc.addPage();
          }

          doc.fillColor("#0f172a").font("Bld").fontSize(9.5).text(qText, 42, doc.y, {
            width: contentWidth,
          });
          doc.y += 3;

          doc.fillColor("#1e293b").font("Reg").fontSize(9);
          for (const opt of optTexts) {
            doc.text(opt, 58, doc.y, { width: contentWidth - 18 });
            doc.y += 1.5;
          }

          doc.y += 7;
          doc.moveTo(42, doc.y - 3).lineTo(pageWidth - 42, doc.y - 3).lineWidth(0.3).strokeColor("#e2e8f0").stroke();
          doc.y += 4;
        }
      };

      const b1 = [...(assignment.block1Questions || [])].sort((a, b) => a.order - b.order);
      const b2 = [...(assignment.block2Questions || [])].sort((a, b) => a.order - b.order);

      if (hasMandatory) {
        renderBlockSection(
          `MAJBURIY FANLAR: ${(assignment.mandatorySubjectsLabel || "ONA TILI · MATEMATIKA · O'ZBEKISTON TARIXI").toUpperCase()}  (1–30 · 1.1 BALL)`,
          mandatoryQs,
          { bannerFill: "#1e3a8a", showMandatorySubHeaders: true }
        );
        doc.y += 6;
        renderBlockSection(`1-BLOK: ${(assignment.block1SubjectName || "").toUpperCase()}  (31–60 · 3.1 BALL)`, b1);
        doc.y += 6;
        renderBlockSection(`2-BLOK: ${(assignment.block2SubjectName || "").toUpperCase()}  (61–90 · 2.1 BALL)`, b2);
      } else {
        renderBlockSection(`1-BLOK: ${(assignment.block1SubjectName || "").toUpperCase()}  (1–30 SAVOLLAR)`, b1);
        doc.y += 6;
        renderBlockSection(`2-BLOK: ${(assignment.block2SubjectName || "").toUpperCase()}  (31–60 SAVOLLAR)`, b2);
      }

      // Page footers across all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 34;
        doc.moveTo(42, footerY - 6).lineTo(pageWidth - 42, footerY - 6).lineWidth(0.5).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#64748b").font("Reg").fontSize(8);
        doc.text(
          `AIEDUTIZIM DTM  ·  ID: ${assignment.studentNumericId}  ·  ${assignment.assignmentCode || assignment.id}`,
          42,
          footerY,
          { lineBreak: false }
        );
        doc.text(`Sahifa ${i + 1} / ${range.count}`, 42, footerY, {
          width: contentWidth,
          align: "right",
          lineBreak: false,
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates an A4 OMR/OCR-ready Answer Sheet PDF buffer on 1 A4 page.
 * - 90-question format: 3 columns x 30 rows (1-30 Mandatory, 31-60 Block 1, 61-90 Block 2) with circular A/B/C/D bubbles.
 * - Legacy 60-question format: 3 columns x 20 rows (1-60) with square checkboxes.
 */
export function generateAnswerSheetPdfBuffer(assignment: DtmPdfAssignmentPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const fonts = resolveFonts();
      const hasMandatory =
        Boolean(assignment.mandatoryQuestions && assignment.mandatoryQuestions.length > 0) ||
        assignment.totalQuestions === 90;

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 20, bottom: 14, left: 32, right: 32 },
        info: {
          Title: `DTM Javoblar Varaqasi - ${assignment.studentNumericId}`,
          Author: "AIEDUTIZIM DTM Tizim",
          Subject: `Javoblar varaqasi (${assignment.assignmentCode})`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Reg", fonts.regular);
      doc.registerFont("Bld", fonts.bold);
      doc.registerFont("MonoBld", fonts.monoBold);

      const pageWidth = doc.page.width; // 595.28
      const pageHeight = doc.page.height; // 841.89

      // 4 OMR Fiducial Alignment Squares (Corners) — Canonical across 60Q & 90Q
      const markerSize = 14;
      const mOffset = 18;
      doc.fillColor("#000000");
      doc.rect(mOffset, mOffset, markerSize, markerSize).fill();
      doc.rect(pageWidth - mOffset - markerSize, mOffset, markerSize, markerSize).fill();
      doc.rect(mOffset, pageHeight - mOffset - markerSize, markerSize, markerSize).fill();
      doc.rect(pageWidth - mOffset - markerSize, pageHeight - mOffset - markerSize, markerSize, markerSize).fill();

      const left = 40;
      const contentWidth = pageWidth - 80; // 515.28
      const numericId = (assignment.studentNumericId || "0000000").padStart(7, "0").slice(0, 7);
      const options: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

      if (hasMandatory) {
        // ============================================================
        // 1-PAGE A4 DTM 90-QUESTION CIRCULAR BUBBLE SHEET (3 x 30)
        // ============================================================
        doc.fillColor("#0f172a").font("Bld").fontSize(12.5).text("AIEDUTIZIM  ·  DTM TIZIM", left, 22);
        doc.fillColor("#0f172a").font("Bld").fontSize(11).text("JAVOBLAR VARAQASI (90 SAVOL)", left, 23, {
          width: contentWidth,
          align: "right",
        });
        doc.moveTo(left, 39).lineTo(pageWidth - left, 39).lineWidth(1.1).strokeColor("#0f172a").stroke();

        const metaY = 47;
        const metaH = 86;
        const leftInfoW = 285;
        const idBoxX = left + leftInfoW + 10;
        const idBoxW = contentWidth - leftInfoW - 10;

        doc.roundedRect(left, metaY, leftInfoW, metaH, 4).lineWidth(1).strokeColor("#334155").stroke();
        doc.fillColor("#475569").font("Reg").fontSize(8);
        doc.text("Tashkilot:", left + 9, metaY + 7);
        doc.fillColor("#0f172a").font("Bld").fontSize(8.5).text(assignment.organizationName || "—", left + 68, metaY + 7, {
          width: leftInfoW - 76,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(8).text("F.I.Sh.:", left + 9, metaY + 21);
        doc.fillColor("#0f172a").font("Bld").fontSize(9).text(assignment.studentFullName || "—", left + 68, metaY + 20, {
          width: leftInfoW - 76,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(8).text("Variant ID:", left + 9, metaY + 35);
        doc.fillColor("#0f172a").font("MonoBld").fontSize(8.5).text(assignment.assignmentCode || assignment.id, left + 68, metaY + 35);

        doc.fillColor("#1e3a8a").font("Bld").fontSize(7.8).text("Majburiy (1–30):", left + 9, metaY + 49);
        doc.fillColor("#1e3a8a").font("Bld").fontSize(7.8).text(
          assignment.mandatorySubjectsLabel || "Ona tili, Matematika, Tarix",
          left + 74,
          metaY + 49,
          { width: leftInfoW - 82, ellipsis: true, lineBreak: false }
        );

        doc.fillColor("#475569").font("Reg").fontSize(7.8).text("1-blok (31–60):", left + 9, metaY + 61);
        doc.fillColor("#0f172a").font("Bld").fontSize(7.8).text(assignment.block1SubjectName || "—", left + 74, metaY + 61, {
          width: leftInfoW - 82,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(7.8).text("2-blok (61–90):", left + 9, metaY + 73);
        doc.fillColor("#0f172a").font("Bld").fontSize(7.8).text(assignment.block2SubjectName || "—", left + 74, metaY + 73, {
          width: leftInfoW - 82,
          ellipsis: true,
          lineBreak: false,
        });

        // OCR / OMR Student ID Box
        doc.roundedRect(idBoxX, metaY, idBoxW, metaH, 4).lineWidth(1.8).strokeColor("#000000").fillAndStroke("#f8fafc", "#000000");
        doc.fillColor("#0f172a").font("Bld").fontSize(8.5).text("O'QUVCHI ID (OCR / OMR BLOK)", idBoxX, metaY + 7, {
          width: idBoxW,
          align: "center",
        });

        doc.fillColor("#000000").font("MonoBld").fontSize(19).text(numericId, idBoxX, metaY + 21, {
          width: idBoxW,
          align: "center",
        });

        const digits = numericId.split("");
        const cellW = 24;
        const cellH = 26;
        const cellGap = 4;
        const totalCellsW = digits.length * cellW + (digits.length - 1) * cellGap;
        const cellsStartX = idBoxX + (idBoxW - totalCellsW) / 2;
        const cellsY = metaY + 51;

        digits.forEach((digit, idx) => {
          const cx = cellsStartX + idx * (cellW + cellGap);
          doc.rect(cx, cellsY, cellW, cellH).lineWidth(1).strokeColor("#0f172a").fillAndStroke("#ffffff", "#0f172a");
          doc.fillColor("#000000").font("MonoBld").fontSize(14).text(digit, cx, cellsY + 4.5, {
            width: cellW,
            align: "center",
            lineBreak: false,
          });
        });

        // Instruction Bar
        const instrY = 140;
        doc.roundedRect(left, instrY, contentWidth, 20, 3).fill("#f1f5f9");
        doc.fillColor("#334155").font("Reg").fontSize(7.5).text(
          "YO'RIQNOMA: A, B, C, D doirachalarini qora yoki ko'k ruchka bilan to'liq bo'yang. Har savolda faqat 1 ta javob belgilanadi.",
          left + 8,
          instrY + 5.5,
          { width: contentWidth - 16, align: "center" }
        );

        // 3-Column OMR Grid: 1-30 (Majburiy), 31-60 (1-blok), 61-90 (2-blok)
        const gridY = 168;
        const headerH = 18;
        const colGap = 14;
        const colW = (contentWidth - colGap * 2) / 3; // 162.4267
        const rowH = 19.2; // 30 * 19.2 = 576 => ends at y = 762

        for (let col = 0; col < 3; col++) {
          const colX = left + col * (colW + colGap);
          const startNum = col * 30 + 1;

          doc.rect(colX, gridY, colW, headerH).fill(col === 0 ? "#1e3a8a" : "#0f172a");
          const colLabel =
            col === 0
              ? `MAJBURIY (1–30)`
              : col === 1
              ? `1-BLOK (31–60)`
              : `2-BLOK (61–90)`;
          doc.fillColor("#ffffff").font("Bld").fontSize(8).text(colLabel, colX, gridY + 4.5, {
            width: colW,
            align: "center",
          });

          for (let r = 0; r < 30; r++) {
            const qNum = startNum + r;
            const ry = gridY + headerH + r * rowH;

            const rowBg = r % 2 === 0 ? "#ffffff" : "#f8fafc";
            doc.rect(colX, ry, colW, rowH).lineWidth(0.45).strokeColor("#cbd5e1").fillAndStroke(rowBg, "#cbd5e1");

            // Visual sub-block separators in Mandatory column between Ona tili (1-10), Matematika (11-20), Tarix (21-30)
            if (qNum === 11 || qNum === 21) {
              doc.moveTo(colX, ry).lineTo(colX + colW, ry).lineWidth(1.25).strokeColor("#2563eb").stroke();
            }

            doc.fillColor("#0f172a").font("MonoBld").fontSize(8.2).text(`${String(qNum).padStart(2, "0")}.`, colX + 5, ry + 5, {
              width: 20,
              lineBreak: false,
            });

            // 4 Circular OMR Bubbles: A B C D
            const centerStartX = colX + 38;
            const stepX = 33;
            const radius = 6.2;
            const cy = ry + rowH / 2;

            options.forEach((opt, oi) => {
              const cx = centerStartX + oi * stepX;
              doc.circle(cx, cy, radius).lineWidth(0.95).strokeColor("#0f172a").fillAndStroke("#ffffff", "#0f172a");
              doc.fillColor("#0f172a").font("Bld").fontSize(7.5).text(opt, cx - radius, cy - 3.6, {
                width: radius * 2,
                align: "center",
                lineBreak: false,
              });
            });
          }
        }

        // Bottom Signature & Verification Strip (y = 772..800, safely above bottom fiducials at y = 809.89)
        const bottomY = gridY + headerH + 30 * rowH + 10; // 772
        doc.moveTo(left, bottomY).lineTo(pageWidth - left, bottomY).lineWidth(0.75).strokeColor("#94a3b8").stroke();
        doc.fillColor("#475569").font("Reg").fontSize(8);
        doc.text(`O'quvchi imzosi: _______________________`, left, bottomY + 9, { lineBreak: false });
        doc.text(`Nazoratchi imzosi: _______________________`, left + 215, bottomY + 9, { lineBreak: false });
        doc.text(`Sana: ____.____.2026`, left + 420, bottomY + 9, { lineBreak: false });

        doc.fillColor("#64748b").font("Reg").fontSize(7.5).text(
          `AIEDUTIZIM DTM 90-Savol OMR Standard Sheet  ·  Student ID: ${numericId}  ·  Assignment: ${assignment.assignmentCode || assignment.id}`,
          left,
          pageHeight - 28,
          { width: contentWidth, align: "center", lineBreak: false }
        );
      } else {
        // ============================================================
        // LEGACY 60-QUESTION ANSWER SHEET (3 x 20 Square Boxes)
        // ============================================================
        doc.fillColor("#0f172a").font("Bld").fontSize(13).text("AIEDUTIZIM  ·  DTM TIZIM", left, 26);
        doc.fillColor("#0f172a").font("Bld").fontSize(12).text("JAVOBLAR VARAQASI", left, 27, {
          width: contentWidth,
          align: "right",
        });
        doc.moveTo(left, 45).lineTo(pageWidth - left, 45).lineWidth(1.2).strokeColor("#0f172a").stroke();

        const metaY = 54;
        const leftInfoW = 285;
        const idBoxX = left + leftInfoW + 10;
        const idBoxW = contentWidth - leftInfoW - 10;

        doc.roundedRect(left, metaY, leftInfoW, 92, 4).lineWidth(1).strokeColor("#334155").stroke();
        doc.fillColor("#475569").font("Reg").fontSize(8.5);
        doc.text("Tashkilot:", left + 10, metaY + 8);
        doc.fillColor("#0f172a").font("Bld").fontSize(9).text(assignment.organizationName || "—", left + 65, metaY + 8, {
          width: leftInfoW - 75,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(8.5).text("F.I.Sh.:", left + 10, metaY + 25);
        doc.fillColor("#0f172a").font("Bld").fontSize(9.5).text(assignment.studentFullName || "—", left + 65, metaY + 24, {
          width: leftInfoW - 75,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(8.5).text("Variant ID:", left + 10, metaY + 42);
        doc.fillColor("#0f172a").font("MonoBld").fontSize(9).text(assignment.assignmentCode || assignment.id, left + 65, metaY + 42);

        doc.fillColor("#475569").font("Reg").fontSize(8.5).text("1-blok:", left + 10, metaY + 58);
        doc.fillColor("#0f172a").font("Bld").fontSize(8.5).text(assignment.block1SubjectName || "—", left + 65, metaY + 58, {
          width: leftInfoW - 75,
          ellipsis: true,
          lineBreak: false,
        });

        doc.fillColor("#475569").font("Reg").fontSize(8.5).text("2-blok:", left + 10, metaY + 73);
        doc.fillColor("#0f172a").font("Bld").fontSize(8.5).text(assignment.block2SubjectName || "—", left + 65, metaY + 73, {
          width: leftInfoW - 75,
          ellipsis: true,
          lineBreak: false,
        });

        doc.roundedRect(idBoxX, metaY, idBoxW, 92, 4).lineWidth(1.8).strokeColor("#000000").fillAndStroke("#f8fafc", "#000000");
        doc.fillColor("#0f172a").font("Bld").fontSize(9).text("O'QUVCHI ID (OCR / OMR BLOK)", idBoxX, metaY + 8, {
          width: idBoxW,
          align: "center",
        });

        doc.fillColor("#000000").font("MonoBld").fontSize(20).text(numericId, idBoxX, metaY + 23, {
          width: idBoxW,
          align: "center",
        });

        const digits = numericId.split("");
        const cellW = 24;
        const cellH = 28;
        const cellGap = 4;
        const totalCellsW = digits.length * cellW + (digits.length - 1) * cellGap;
        const cellsStartX = idBoxX + (idBoxW - totalCellsW) / 2;
        const cellsY = metaY + 54;

        digits.forEach((digit, idx) => {
          const cx = cellsStartX + idx * (cellW + cellGap);
          doc.rect(cx, cellsY, cellW, cellH).lineWidth(1).strokeColor("#0f172a").fillAndStroke("#ffffff", "#0f172a");
          doc.fillColor("#000000").font("MonoBld").fontSize(15).text(digit, cx, cellsY + 5, {
            width: cellW,
            align: "center",
            lineBreak: false,
          });
        });

        const instrY = 154;
        doc.roundedRect(left, instrY, contentWidth, 24, 3).fill("#f1f5f9");
        doc.fillColor("#334155").font("Reg").fontSize(8).text(
          "YO'RIQNOMA: Har bir savol qarshisidagi to'g'ri variant katagini (A, B, C, D) qora yoki ko'k ruchka bilan to'liq belgilang. Bir savolda faqat 1 ta javob tanlanadi.",
          left + 8,
          instrY + 6.5,
          { width: contentWidth - 16, align: "center" }
        );

        const gridY = 190;
        const colGap = 14;
        const colW = (contentWidth - colGap * 2) / 3;
        const rowH = 27.5;

        for (let col = 0; col < 3; col++) {
          const colX = left + col * (colW + colGap);
          const startNum = col * 20 + 1;

          doc.rect(colX, gridY, colW, 20).fill("#0f172a");
          const colLabel =
            col === 0
              ? `1-BLOK (1–20)`
              : col === 1
              ? `1-2 BLOK (21–40)`
              : `2-BLOK (41–60)`;
          doc.fillColor("#ffffff").font("Bld").fontSize(8.5).text(colLabel, colX, gridY + 5, {
            width: colW,
            align: "center",
          });

          for (let r = 0; r < 20; r++) {
            const qNum = startNum + r;
            const ry = gridY + 20 + r * rowH;

            const rowBg = r % 2 === 0 ? "#ffffff" : "#f8fafc";
            doc.rect(colX, ry, colW, rowH).lineWidth(0.5).strokeColor("#cbd5e1").fillAndStroke(rowBg, "#cbd5e1");

            if (qNum === 31) {
              doc.moveTo(colX, ry).lineTo(colX + colW, ry).lineWidth(1.5).strokeColor("#1d4ed8").stroke();
            }

            doc.fillColor("#0f172a").font("MonoBld").fontSize(9).text(`${String(qNum).padStart(2, "0")}.`, colX + 5, ry + 8, {
              width: 22,
              lineBreak: false,
            });

            const boxesStartX = colX + 30;
            const stepX = 32;
            options.forEach((opt, oi) => {
              const bx = boxesStartX + oi * stepX;
              const by = ry + 6.5;
              doc.rect(bx, by, 14, 14).lineWidth(1).strokeColor("#0f172a").fillAndStroke("#ffffff", "#0f172a");
              doc.fillColor("#0f172a").font("Bld").fontSize(8).text(opt, bx, by + 2.5, {
                width: 14,
                align: "center",
                lineBreak: false,
              });
            });
          }
        }

        const bottomY = gridY + 20 + 20 * rowH + 14;
        doc.moveTo(left, bottomY).lineTo(pageWidth - left, bottomY).lineWidth(0.75).strokeColor("#94a3b8").stroke();
        doc.fillColor("#475569").font("Reg").fontSize(8.5);
        doc.text(`O'quvchi imzosi: ________________________`, left, bottomY + 10, { lineBreak: false });
        doc.text(`Nazoratchi imzosi: ________________________`, left + 225, bottomY + 10, { lineBreak: false });
        doc.text(`Sana: ____.____.2026`, left + 420, bottomY + 10, { lineBreak: false });

        doc.fillColor("#64748b").font("Reg").fontSize(7.5).text(
          `AIEDUTIZIM DTM OMR/OCR Standard Sheet  ·  Student ID: ${numericId}  ·  Assignment: ${assignment.assignmentCode || assignment.id}`,
          left,
          pageHeight - 30,
          { width: contentWidth, align: "center", lineBreak: false }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates PDFs for every assignment in an organization and streams them into a single ZIP file,
 * organizing each student's Test & Answer Sheet inside their own isolated folder:
 * `${studentNumericId}_${safeFullName}/Test_${studentNumericId}.pdf`
 * `${studentNumericId}_${safeFullName}/Javoblar_${studentNumericId}.pdf`
 */
export async function streamOrganizationZip(
  res: Response,
  organizationName: string,
  assignments: DtmPdfAssignmentPayload[]
): Promise<void> {
  const safeOrg = sanitizeArchiveSegment(organizationName || "Tashkilot");
  const zipFilename = `${safeOrg}_DTM.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

  const archive = createArchiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err: Error) => {
    console.error("[DTM ZIP Stream Error]:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "ZIP arxiv yaratishda xatolik yuz berdi" });
    } else {
      res.destroy(err);
    }
  });

  archive.pipe(res);

  for (const assignment of assignments) {
    const cleanId = sanitizeArchiveSegment(assignment.studentNumericId);
    const cleanName = sanitizeArchiveSegment(assignment.studentFullName);
    const folderName = `${cleanId}_${cleanName}`;

    const [testPdfBuffer, answerPdfBuffer] = await Promise.all([
      generateTestBookletPdfBuffer(assignment),
      generateAnswerSheetPdfBuffer(assignment),
    ]);

    archive.append(testPdfBuffer, { name: `${folderName}/Test_${cleanId}.pdf` });
    archive.append(answerPdfBuffer, { name: `${folderName}/Javoblar_${cleanId}.pdf` });
  }

  await archive.finalize();
}

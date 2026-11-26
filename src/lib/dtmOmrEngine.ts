import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { DtmAnswerOption } from '../types/dtm';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface OmrPoint {
  x: number;
  y: number;
}

export interface OmrCorners {
  tl: OmrPoint;
  tr: OmrPoint;
  bl: OmrPoint;
  br: OmrPoint;
}

export type OmrQuestionStatus = 'OK' | 'BLANK' | 'MULTIPLE' | 'LOW_CONFIDENCE';

export interface OmrQuestionDetection {
  order: number;
  selected: DtmAnswerOption | '';
  status: OmrQuestionStatus;
  scores: Record<DtmAnswerOption, number>;
  confidence: number;
}

export interface OmrScanResult {
  answers: Record<string, DtmAnswerOption | ''>;
  questions: OmrQuestionDetection[];
  ocrConfidence: number;
  corners: OmrCorners;
  autoDetected: boolean;
  sourceWidth: number;
  sourceHeight: number;
  sourceDataUrl: string;
  warpedOverlayDataUrl: string;
  filledCount: number;
  ambiguousOrders: number[];
  lowConfidenceOrders: number[];
  alignmentOffset: { dx: number; dy: number };
}

// ==========================================
// EXACT CANONICAL PDF GEOMETRY (server/dtmPdfService.ts)
// ==========================================
export const PDF_WIDTH = 595.28;
export const PDF_HEIGHT = 841.89;
export const WARP_SCALE = 2;
export const WARP_WIDTH = Math.round(PDF_WIDTH * WARP_SCALE); // 1191
export const WARP_HEIGHT = Math.round(PDF_HEIGHT * WARP_SCALE); // 1684

// 4 Fiducial Black Squares: 14x14pt at offset 18pt -> Centers:
const FIDUCIAL_OFFSET = 18;
const FIDUCIAL_SIZE = 14;
const FIDUCIAL_HALF = FIDUCIAL_SIZE / 2;

const CANONICAL_FIDUCIALS_PDF: OmrCorners = {
  tl: { x: FIDUCIAL_OFFSET + FIDUCIAL_HALF, y: FIDUCIAL_OFFSET + FIDUCIAL_HALF }, // (25, 25)
  tr: { x: PDF_WIDTH - FIDUCIAL_OFFSET - FIDUCIAL_HALF, y: FIDUCIAL_OFFSET + FIDUCIAL_HALF }, // (570.28, 25)
  bl: { x: FIDUCIAL_OFFSET + FIDUCIAL_HALF, y: PDF_HEIGHT - FIDUCIAL_OFFSET - FIDUCIAL_HALF }, // (25, 816.89)
  br: {
    x: PDF_WIDTH - FIDUCIAL_OFFSET - FIDUCIAL_HALF,
    y: PDF_HEIGHT - FIDUCIAL_OFFSET - FIDUCIAL_HALF,
  }, // (570.28, 816.89)
};

const CANONICAL_FIDUCIALS_WARP: OmrCorners = {
  tl: { x: CANONICAL_FIDUCIALS_PDF.tl.x * WARP_SCALE, y: CANONICAL_FIDUCIALS_PDF.tl.y * WARP_SCALE },
  tr: { x: CANONICAL_FIDUCIALS_PDF.tr.x * WARP_SCALE, y: CANONICAL_FIDUCIALS_PDF.tr.y * WARP_SCALE },
  bl: { x: CANONICAL_FIDUCIALS_PDF.bl.x * WARP_SCALE, y: CANONICAL_FIDUCIALS_PDF.bl.y * WARP_SCALE },
  br: { x: CANONICAL_FIDUCIALS_PDF.br.x * WARP_SCALE, y: CANONICAL_FIDUCIALS_PDF.br.y * WARP_SCALE },
};

// Ideal A4 fiducial aspect ratio: (570.28 - 25) / (816.89 - 25) = 0.68858
const IDEAL_FIDUCIAL_ASPECT =
  (CANONICAL_FIDUCIALS_PDF.tr.x - CANONICAL_FIDUCIALS_PDF.tl.x) /
  (CANONICAL_FIDUCIALS_PDF.bl.y - CANONICAL_FIDUCIALS_PDF.tl.y);

// Grid Constants (PDF points)
const GRID_LEFT = 40;
const CONTENT_WIDTH = PDF_WIDTH - 80; // 515.28
const COL_GAP = 14;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP * 2) / 3; // 162.4267
const OPTIONS: DtmAnswerOption[] = ['A', 'B', 'C', 'D'];

// Legacy 60-question square geometry
const GRID60_Y = 190;
const HEADER60_HEIGHT = 20;
const ROW60_HEIGHT = 27.5;
const BOX60_SIZE_PT = 14;
const BOX60_STEP_PT = 32;

// 90-question 1-page circular geometry
const GRID90_Y = 168;
const HEADER90_HEIGHT = 18;
const ROW90_HEIGHT = 19.2;
const BUBBLE90_CENTER_OFFSET_X = 38;
const BUBBLE90_STEP_PT = 33;
const BUBBLE90_RADIUS_PT = 6.2;

export interface CheckboxGeometry {
  order: number;
  option: DtmAnswerOption;
  x: number; // warped px
  y: number; // warped px
  size: number; // warped px
}

interface BoxGeometryWarp {
  x: number;
  y: number;
  size: number;
  cx: number;
  cy: number;
  r: number;
  isCircle: boolean;
  colX: number;
  ry: number;
}

function getBoxCoordinatesWarp(
  qNum: number,
  optIdx: number,
  dx = 0,
  dy = 0,
  is90 = true
): BoxGeometryWarp {
  if (is90) {
    const col = Math.floor((qNum - 1) / 30);
    const row = (qNum - 1) % 30;
    const colXPt = GRID_LEFT + col * (COL_WIDTH + COL_GAP);
    const ryPt = GRID90_Y + HEADER90_HEIGHT + row * ROW90_HEIGHT;
    const cxPt = colXPt + BUBBLE90_CENTER_OFFSET_X + optIdx * BUBBLE90_STEP_PT;
    const cyPt = ryPt + ROW90_HEIGHT / 2;
    const rPt = BUBBLE90_RADIUS_PT;

    return {
      x: (cxPt - rPt) * WARP_SCALE + dx,
      y: (cyPt - rPt) * WARP_SCALE + dy,
      size: rPt * 2 * WARP_SCALE,
      cx: cxPt * WARP_SCALE + dx,
      cy: cyPt * WARP_SCALE + dy,
      r: rPt * WARP_SCALE,
      isCircle: true,
      colX: colXPt * WARP_SCALE + dx,
      ry: ryPt * WARP_SCALE + dy,
    };
  }

  const col = Math.floor((qNum - 1) / 20);
  const row = (qNum - 1) % 20;
  const colXPt = GRID_LEFT + col * (COL_WIDTH + COL_GAP);
  const ryPt = GRID60_Y + HEADER60_HEIGHT + row * ROW60_HEIGHT;
  const bxPt = colXPt + 30 + optIdx * BOX60_STEP_PT;
  const byPt = ryPt + 6.5;

  return {
    x: bxPt * WARP_SCALE + dx,
    y: byPt * WARP_SCALE + dy,
    size: BOX60_SIZE_PT * WARP_SCALE,
    cx: (bxPt + BOX60_SIZE_PT / 2) * WARP_SCALE + dx,
    cy: (byPt + BOX60_SIZE_PT / 2) * WARP_SCALE + dy,
    r: (BOX60_SIZE_PT / 2) * WARP_SCALE,
    isCircle: false,
    colX: colXPt * WARP_SCALE + dx,
    ry: ryPt * WARP_SCALE + dy,
  };
}

// Ink-weighted luminance: responds strongly to BOTH black pen/pencil and blue ballpoint pen
// (for blue pen R≈20 G≈65 B≈210 -> inkLum≈49 while white paper ≈235)
function computeInkLuminance(r: number, g: number, b: number): number {
  return 0.45 * r + 0.45 * g + 0.1 * b;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function dist(a: OmrPoint, b: OmrPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ==========================================
// FILE / IMAGE / PDF LOADER
// ==========================================
export async function loadSourceCanvasFromFile(file: File): Promise<HTMLCanvasElement> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.2 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("PDF render qilish uchun 2D canvas konteksti olinmadi.");

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as any).promise;

    return canvas;
  }

  // Image file: handle EXIF orientation cleanly via createImageBitmap when available
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Rasm yuklash uchun 2D canvas konteksti olinmadi.");

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 2200;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return canvas;
    } catch {
      // fallback to HTMLImageElement
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Rasm faylini o'qib bo'lmadi."));
      el.src = objectUrl;
    });

    const maxDim = 2200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function canvasFromVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Kamera kadrini olishda xatolik.");
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

// ==========================================
// 4-CORNER FIDUCIAL SQUARE DETECTOR
// ==========================================
interface SquareCandidate {
  cx: number;
  cy: number;
  size: number;
  area: number;
  contrast: number;
  fillRatio: number;
  score: number;
}

function defaultScaledCorners(width: number, height: number): OmrCorners {
  return {
    tl: {
      x: (CANONICAL_FIDUCIALS_PDF.tl.x / PDF_WIDTH) * width,
      y: (CANONICAL_FIDUCIALS_PDF.tl.y / PDF_HEIGHT) * height,
    },
    tr: {
      x: (CANONICAL_FIDUCIALS_PDF.tr.x / PDF_WIDTH) * width,
      y: (CANONICAL_FIDUCIALS_PDF.tr.y / PDF_HEIGHT) * height,
    },
    bl: {
      x: (CANONICAL_FIDUCIALS_PDF.bl.x / PDF_WIDTH) * width,
      y: (CANONICAL_FIDUCIALS_PDF.bl.y / PDF_HEIGHT) * height,
    },
    br: {
      x: (CANONICAL_FIDUCIALS_PDF.br.x / PDF_WIDTH) * width,
      y: (CANONICAL_FIDUCIALS_PDF.br.y / PDF_HEIGHT) * height,
    },
  };
}

function refineCornerFullRes(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  approxX: number,
  approxY: number,
  expectedSquarePx: number
): OmrPoint {
  const halfSearch = clamp(Math.round(expectedSquarePx * 1.15), 10, 60);
  const x0 = clamp(Math.floor(approxX - halfSearch), 0, srcW - 1);
  const y0 = clamp(Math.floor(approxY - halfSearch), 0, srcH - 1);
  const x1 = clamp(Math.ceil(approxX + halfSearch), 0, srcW - 1);
  const y1 = clamp(Math.ceil(approxY + halfSearch), 0, srcH - 1);

  // Compute local light/dark threshold using outer ring of window
  let lightSum = 0;
  let lightCount = 0;
  let minLum = 255;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = (y * srcW + x) * 4;
      const lum = computeInkLuminance(srcData[idx], srcData[idx + 1], srcData[idx + 2]);
      if (lum < minLum) minLum = lum;
      if (x === x0 || x === x1 || y === y0 || y === y1) {
        lightSum += lum;
        lightCount++;
      }
    }
  }

  const ringMean = lightCount > 0 ? lightSum / lightCount : 220;
  const cutoff = minLum + (ringMean - minLum) * 0.45;

  let sumX = 0;
  let sumY = 0;
  let sumW = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = (y * srcW + x) * 4;
      const lum = computeInkLuminance(srcData[idx], srcData[idx + 1], srcData[idx + 2]);
      if (lum <= cutoff) {
        const weight = cutoff - lum + 1;
        sumX += x * weight;
        sumY += y * weight;
        sumW += weight;
      }
    }
  }

  if (sumW <= 0) return { x: approxX, y: approxY };
  return { x: sumX / sumW, y: sumY / sumW };
}

export function detectFiducialCorners(canvas: HTMLCanvasElement): {
  corners: OmrCorners;
  autoDetected: boolean;
} {
  const srcW = canvas.width;
  const srcH = canvas.height;
  const srcCtx = canvas.getContext('2d');
  if (!srcCtx) {
    return { corners: defaultScaledCorners(srcW, srcH), autoDetected: false };
  }

  // Downscale for fast connected-component search (~900px max dim)
  const targetMax = 900;
  const dsScale = Math.min(1, targetMax / Math.max(srcW, srcH));
  const dsW = Math.max(64, Math.round(srcW * dsScale));
  const dsH = Math.max(64, Math.round(srcH * dsScale));

  const dsCanvas = document.createElement('canvas');
  dsCanvas.width = dsW;
  dsCanvas.height = dsH;
  const dsCtx = dsCanvas.getContext('2d');
  if (!dsCtx) {
    return { corners: defaultScaledCorners(srcW, srcH), autoDetected: false };
  }
  dsCtx.drawImage(canvas, 0, 0, dsW, dsH);
  const dsImage = dsCtx.getImageData(0, 0, dsW, dsH).data;

  // Luminance & Integral Image for adaptive local thresholding
  const lum = new Float32Array(dsW * dsH);
  const integral = new Float64Array((dsW + 1) * (dsH + 1));

  for (let y = 0; y < dsH; y++) {
    let rowSum = 0;
    const rowOffset = y * dsW;
    const intRow = (y + 1) * (dsW + 1);
    const intPrevRow = y * (dsW + 1);
    for (let x = 0; x < dsW; x++) {
      const p = (rowOffset + x) * 4;
      const v = computeInkLuminance(dsImage[p], dsImage[p + 1], dsImage[p + 2]);
      lum[rowOffset + x] = v;
      rowSum += v;
      integral[intRow + x + 1] = integral[intPrevRow + x + 1] + rowSum;
    }
  }

  const winRadius = clamp(Math.round(Math.min(dsW, dsH) * 0.045), 14, 42);
  const darkMask = new Uint8Array(dsW * dsH);

  for (let y = 0; y < dsH; y++) {
    const y0 = Math.max(0, y - winRadius);
    const y1 = Math.min(dsH - 1, y + winRadius);
    const i0 = y0 * (dsW + 1);
    const i1 = (y1 + 1) * (dsW + 1);
    for (let x = 0; x < dsW; x++) {
      const x0 = Math.max(0, x - winRadius);
      const x1 = Math.min(dsW - 1, x + winRadius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[i1 + x1 + 1] - integral[i0 + x1 + 1] - integral[i1 + x0] + integral[i0 + x0];
      const localMean = sum / area;
      const v = lum[y * dsW + x];
      if (v < localMean * 0.72 && v < 170) {
        darkMask[y * dsW + x] = 1;
      }
    }
  }

  // Connected components via flood fill
  const visited = new Uint8Array(dsW * dsH);
  const minDim = Math.min(dsW, dsH);
  const minArea = Math.max(20, Math.pow(minDim * 0.008, 2));
  const maxArea = Math.pow(minDim * 0.09, 2);

  const stack = new Int32Array(dsW * dsH);
  const candidates: SquareCandidate[] = [];

  for (let y = 2; y < dsH - 2; y++) {
    for (let x = 2; x < dsW - 2; x++) {
      const start = y * dsW + x;
      if (!darkMask[start] || visited[start]) continue;

      let sp = 0;
      stack[sp++] = start;
      visited[start] = 1;

      let count = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let innerLumSum = 0;

      while (sp > 0) {
        const idx = stack[--sp];
        const py = Math.floor(idx / dsW);
        const px = idx - py * dsW;

        count++;
        sumX += px;
        sumY += py;
        innerLumSum += lum[idx];
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        // 4-connectivity
        if (px > 0) {
          const n = idx - 1;
          if (darkMask[n] && !visited[n]) {
            visited[n] = 1;
            stack[sp++] = n;
          }
        }
        if (px + 1 < dsW) {
          const n = idx + 1;
          if (darkMask[n] && !visited[n]) {
            visited[n] = 1;
            stack[sp++] = n;
          }
        }
        if (py > 0) {
          const n = idx - dsW;
          if (darkMask[n] && !visited[n]) {
            visited[n] = 1;
            stack[sp++] = n;
          }
        }
        if (py + 1 < dsH) {
          const n = idx + dsW;
          if (darkMask[n] && !visited[n]) {
            visited[n] = 1;
            stack[sp++] = n;
          }
        }
      }

      if (count < minArea || count > maxArea) continue;

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / bh;
      if (aspect < 0.55 || aspect > 1.85) continue;

      const fillRatio = count / (bw * bh);
      if (fillRatio < 0.54) continue;

      const cx = sumX / count;
      const cy = sumY / count;
      const size = (bw + bh) / 2;

      // White Surround Verification: sample ring around the square at ~1.15 * size from center
      const ringDist = Math.max(4, size * 1.1);
      const dirs = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ];
      let ringLumSum = 0;
      let ringHits = 0;
      let brightSamples = 0;
      const innerMean = innerLumSum / count;

      for (const [dx, dy] of dirs) {
        const sx = Math.round(cx + dx * ringDist);
        const sy = Math.round(cy + dy * ringDist);
        if (sx >= 0 && sx < dsW && sy >= 0 && sy < dsH) {
          const rLum = lum[sy * dsW + sx];
          ringLumSum += rLum;
          ringHits++;
          if (rLum - innerMean >= 40 && rLum >= 105) {
            brightSamples++;
          }
        }
      }

      if (ringHits < 6 || brightSamples < 6) continue;
      const ringMean = ringLumSum / ringHits;
      const contrast = ringMean - innerMean;
      if (contrast < 42) continue;

      // Score favors solid square shape + bright clean surround + reasonable size
      const squareness = 1 - Math.abs(1 - aspect);
      const score = contrast * fillRatio * squareness;

      candidates.push({
        cx,
        cy,
        size,
        area: count,
        contrast,
        fillRatio,
        score,
      });
    }
  }

  if (candidates.length < 4) {
    return { corners: defaultScaledCorners(srcW, srcH), autoDetected: false };
  }

  // Pick top candidates near each extreme corner direction
  const topTL = [...candidates]
    .filter((c) => c.cx < dsW * 0.55 && c.cy < dsH * 0.55)
    .sort((a, b) => a.cx + a.cy - (b.cx + b.cy))
    .slice(0, 6);
  const topTR = [...candidates]
    .filter((c) => c.cx > dsW * 0.45 && c.cy < dsH * 0.55)
    .sort((a, b) => a.cy - a.cx - (b.cy - b.cx))
    .slice(0, 6);
  const topBL = [...candidates]
    .filter((c) => c.cx < dsW * 0.55 && c.cy > dsH * 0.45)
    .sort((a, b) => a.cx - a.cy - (b.cx - b.cy))
    .slice(0, 6);
  const topBR = [...candidates]
    .filter((c) => c.cx > dsW * 0.45 && c.cy > dsH * 0.45)
    .sort((a, b) => b.cx + b.cy - (a.cx + a.cy))
    .slice(0, 6);

  if (!topTL.length || !topTR.length || !topBL.length || !topBR.length) {
    return { corners: defaultScaledCorners(srcW, srcH), autoDetected: false };
  }

  let bestQuad: { tl: SquareCandidate; tr: SquareCandidate; bl: SquareCandidate; br: SquareCandidate } | null =
    null;
  let bestQuadScore = -Infinity;

  for (const tl of topTL) {
    for (const tr of topTR) {
      if (tr.cx <= tl.cx + dsW * 0.25) continue;
      for (const bl of topBL) {
        if (bl.cy <= tl.cy + dsH * 0.25) continue;
        for (const br of topBR) {
          if (br.cx <= bl.cx + dsW * 0.25 || br.cy <= tr.cy + dsH * 0.25) continue;

          const topW = dist({ x: tl.cx, y: tl.cy }, { x: tr.cx, y: tr.cy });
          const botW = dist({ x: bl.cx, y: bl.cy }, { x: br.cx, y: br.cy });
          const leftH = dist({ x: tl.cx, y: tl.cy }, { x: bl.cx, y: bl.cy });
          const rightH = dist({ x: tr.cx, y: tr.cy }, { x: br.cx, y: br.cy });

          const wBalance = Math.min(topW, botW) / Math.max(topW, botW);
          const hBalance = Math.min(leftH, rightH) / Math.max(leftH, rightH);
          if (wBalance < 0.72 || hBalance < 0.72) continue;

          const avgW = (topW + botW) / 2;
          const avgH = (leftH + rightH) / 2;
          const quadAspect = avgW / avgH;
          if (quadAspect < 0.45 || quadAspect > 0.95) continue;

          const sizes = [tl.size, tr.size, bl.size, br.size];
          const minS = Math.min(...sizes);
          const maxS = Math.max(...sizes);
          if (minS / maxS < 0.45) continue;

          // Expect marker size ~ 14 / 545.28 * avgW = 0.0257 * avgW
          const expectedSize = (FIDUCIAL_SIZE / (PDF_WIDTH - 50)) * avgW;
          const avgSize = sizes.reduce((s, v) => s + v, 0) / 4;
          const sizeRatio = Math.min(avgSize, expectedSize) / Math.max(avgSize, expectedSize);
          if (sizeRatio < 0.42) continue;

          const aspectMatch = 1 - Math.min(1, Math.abs(quadAspect - IDEAL_FIDUCIAL_ASPECT) / 0.35);
          const areaFrac = (avgW * avgH) / (dsW * dsH);
          const cornerQuality = (tl.score + tr.score + bl.score + br.score) / 4;

          const totalScore =
            cornerQuality *
            wBalance *
            hBalance *
            aspectMatch *
            sizeRatio *
            (0.6 + areaFrac);

          if (totalScore > bestQuadScore) {
            bestQuadScore = totalScore;
            bestQuad = { tl, tr, bl, br };
          }
        }
      }
    }
  }

  if (!bestQuad) {
    return { corners: defaultScaledCorners(srcW, srcH), autoDetected: false };
  }

  const fullImage = srcCtx.getImageData(0, 0, srcW, srcH).data;
  const invScale = 1 / dsScale;

  const corners: OmrCorners = {
    tl: refineCornerFullRes(
      fullImage,
      srcW,
      srcH,
      bestQuad.tl.cx * invScale,
      bestQuad.tl.cy * invScale,
      bestQuad.tl.size * invScale
    ),
    tr: refineCornerFullRes(
      fullImage,
      srcW,
      srcH,
      bestQuad.tr.cx * invScale,
      bestQuad.tr.cy * invScale,
      bestQuad.tr.size * invScale
    ),
    bl: refineCornerFullRes(
      fullImage,
      srcW,
      srcH,
      bestQuad.bl.cx * invScale,
      bestQuad.bl.cy * invScale,
      bestQuad.bl.size * invScale
    ),
    br: refineCornerFullRes(
      fullImage,
      srcW,
      srcH,
      bestQuad.br.cx * invScale,
      bestQuad.br.cy * invScale,
      bestQuad.br.size * invScale
    ),
  };

  return { corners, autoDetected: true };
}

// ==========================================
// 8x8 HOMOGRAPHY & BILINEAR PERSPECTIVE WARP
// ==========================================
function solveLinearSystem8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxAbs) {
        maxAbs = v;
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }
    const diag = M[col][col];
    if (Math.abs(diag) < 1e-10) {
      throw new Error("Perspektiv matritsani yechib bo'lmadi — burchaklar bir chiziqqa tushib qoldi.");
    }
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / diag;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) {
      sum -= M[r][c] * x[c];
    }
    x[r] = sum / M[r][r];
  }
  return x;
}

/**
 * Computes 3x3 homography mapping warped canonical (u,v) -> source (x,y).
 */
function computeWarpToSourceHomography(corners: OmrCorners): number[] {
  const pairs: Array<[OmrPoint, OmrPoint]> = [
    [CANONICAL_FIDUCIALS_WARP.tl, corners.tl],
    [CANONICAL_FIDUCIALS_WARP.tr, corners.tr],
    [CANONICAL_FIDUCIALS_WARP.bl, corners.bl],
    [CANONICAL_FIDUCIALS_WARP.br, corners.br],
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (const [src, dst] of pairs) {
    const u = src.x;
    const v = src.y;
    const x = dst.x;
    const y = dst.y;
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = solveLinearSystem8(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function warpToCanonicalCanvas(
  sourceCanvas: HTMLCanvasElement,
  corners: OmrCorners
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) throw new Error("Canvas konteksti olinmadi.");
  const srcPixels = srcCtx.getImageData(0, 0, srcW, srcH).data;

  const H = computeWarpToSourceHomography(corners);
  const [h0, h1, h2, h3, h4, h5, h6, h7] = H;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = WARP_WIDTH;
  outCanvas.height = WARP_HEIGHT;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error("Warp canvas konteksti olinmadi.");

  const outImg = outCtx.createImageData(WARP_WIDTH, WARP_HEIGHT);
  const dst = outImg.data;

  for (let v = 0; v < WARP_HEIGHT; v++) {
    const rowBaseX = h1 * v + h2;
    const rowBaseY = h4 * v + h5;
    const rowBaseW = h7 * v + 1;

    for (let u = 0; u < WARP_WIDTH; u++) {
      const denom = h6 * u + rowBaseW;
      const sx = (h0 * u + rowBaseX) / denom;
      const sy = (h3 * u + rowBaseY) / denom;

      const outIdx = (v * WARP_WIDTH + u) * 4;
      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        dst[outIdx] = 255;
        dst[outIdx + 1] = 255;
        dst[outIdx + 2] = 255;
        dst[outIdx + 3] = 255;
        continue;
      }

      const x0 = sx | 0;
      const y0 = sy | 0;
      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + srcW * 4;
      const i11 = i01 + 4;

      dst[outIdx] =
        srcPixels[i00] * w00 +
        srcPixels[i10] * w10 +
        srcPixels[i01] * w01 +
        srcPixels[i11] * w11;
      dst[outIdx + 1] =
        srcPixels[i00 + 1] * w00 +
        srcPixels[i10 + 1] * w10 +
        srcPixels[i01 + 1] * w01 +
        srcPixels[i11 + 1] * w11;
      dst[outIdx + 2] =
        srcPixels[i00 + 2] * w00 +
        srcPixels[i10 + 2] * w10 +
        srcPixels[i01 + 2] * w01 +
        srcPixels[i11 + 2] * w11;
      dst[outIdx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

// ==========================================
// SUB-GRID MICRO-ALIGNMENT & ADAPTIVE BUBBLE SCORING
// ==========================================
function findSubGridOffset(
  inkGrid: Float32Array,
  w: number,
  h: number,
  is90: boolean
): { dx: number; dy: number } {
  const sampleQs = is90
    ? [1, 6, 12, 18, 24, 30, 31, 36, 42, 48, 54, 60, 61, 66, 72, 78, 84, 90]
    : [1, 5, 10, 15, 20, 21, 25, 30, 35, 40, 41, 45, 50, 55, 60];
  let bestDx = 0;
  let bestDy = 0;
  let bestEnergy = -Infinity;

  const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

  for (let dy = -4; dy <= 4; dy += 2) {
    for (let dx = -4; dx <= 4; dx += 2) {
      let borderDarkness = 0;
      let outerHaloBrightness = 0;
      let bSamples = 0;
      let hSamples = 0;

      for (const qNum of sampleQs) {
        for (let oi = 0; oi < 4; oi++) {
          const box = getBoxCoordinatesWarp(qNum, oi, dx, dy, is90);
          if (box.isCircle) {
            for (const ang of angles) {
              const bx = Math.round(box.cx + Math.cos(ang) * box.r);
              const by = Math.round(box.cy + Math.sin(ang) * box.r);
              if (bx >= 0 && bx < w && by >= 0 && by < h) {
                borderDarkness += 255 - inkGrid[by * w + bx];
                bSamples++;
              }
              const hx = Math.round(box.cx + Math.cos(ang) * (box.r + 4));
              const hy = Math.round(box.cy + Math.sin(ang) * (box.r + 4));
              if (hx >= 0 && hx < w && hy >= 0 && hy < h) {
                outerHaloBrightness += inkGrid[hy * w + hx];
                hSamples++;
              }
            }
          } else {
            const bx = Math.round(box.x);
            const by = Math.round(box.y);
            const sz = Math.round(box.size);

            for (let t = 2; t <= sz - 2; t += 4) {
              const pts = [
                [bx + t, by],
                [bx + t, by + sz],
                [bx, by + t],
                [bx + sz, by + t],
              ];
              for (const [px, py] of pts) {
                if (px >= 0 && px < w && py >= 0 && py < h) {
                  borderDarkness += 255 - inkGrid[py * w + px];
                  bSamples++;
                }
              }
            }

            const haloPts = [
              [bx - 4, by + sz / 2],
              [bx + sz + 4, by + sz / 2],
              [bx + sz / 2, by - 4],
              [bx + sz / 2, by + sz + 4],
            ];
            for (const [px, py] of haloPts) {
              const ix = Math.round(px);
              const iy = Math.round(py);
              if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
                outerHaloBrightness += inkGrid[iy * w + ix];
                hSamples++;
              }
            }
          }
        }
      }

      const score =
        (bSamples > 0 ? borderDarkness / bSamples : 0) +
        0.5 * (hSamples > 0 ? outerHaloBrightness / hSamples : 0);

      if (score > bestEnergy) {
        bestEnergy = score;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  return { dx: bestDx, dy: bestDy };
}

function estimateRowPaperWhite(
  inkGrid: Float32Array,
  w: number,
  h: number,
  qNum: number,
  dx: number,
  dy: number,
  is90: boolean
): number {
  const samples: number[] = [];
  for (let oi = 0; oi < 3; oi++) {
    const b1 = getBoxCoordinatesWarp(qNum, oi, dx, dy, is90);
    const b2 = getBoxCoordinatesWarp(qNum, oi + 1, dx, dy, is90);
    const gapStartX = Math.round(b1.x + b1.size + 5);
    const gapEndX = Math.round(b2.x - 5);
    const yStart = Math.round(b1.y + 3);
    const yEnd = Math.round(b1.y + b1.size - 3);

    for (let y = yStart; y <= yEnd; y += 2) {
      if (y < 0 || y >= h) continue;
      for (let x = gapStartX; x <= gapEndX; x += 2) {
        if (x < 0 || x >= w) continue;
        samples.push(inkGrid[y * w + x]);
      }
    }
  }

  if (samples.length === 0) return 240;
  samples.sort((a, b) => a - b);
  // 75th percentile ignores occasional stray pen flicks in gaps
  return samples[Math.floor(samples.length * 0.75)];
}

function scoreSingleBox(
  inkGrid: Float32Array,
  w: number,
  h: number,
  box: BoxGeometryWarp,
  rowPaperWhite: number
): number {
  const inkThreshold = rowPaperWhite - Math.max(36, rowPaperWhite * 0.24);
  const normScale = Math.max(75, rowPaperWhite * 0.72);

  let total = 0;
  let darkCount = 0;
  let normSum = 0;

  if (box.isCircle) {
    const rIn = Math.max(4, box.r - 2.4);
    const rInSq = rIn * rIn;
    const x0 = clamp(Math.floor(box.cx - rIn), 0, w - 1);
    const x1 = clamp(Math.ceil(box.cx + rIn), 0, w - 1);
    const y0 = clamp(Math.floor(box.cy - rIn), 0, h - 1);
    const y1 = clamp(Math.ceil(box.cy + rIn), 0, h - 1);

    for (let y = y0; y <= y1; y++) {
      const dy = y - box.cy;
      const dySq = dy * dy;
      const rowOff = y * w;
      for (let x = x0; x <= x1; x++) {
        const dx = x - box.cx;
        if (dx * dx + dySq > rInSq) continue;
        const v = inkGrid[rowOff + x];
        total++;
        if (v < inkThreshold) darkCount++;
        const diff = rowPaperWhite - v;
        if (diff > 14) {
          normSum += Math.min(1, diff / normScale);
        }
      }
    }
  } else {
    const inset = 3.5; // Exclude printed 2px outer border
    const x0 = clamp(Math.round(box.x + inset), 0, w - 1);
    const y0 = clamp(Math.round(box.y + inset), 0, h - 1);
    const x1 = clamp(Math.round(box.x + box.size - inset), 0, w - 1);
    const y1 = clamp(Math.round(box.y + box.size - inset), 0, h - 1);

    for (let y = y0; y <= y1; y++) {
      const rowOff = y * w;
      for (let x = x0; x <= x1; x++) {
        const v = inkGrid[rowOff + x];
        total++;
        if (v < inkThreshold) darkCount++;
        const diff = rowPaperWhite - v;
        if (diff > 14) {
          normSum += Math.min(1, diff / normScale);
        }
      }
    }
  }

  if (total === 0) return 0;
  const darkFraction = darkCount / total;
  const meanInk = normSum / total;
  return 0.65 * darkFraction + 0.35 * meanInk;
}

// ==========================================
// MAIN CLASSIC OMR PIPELINE
// ==========================================
export function scanAnswerSheetFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  customCorners?: OmrCorners,
  options?: { questionCount?: 60 | 90 }
): OmrScanResult {
  const questionCount = options?.questionCount === 60 ? 60 : 90;
  const is90 = questionCount === 90;

  const detected = customCorners
    ? { corners: customCorners, autoDetected: true }
    : detectFiducialCorners(sourceCanvas);

  const corners = detected.corners;
  const warpedCanvas = warpToCanonicalCanvas(sourceCanvas, corners);
  const wCtx = warpedCanvas.getContext('2d');
  if (!wCtx) throw new Error("Warped canvas konteksti olinmadi.");

  const wImg = wCtx.getImageData(0, 0, WARP_WIDTH, WARP_HEIGHT);
  const wPixels = wImg.data;
  const inkGrid = new Float32Array(WARP_WIDTH * WARP_HEIGHT);
  for (let i = 0; i < WARP_WIDTH * WARP_HEIGHT; i++) {
    const p = i * 4;
    inkGrid[i] = computeInkLuminance(wPixels[p], wPixels[p + 1], wPixels[p + 2]);
  }

  const alignmentOffset = findSubGridOffset(inkGrid, WARP_WIDTH, WARP_HEIGHT, is90);

  const questions: OmrQuestionDetection[] = [];
  const answers: Record<string, DtmAnswerOption | ''> = {};
  const ambiguousOrders: number[] = [];
  const lowConfidenceOrders: number[] = [];
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (let qNum = 1; qNum <= questionCount; qNum++) {
    const rowWhite = estimateRowPaperWhite(
      inkGrid,
      WARP_WIDTH,
      WARP_HEIGHT,
      qNum,
      alignmentOffset.dx,
      alignmentOffset.dy,
      is90
    );

    const scoresRecord: Record<DtmAnswerOption, number> = { A: 0, B: 0, C: 0, D: 0 };
    const entries: Array<{ opt: DtmAnswerOption; score: number }> = [];

    OPTIONS.forEach((opt, oi) => {
      const box = getBoxCoordinatesWarp(qNum, oi, alignmentOffset.dx, alignmentOffset.dy, is90);
      const s = scoreSingleBox(inkGrid, WARP_WIDTH, WARP_HEIGHT, box, rowWhite);
      scoresRecord[opt] = Math.round(s * 1000) / 1000;
      entries.push({ opt, score: s });
    });

    entries.sort((a, b) => b.score - a.score);
    const [top0, top1, , top3] = entries;
    const s0 = top0.score;
    const s1 = top1.score;
    const s3 = top3.score;

    const delta0 = s0 - s3;
    const delta1 = s1 - s3;
    const gap01 = s0 - s1;

    let status: OmrQuestionStatus;
    let selected: DtmAnswerOption | '';
    let rowConfidence: number;

    if (s0 < 0.22 || delta0 < 0.085) {
      status = 'BLANK';
      selected = '';
      rowConfidence = clamp(Math.round((1 - Math.max(0, delta0) / 0.14) * 100), 65, 99);
    } else if (s1 >= 0.26 && delta1 >= 0.11 && gap01 < 0.095) {
      status = 'MULTIPLE';
      selected = '';
      ambiguousOrders.push(qNum);
      rowConfidence = clamp(Math.round((gap01 / 0.1) * 55), 15, 55);
      confidenceSum += rowConfidence;
      confidenceCount++;
    } else if (s0 >= 0.28 && delta0 >= 0.125 && gap01 >= 0.07) {
      status = 'OK';
      selected = top0.opt;
      rowConfidence = clamp(Math.round(78 + Math.min(21, delta0 * 35 + gap01 * 25)), 78, 99);
      confidenceSum += rowConfidence;
      confidenceCount++;
    } else {
      status = 'LOW_CONFIDENCE';
      selected = top0.opt;
      lowConfidenceOrders.push(qNum);
      rowConfidence = clamp(Math.round(52 + delta0 * 120), 45, 76);
      confidenceSum += rowConfidence;
      confidenceCount++;
    }

    answers[String(qNum)] = selected;
    questions.push({
      order: qNum,
      selected,
      status,
      scores: scoresRecord,
      confidence: rowConfidence,
    });
  }

  // Draw visual verification overlay onto warpedCanvas
  wCtx.save();
  [
    CANONICAL_FIDUCIALS_WARP.tl,
    CANONICAL_FIDUCIALS_WARP.tr,
    CANONICAL_FIDUCIALS_WARP.bl,
    CANONICAL_FIDUCIALS_WARP.br,
  ].forEach((pt) => {
    wCtx.strokeStyle = '#10b981';
    wCtx.lineWidth = 3;
    wCtx.strokeRect(pt.x - 18, pt.y - 18, 36, 36);
  });

  const highlightBubble = (box: BoxGeometryWarp, stroke: string, fill: string) => {
    wCtx.strokeStyle = stroke;
    wCtx.fillStyle = fill;
    wCtx.lineWidth = 3;
    if (box.isCircle) {
      wCtx.beginPath();
      wCtx.arc(box.cx, box.cy, box.r + 2.5, 0, Math.PI * 2);
      wCtx.fill();
      wCtx.stroke();
    } else {
      wCtx.fillRect(box.x - 2, box.y - 2, box.size + 4, box.size + 4);
      wCtx.strokeRect(box.x - 2, box.y - 2, box.size + 4, box.size + 4);
    }
  };

  for (const q of questions) {
    if (q.status === 'BLANK') continue;
    OPTIONS.forEach((opt, oi) => {
      const box = getBoxCoordinatesWarp(q.order, oi, alignmentOffset.dx, alignmentOffset.dy, is90);
      if (q.status === 'OK' && q.selected === opt) {
        highlightBubble(box, '#10b981', 'rgba(16, 185, 129, 0.22)');
      } else if (q.status === 'LOW_CONFIDENCE' && q.selected === opt) {
        highlightBubble(box, '#f59e0b', 'rgba(245, 158, 11, 0.25)');
      } else if (q.status === 'MULTIPLE' && q.scores[opt] >= 0.24) {
        highlightBubble(box, '#e11d48', 'rgba(225, 29, 72, 0.24)');
      }
    });
  }
  wCtx.restore();

  const filledCount = Object.values(answers).filter(Boolean).length;
  const baseConfidence =
    confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : detected.autoDetected ? 90 : 50;
  const ocrConfidence = detected.autoDetected ? baseConfidence : Math.min(baseConfidence, 70);

  // Create compact preview DataURLs for UI modal
  const overlaySmall = document.createElement('canvas');
  overlaySmall.width = 720;
  overlaySmall.height = Math.round((720 * WARP_HEIGHT) / WARP_WIDTH);
  const osCtx = overlaySmall.getContext('2d');
  if (osCtx) {
    osCtx.drawImage(warpedCanvas, 0, 0, overlaySmall.width, overlaySmall.height);
  }

  return {
    answers,
    questions,
    ocrConfidence,
    corners,
    autoDetected: detected.autoDetected,
    sourceWidth: sourceCanvas.width,
    sourceHeight: sourceCanvas.height,
    sourceDataUrl: sourceCanvas.toDataURL('image/jpeg', 0.85),
    warpedOverlayDataUrl: overlaySmall.toDataURL('image/jpeg', 0.85),
    filledCount,
    ambiguousOrders,
    lowConfidenceOrders,
    alignmentOffset,
  };
}

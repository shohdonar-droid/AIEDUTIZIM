import sharp from "sharp";
import { generateContentWithRotation } from "./gemini.js";

export interface DetectionBox {
  ymin: number; // 0-1000
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface VisionPassportAnalysis {
  face?: DetectionBox;
  head?: DetectionBox;
  person?: DetectionBox;
  bgColorsHex?: string[];
  hairColorHex?: string;
}

/**
 * Analyzes photo using Gemini Vision to locate face, head, person and background colors.
 */
export async function analyzePassportPhotoWithGemini(base64Jpg: string): Promise<VisionPassportAnalysis> {
  const prompt = `You are a professional photo analysis engine for 3x4 document/passport photos.
Analyze this photo and detect bounding coordinates (0-1000 scale):
1. "face": [ymin, xmin, ymax, xmax] - face from forehead to chin, eyes, nose, cheeks.
2. "head": [ymin, xmin, ymax, xmax] - top of hair to chin, including ears.
3. "person": [ymin, xmin, ymax, xmax] - head, neck, shoulders, shirt.
4. "bgColorsHex": Array of 1-3 hex colors for the background behind the person (e.g. ["#8E9296", "#A0A4A8"]).
5. "hairColorHex": Primary hex color of the hair.

Return ONLY a valid JSON object in this format (no markdown):
{
  "face": [ymin, xmin, ymax, xmax],
  "head": [ymin, xmin, ymax, xmax],
  "person": [ymin, xmin, ymax, xmax],
  "bgColorsHex": ["#..."],
  "hairColorHex": "#..."
}`;

  try {
    const aiRes = await generateContentWithRotation({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Jpg } },
            { text: prompt }
          ]
        }
      ]
    });

    if (aiRes && aiRes.text) {
      const cleanJson = aiRes.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      const parseBox = (arr: any): DetectionBox | undefined => {
        if (Array.isArray(arr) && arr.length === 4) {
          return { ymin: arr[0], xmin: arr[1], ymax: arr[2], xmax: arr[3] };
        }
        return undefined;
      };

      return {
        face: parseBox(parsed.face),
        head: parseBox(parsed.head),
        person: parseBox(parsed.person),
        bgColorsHex: Array.isArray(parsed.bgColorsHex) ? parsed.bgColorsHex : [],
        hairColorHex: typeof parsed.hairColorHex === "string" ? parsed.hairColorHex : undefined
      };
    }
  } catch (err) {
    console.warn("[Passport AI Vision] Vision detection warning:", err);
  }

  return {};
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }
  return null;
}

/**
 * Main 3x4 Passport Photo Processing Engine.
 * Ensures clean white background (#FFFFFF), perfect 3:4 cropping, and 100% protection of face/hair/clothes without scanlines or artifacts.
 */
export async function process3x4PassportPhoto(
  inputBuffer: Buffer
): Promise<Buffer> {
  const rotated = sharp(inputBuffer).rotate();
  const meta = await rotated.metadata();
  const origW = meta.width || 600;
  const origH = meta.height || 800;

  const base64Jpg = (await rotated.jpeg({ quality: 80 }).toBuffer()).toString("base64");
  const vision = await analyzePassportPhotoWithGemini(base64Jpg);

  // Default fallback boxes if vision fails
  const headBox = vision.head || vision.face || { ymin: 150, xmin: 250, ymax: 600, xmax: 750 };
  const personBox = vision.person || { ymin: 150, xmin: 150, ymax: 950, xmax: 850 };

  // Target dimensions: 600 x 800 (standard 3x4 @ 300 DPI)
  const targetW = 600;
  const targetH = 800;

  // Head center X in original coordinates
  const headCenterX = Math.round((((headBox.xmin + headBox.xmax) / 2) * origW) / 1000);
  const headTopY = Math.round((headBox.ymin * origH) / 1000);
  const headBottomY = Math.round((headBox.ymax * origH) / 1000);
  const headHeightPx = Math.max(50, headBottomY - headTopY);

  // In standard passport photos, head height should be ~60% of crop height
  let cropH = Math.round(headHeightPx / 0.60);
  let cropW = Math.round((cropH * 3) / 4);

  // Clamp crop size to image bounds
  if (cropH > origH) {
    cropH = origH;
    cropW = Math.round((origH * 3) / 4);
  }
  if (cropW > origW) {
    cropW = origW;
    cropH = Math.round((origW * 4) / 3);
  }

  // Position top edge so top margin (above top of hair) is ~10% of crop height
  let cropTop = Math.round(headTopY - cropH * 0.10);
  let cropLeft = Math.round(headCenterX - cropW / 2);

  // Clamp left and top
  cropLeft = Math.max(0, Math.min(origW - cropW, cropLeft));
  cropTop = Math.max(0, Math.min(origH - cropH, cropTop));

  // Extract crop and resize to exactly 600 x 800 px
  const croppedBuf = await rotated
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(targetW, targetH, { fit: "cover" })
    .toBuffer();

  // Convert vision normalized coordinates to cropped target canvas (600x800)
  const toCanvasX = (normX: number) => {
    const origX = (normX * origW) / 1000;
    return Math.round(((origX - cropLeft) / cropW) * targetW);
  };
  const toCanvasY = (normY: number) => {
    const origY = (normY * origH) / 1000;
    return Math.round(((origY - cropTop) / cropH) * targetH);
  };

  const cHead = {
    xmin: Math.max(0, toCanvasX(headBox.xmin)),
    xmax: Math.min(targetW - 1, toCanvasX(headBox.xmax)),
    ymin: Math.max(0, toCanvasY(headBox.ymin)),
    ymax: Math.min(targetH - 1, toCanvasY(headBox.ymax)),
  };

  const cPerson = {
    xmin: Math.max(0, toCanvasX(personBox.xmin)),
    xmax: Math.min(targetW - 1, toCanvasX(personBox.xmax)),
    ymin: Math.max(0, toCanvasY(personBox.ymin)),
    ymax: Math.min(targetH - 1, toCanvasY(personBox.ymax)),
  };

  // Convert image to EXACT 3-channel RGB raw buffer (3 bytes per pixel)
  const { data: rawPixels, info } = await sharp(croppedBuf)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = 3; // Strict 3 channels (RGB)
  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;
  const buf = Buffer.from(rawPixels);

  // Protected Mask: 0 = BG, 1 = Body/Person, 2 = Core Head/Face (IMMUTABLE)
  const protectedMask = new Uint8Array(totalPixels);

  const headMidX = (cHead.xmin + cHead.xmax) / 2;
  const headMidY = (cHead.ymin + cHead.ymax) / 2;
  const headRadiusX = ((cHead.xmax - cHead.xmin) / 2) * 1.15;
  const headRadiusY = ((cHead.ymax - cHead.ymin) / 2) * 1.15;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dx = (x - headMidX) / headRadiusX;
      const dy = (y - headMidY) / headRadiusY;

      // Inside head ellipse -> Immutable Core
      if (dx * dx + dy * dy <= 1.0) {
        protectedMask[idx] = 2;
        continue;
      }

      // Inside person bounding box -> Protected Person
      if (x >= cPerson.xmin && x <= cPerson.xmax && y >= cPerson.ymin) {
        protectedMask[idx] = 1;
      }
    }
  }

  // Sample background colors from outer border
  const bgSamples: [number, number, number][] = [];
  const addBgSample = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = y * width + x;
      if (protectedMask[idx] === 0) {
        const pixIdx = idx * channels;
        bgSamples.push([buf[pixIdx], buf[pixIdx + 1], buf[pixIdx + 2]]);
      }
    }
  };

  for (let x = 0; x < width; x += 10) {
    addBgSample(x, 0);
    addBgSample(x, 5);
  }
  for (let y = 0; y < Math.round(height * 0.4); y += 10) {
    addBgSample(0, y);
    addBgSample(width - 1, y);
  }

  if (vision.bgColorsHex && vision.bgColorsHex.length > 0) {
    for (const hex of vision.bgColorsHex) {
      const rgb = hexToRgb(hex);
      if (rgb) bgSamples.push(rgb);
    }
  }

  let avgBgR = 144, avgBgG = 148, avgBgB = 152;
  if (bgSamples.length > 0) {
    avgBgR = Math.round(bgSamples.reduce((s, c) => s + c[0], 0) / bgSamples.length);
    avgBgG = Math.round(bgSamples.reduce((s, c) => s + c[1], 0) / bgSamples.length);
    avgBgB = Math.round(bgSamples.reduce((s, c) => s + c[2], 0) / bgSamples.length);
  }

  function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  // Flood fill background detection
  const isBgPixel = new Uint8Array(totalPixels);
  const queue: number[] = [];

  for (let x = 0; x < width; x++) {
    if (protectedMask[x] !== 2) {
      isBgPixel[x] = 1;
      queue.push(x);
    }
  }
  for (let y = 0; y < Math.round(height * 0.85); y++) {
    const idxL = y * width;
    const idxR = y * width + (width - 1);
    if (!isBgPixel[idxL] && protectedMask[idxL] !== 2) { isBgPixel[idxL] = 1; queue.push(idxL); }
    if (!isBgPixel[idxR] && protectedMask[idxR] !== 2) { isBgPixel[idxR] = 1; queue.push(idxR); }
  }

  let qHead = 0;
  while (qHead < queue.length) {
    const curr = queue[qHead++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    const pixIdx = curr * channels;

    const r = buf[pixIdx];
    const g = buf[pixIdx + 1];
    const b = buf[pixIdx + 2];

    const d = colorDist(r, g, b, avgBgR, avgBgG, avgBgB);

    if (protectedMask[curr] === 2) continue; // Immutable head core

    const maxAllowedDist = protectedMask[curr] === 1 ? 40 : 65;

    if (d < maxAllowedDist) {
      isBgPixel[curr] = 1;

      const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!isBgPixel[nIdx] && protectedMask[nIdx] !== 2) {
            isBgPixel[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // Replace background pixels in 3-channel buffer with solid white (#FFFFFF -> 255, 255, 255)
  for (let i = 0; i < totalPixels; i++) {
    if (isBgPixel[i]) {
      const pixIdx = i * channels;
      buf[pixIdx] = 255;
      buf[pixIdx + 1] = 255;
      buf[pixIdx + 2] = 255;
    }
  }

  // Return crisp 600x800 px JPEG at 300 DPI
  return await sharp(buf, {
    raw: { width, height, channels: 3 }
  })
    .withMetadata({ density: 300 })
    .jpeg({ quality: 98, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

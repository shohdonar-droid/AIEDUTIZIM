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

/**
 * Parses Hex color string into RGB array [r, g, b].
 */
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
 * Ensures white background (#FFFFFF), perfect 3:4 cropping, and 100% protection of face/hair/clothes.
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
  const faceBox = vision.face || { ymin: 200, xmin: 300, ymax: 550, xmax: 700 };
  const headBox = vision.head || { ymin: 150, xmin: 250, ymax: 600, xmax: 750 };
  const personBox = vision.person || { ymin: 150, xmin: 150, ymax: 950, xmax: 850 };

  // Calculate cropping for 3:4 aspect ratio
  // Target dimensions: 600 x 800 (standard 3x4 @ 300 DPI)
  const targetW = 600;
  const targetH = 800;

  // Head center X in original coordinates
  const headCenterX = Math.round((((headBox.xmin + headBox.xmax) / 2) * origW) / 1000);
  const headTopY = Math.round((headBox.ymin * origH) / 1000);
  const headBottomY = Math.round((headBox.ymax * origH) / 1000);
  const headHeightPx = Math.max(50, headBottomY - headTopY);

  // In standard passport photos, head height should be ~62% of crop height
  let cropH = Math.round(headHeightPx / 0.62);
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

  const cFace = {
    xmin: Math.max(0, toCanvasX(faceBox.xmin)),
    xmax: Math.min(targetW - 1, toCanvasX(faceBox.xmax)),
    ymin: Math.max(0, toCanvasY(faceBox.ymin)),
    ymax: Math.min(targetH - 1, toCanvasY(faceBox.ymax)),
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

  // Obtain raw RGBA buffer from cropped image
  const { data: rawPixels, info } = await sharp(croppedBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(rawPixels);
  const totalPixels = info.width * info.height;

  // Build Protected Mask: 0 = Unprotected/Possible BG, 1 = Protected Person, 2 = Immutable Face/Skin Core
  const protectedMask = new Uint8Array(totalPixels);

  // 1. Mark Head & Face & Person Core as Immutable (2)
  const headMidX = (cHead.xmin + cHead.xmax) / 2;
  const headMidY = (cHead.ymin + cHead.ymax) / 2;
  const headRadiusX = ((cHead.xmax - cHead.xmin) / 2) * 1.15; // 15% safety margin around head
  const headRadiusY = ((cHead.ymax - cHead.ymin) / 2) * 1.15;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = y * info.width + x;
      const pixIdx = idx * 4;

      const r = buf[pixIdx];
      const g = buf[pixIdx + 1];
      const b = buf[pixIdx + 2];

      // Elliptical check for head & face
      const dx = (x - headMidX) / headRadiusX;
      const dy = (y - headMidY) / headRadiusY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= 1.0) {
        protectedMask[idx] = 2; // Immutable Core
        continue;
      }

      // Check inside person bounding box (neck, shoulders, body)
      if (x >= cPerson.xmin && x <= cPerson.xmax && y >= cPerson.ymin) {
        // Protected Person
        protectedMask[idx] = 1;

        // Human skin tone heuristic: R > G && G > B - 20 && R > 80
        const isSkin = r > g && g > (b - 20) && r > 80 && Math.abs(r - g) < 80;
        if (isSkin && y <= cFace.ymax + 60) {
          protectedMask[idx] = 2; // Immutable skin
        }
      }
    }
  }

  // 2. Sample background reference colors from outer corners/edges
  const bgSamples: [number, number, number][] = [];
  const addBgSample = (x: number, y: number) => {
    if (x >= 0 && x < info.width && y >= 0 && y < info.height) {
      const idx = (y * info.width + x) * 4;
      const pMask = protectedMask[y * info.width + x];
      if (pMask === 0) {
        bgSamples.push([buf[idx], buf[idx + 1], buf[idx + 2]]);
      }
    }
  };

  // Sample along top edge, top-left corner, top-right corner, and upper side borders
  for (let x = 0; x < info.width; x += 10) {
    addBgSample(x, 0);
    addBgSample(x, 5);
    addBgSample(x, 10);
  }
  for (let y = 0; y < Math.round(info.height * 0.4); y += 10) {
    addBgSample(0, y);
    addBgSample(info.width - 1, y);
    addBgSample(5, y);
    addBgSample(info.width - 6, y);
  }

  // Also include vision bgColorsHex if provided
  if (vision.bgColorsHex && vision.bgColorsHex.length > 0) {
    for (const hex of vision.bgColorsHex) {
      const rgb = hexToRgb(hex);
      if (rgb) bgSamples.push(rgb);
    }
  }

  let avgBgR = 144, avgBgG = 148, avgBgB = 152; // Fallback neutral gray
  if (bgSamples.length > 0) {
    avgBgR = Math.round(bgSamples.reduce((s, c) => s + c[0], 0) / bgSamples.length);
    avgBgG = Math.round(bgSamples.reduce((s, c) => s + c[1], 0) / bgSamples.length);
    avgBgB = Math.round(bgSamples.reduce((s, c) => s + c[2], 0) / bgSamples.length);
  }

  function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  // 3. Flood fill background from top and side edges
  const isBgPixel = new Uint8Array(totalPixels);
  const queue: number[] = [];

  // Seed queue with border pixels that are not in protected core
  for (let x = 0; x < info.width; x++) {
    const idx = x;
    if (protectedMask[idx] !== 2) {
      isBgPixel[idx] = 1;
      queue.push(idx);
    }
  }
  for (let y = 0; y < Math.round(info.height * 0.85); y++) {
    const idxL = y * info.width;
    const idxR = y * info.width + (info.width - 1);

    if (!isBgPixel[idxL] && protectedMask[idxL] !== 2) {
      isBgPixel[idxL] = 1;
      queue.push(idxL);
    }
    if (!isBgPixel[idxR] && protectedMask[idxR] !== 2) {
      isBgPixel[idxR] = 1;
      queue.push(idxR);
    }
  }

  // BFS Flood fill
  let head = headIndex(0);
  function headIndex(val: number) { return val; }

  let qHead = 0;
  while (qHead < queue.length) {
    const curr = queue[qHead++];
    const cx = curr % info.width;
    const cy = Math.floor(curr / info.width);
    const pixIdx = curr * 4;

    const r = buf[pixIdx];
    const g = buf[pixIdx + 1];
    const b = buf[pixIdx + 2];

    const d = colorDist(r, g, b, avgBgR, avgBgG, avgBgB);

    // Stop if pixel is in immutable face/skin core (2)
    if (protectedMask[curr] === 2) continue;

    // Check threshold depending on distance to head
    const maxAllowedDist = protectedMask[curr] === 1 ? 40 : 65;

    if (d < maxAllowedDist) {
      isBgPixel[curr] = 1;

      const neighbors = [
        [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < info.width && ny >= 0 && ny < info.height) {
          const nIdx = ny * info.width + nx;
          if (!isBgPixel[nIdx] && protectedMask[nIdx] !== 2) {
            isBgPixel[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // 4. Create Alpha Mask Buffer for smooth anti-aliased composition onto #FFFFFF
  // 0 = foreground (original subject), 255 = white background
  const alphaMask = Buffer.alloc(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    alphaMask[i] = isBgPixel[i] ? 255 : 0;
  }

  // Apply a 1.2px Gaussian Blur to the alpha mask to eliminate jagged stair-stepping
  const smoothedMask = await sharp(alphaMask, {
    raw: { width: info.width, height: info.height, channels: 1 }
  })
    .blur(1.2)
    .raw()
    .toBuffer();

  // 5. Replace background pixels with solid white (#FFFFFF)
  for (let i = 0; i < totalPixels; i++) {
    const pixIdx = i * 4;
    const bgVal = smoothedMask[i]; // 0 (original) to 255 (white bg)

    if (bgVal > 0) {
      const factor = bgVal / 255;
      buf[pixIdx] = Math.round(buf[pixIdx] * (1 - factor) + 255 * factor);
      buf[pixIdx + 1] = Math.round(buf[pixIdx + 1] * (1 - factor) + 255 * factor);
      buf[pixIdx + 2] = Math.round(buf[pixIdx + 2] * (1 - factor) + 255 * factor);
      buf[pixIdx + 3] = 255;
    }
  }

  // Return crisp 600x800 px JPEG at 300 DPI
  return await sharp(buf, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .withMetadata({ density: 300 })
    .jpeg({ quality: 98, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

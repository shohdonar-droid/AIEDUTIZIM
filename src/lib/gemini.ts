import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfigRaw from "../../firebase-applet-config.json";
import { initializeFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Cache for valid Gemini API keys
let keysCache: string[] = [];
let badKeys = new Set<string>(); // Keep track of keys that gave 401
let currentKeyIndex = 0;
let hasSyncedWithFirestore = false;

/**
 * Helper to wrap a promise with a timeout so it never hangs indefinitely.
 */
function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Gemini Sync] Firestore operation timed out after ${timeoutMs}ms.`);
      resolve(fallbackValue);
    }, timeoutMs);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }).catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    }),
    timeoutPromise
  ]);
}

/**
 * Robust background synchronization of Gemini keys with Firestore database.
 */
export async function syncGeminiKeysWithFirestore(): Promise<void> {
  // DISABLING FIRESTORE SYNC: Force local environment variables for better reliability
  // and to avoid corrupt pools or slow Firestore operations causing timeouts.
  hasSyncedWithFirestore = true;
  const localKeys = getGeminiKeysPool();
  if (localKeys.length > 0) {
    keysCache = localKeys;
  }
}

export function getGeminiKeysPool(): string[] {
  if (keysCache.length > 0) return keysCache;
  const keys = new Set<string>();
  const sources: string[] = [];
  
  if (process.env.GEMINI_API_KEYS) {
    sources.push("GEMINI_API_KEYS");
    process.env.GEMINI_API_KEYS.split(/[,,;]/).forEach(k => {
      const tk = k.trim();
      if (tk.length > 5) keys.add(tk);
    });
  }
  Object.keys(process.env).forEach(v => {
    if (v.includes("GEMINI_API_KEY") || v.includes("GOOGLE_GENAI_API_KEY") || v === "VITE_API_KEY" || v === "GOOGLE_API_KEY") {
      const val = process.env[v]?.trim();
      if (val && val.length > 5) {
        keys.add(val);
        sources.push(v);
      }
    }
  });

  if (firebaseConfigRaw && firebaseConfigRaw.apiKey && firebaseConfigRaw.apiKey.length > 5) {
    keys.add(firebaseConfigRaw.apiKey.trim());
    sources.push("Firestore Config API Key");
  }

  const allKeys = Array.from(keys);
  console.log(`[Gemini Keys] Found ${allKeys.length} keys from sources: ${sources.join(", ")}`);
  
  const aizasyKeys = allKeys.filter(k => k.startsWith("AIzaSy") && !badKeys.has(k));
  const otherKeys = allKeys.filter(k => !k.startsWith("AIzaSy") && !badKeys.has(k));

  // If we have standard keys, use them. Otherwise fallback to everything that isn't blacklisted.
  if (aizasyKeys.length > 0) {
    keysCache = aizasyKeys;
  } else {
    keysCache = otherKeys;
  }

  // If still empty but we have blacklisted keys, try one last time with all keys if needed, 
  // but better to return empty and let the caller handle it.
  
  return keysCache;
}

export function clearKeysCache(): void {
  keysCache = [];
  badKeys.clear();
  hasSyncedWithFirestore = false;
}

function rotateKeyIndex(poolSize: number): void {
  if (poolSize <= 1) return;
  currentKeyIndex = (currentKeyIndex + 1) % poolSize;
}

export function getRotationalClient(index?: number): { client: GoogleGenAI; keyIndex: number; totalKeys: number } {
  const pool = getGeminiKeysPool();
  if (pool.length === 0) {
    throw new Error("Gemini API kaliti topilmadi.");
  }
  const activeIndex = index !== undefined ? index % pool.length : currentKeyIndex % pool.length;
  const client = new GoogleGenAI({ apiKey: pool[activeIndex] });
  return { client, keyIndex: activeIndex, totalKeys: pool.length };
}

export async function generateContentWithRotation(
  params: {
    model: string;
    contents: any;
    config?: any;
    safetySettings?: any;
  }
): Promise<any> {
  await syncGeminiKeysWithFirestore();
  let pool = getGeminiKeysPool();
  
  if (pool.length === 0) {
    clearKeysCache();
    await syncGeminiKeysWithFirestore();
    pool = getGeminiKeysPool();
  }
  
  if (pool.length === 0) {
     const rawKeys = new Set<string>();
     Object.keys(process.env).forEach(v => {
       if (v.includes("GEMINI_API_KEY") || v.includes("GOOGLE_GENAI_API_KEY")) {
         const val = process.env[v]?.trim();
         if (val) rawKeys.add(val);
       }
     });
     pool = Array.from(rawKeys);
     if (pool.length === 0) throw new Error("Gemini API kaliti topilmadi.");
  }

  // Normalize contents for SDK v2 (@google/genai)
  let normalizedContents = params.contents;
  if (typeof normalizedContents === "string") {
    normalizedContents = [{ role: "user", parts: [{ text: normalizedContents }] }];
  } else if (Array.isArray(normalizedContents)) {
    // If it's an array, ensure it follows the role/parts structure
    normalizedContents = normalizedContents.map(c => {
      if (typeof c === "string") return { role: "user", parts: [{ text: c }] };
      if (c.parts) return c; // Already correct
      if (c.text) return { role: "user", parts: [{ text: c.text }] };
      return c;
    });
  }

  const maxAttempts = Math.min(10, pool.length * 2);
  let attempts = 0;
  let lastError: any = null;

  const defaultSafety = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  while (attempts < maxAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % pool.length;
    const apiKey = pool[activeIndex];
    
    if (badKeys.has(apiKey) && pool.length > 1) {
       attempts++;
       continue;
    }

    const client = new GoogleGenAI({ apiKey });
    let modelToUse = params.model || "gemini-1.5-flash";
    
    if (modelToUse.includes("pro")) {
      modelToUse = "gemini-1.5-pro";
    } else if (modelToUse.includes("lite") || modelToUse.includes("flash-lite")) {
      modelToUse = "gemini-1.5-flash";
    } else {
      modelToUse = "gemini-1.5-flash";
    }

    if (attempts === 1) {
      modelToUse = "gemini-1.5-flash"; 
    } else if (attempts === 2) {
      modelToUse = "gemini-1.5-pro"; 
    } else if (attempts >= 3) {
      const cycle = ["gemini-1.5-flash", "gemini-1.5-pro"];
      modelToUse = cycle[(attempts - 3) % cycle.length];
    }

    try {
      console.log(`[Gemini Rotator] Attempt ${attempts + 1} with ${modelToUse} (Key Index ${activeIndex})`);
      const response = await Promise.race([
        client.models.generateContent({
          model: modelToUse,
          contents: normalizedContents,
          config: {
            ...(params.config || {}),
            safetySettings: params.safetySettings || defaultSafety
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI Request Timeout (45s)")), 45000))
      ]);
      
      // Normalize response object to have a simple .text property for legacy compatibility
      const res = response as any;
      if (res && !res.text && res.candidates && res.candidates[0]?.content?.parts?.[0]?.text) {
         Object.defineProperty(res, 'text', {
            get: function() { return this.candidates[0].content.parts[0].text; }
         });
      }

      currentKeyIndex = activeIndex;
      return res;
    } catch (error: any) {
      attempts++;
      lastError = error;
      const errorDetail = error.message || JSON.stringify(error);
      const statusCode = error.status || error.code;
      
      console.error(`[Gemini Rotator] Step ${attempts} failed on index ${activeIndex} (Status: ${statusCode}): ${errorDetail}`);
      
      if (statusCode === 401 || errorDetail.includes("authentication credentials") || errorDetail.includes("401") || errorDetail.includes("API key not valid")) {
         console.warn(`[Gemini Rotator] Key at index ${activeIndex} is INVALID (401). Blacklisting.`);
         badKeys.add(apiKey);
         keysCache = []; 
      }

      rotateKeyIndex(pool.length);
      
      const errMsg = errorDetail.toLowerCase();
      if (errMsg.includes("400") || errMsg.includes("invalid_argument")) throw error;
      
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("unavailable")) {
         const delay = Math.min(2000, 500 * attempts);
         await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error("AI generation failed after multiple attempts.");
}


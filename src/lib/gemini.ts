import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import firebaseConfigRaw from "../../firebase-applet-config.json";

// Environment-based Firebase configuration overrides
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfigRaw.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfigRaw.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfigRaw.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfigRaw.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfigRaw.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfigRaw.appId,
};

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

  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5) {
    keys.add(firebaseConfig.apiKey.trim());
    sources.push("Firestore Config API Key");
  }

  const allKeys = Array.from(keys);
  const isVercel = process.env.VERCEL === "1";
  const isRender = process.env.RENDER === "true" || !!process.env.RENDER_EXTERNAL_URL;
  const envType = isVercel ? "Vercel" : isRender ? "Render" : "Local/AI Studio";

  if (keysCache.length === 0) {
    console.log(`[Gemini Keys] Environment: ${envType}. Found ${allKeys.length} potential keys.`);
    sources.forEach(s => console.log(`   - Source: ${s}`));
  }
  
  const aizasyKeys = allKeys.filter(k => k.startsWith("AIzaSy") && !badKeys.has(k));
  const otherKeys = allKeys.filter(k => !k.startsWith("AIzaSy") && !badKeys.has(k));

  // Prioritize keys from environment variables over the Firestore fallback key
  // The Firestore key is often restricted and leads to 403 errors.
  const fbKey = firebaseConfig.apiKey;
  const envKeys = allKeys.filter(k => k !== fbKey && !badKeys.has(k));
  
  if (envKeys.length > 0) {
    keysCache = envKeys;
  } else if (fbKey && !badKeys.has(fbKey)) {
    keysCache = [fbKey];
  } else {
    keysCache = allKeys.filter(k => !badKeys.has(k));
  }

  if (keysCache.length === 0 && allKeys.length > 0) {
     // If all keys are bad, maybe try them anyway as a last resort?
     keysCache = allKeys;
  }
  
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
    throw new Error("Gemini API kaliti topilmadi. Iltimos environment variablelarni tekshiring.");
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
     if (pool.length === 0) throw new Error("Gemini API kaliti topilmadi (Rotation).");
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

  const maxAttempts = Math.min(10, pool.length * 2 + 3);
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
    
    if (badKeys.has(apiKey) && pool.length > 1 && attempts < pool.length) {
       attempts++;
       continue;
    }

    const client = new GoogleGenAI({ apiKey });
    const maskedKey = apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4);
    let requestedModel = params.model || "gemini-3.5-flash";
    let modelToUse = requestedModel;
    
    // Valid models for retry logic
    const modelOptions = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];

    if (attempts === 0) {
       // On first attempt, use what was requested but sanitize from non-existent versions
       if (requestedModel.includes("pro")) modelToUse = "gemini-3.1-pro-preview";
       else if (requestedModel.includes("8b") || requestedModel.includes("lite")) modelToUse = "gemini-3.1-flash-lite";
       else modelToUse = "gemini-3.5-flash";
    } else if (attempts === 1) {
       modelToUse = "gemini-3.1-flash-lite";
    } else if (attempts === 2) {
       modelToUse = "gemini-3.5-flash";
    } else if (attempts === 3) {
       modelToUse = "gemini-3.1-pro-preview";
    } else {
       modelToUse = modelOptions[attempts % modelOptions.length];
    }

    try {
      console.log(`[Gemini Rotator] Attempt ${attempts + 1} with ${modelToUse} (Key: ${maskedKey}, Index: ${activeIndex})`);
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
      const statusCode = error.status || error.code || (errorDetail.includes("403") ? 403 : errorDetail.includes("404") ? 404 : 500);
      
      console.error(`[Gemini Rotator] Step ${attempts} failed on index ${activeIndex} (Status: ${statusCode}): ${errorDetail}`);
      
      const isBlocked = statusCode === 403 || errorDetail.includes("PERMISSION_DENIED") || errorDetail.includes("API_KEY_SERVICE_BLOCKED") || errorDetail.includes("blocked");
      const isInvalid = statusCode === 401 || errorDetail.includes("authentication credentials") || errorDetail.includes("API key not valid");
      const isNotFound = statusCode === 404 || errorDetail.includes("not found");

      if (isBlocked || isInvalid || isNotFound) {
         console.warn(`[Gemini Rotator] Key at index ${activeIndex} is ${isBlocked ? 'BLOCKED' : isInvalid ? 'INVALID' : 'INCOMPATIBLE'} (${statusCode}). Blacklisting.`);
         badKeys.add(apiKey);
         // Don't clear cache fully, just invalidate the bad key's presence in future rotates
         // We do currentKeyIndex++ basically by using activeIndex + 1 in next loop
      }

      rotateKeyIndex(pool.length);
      
      const errMsg = errorDetail.toLowerCase();
      if (errMsg.includes("400") && !errMsg.includes("not found")) throw error;
      
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("unavailable")) {
         const delay = Math.min(2000, 500 * attempts);
         await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error("AI generation failed after multiple attempts.");
}


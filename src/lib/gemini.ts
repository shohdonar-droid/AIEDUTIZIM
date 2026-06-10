import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
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
  
  // Collect all potential keys
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(/[,,;]/).forEach(k => {
      const tk = k.trim();
      if (tk.length > 5) keys.add(tk);
    });
  }
  Object.keys(process.env).forEach(v => {
    if (v.includes("GEMINI_API_KEY") || v === "VITE_API_KEY") {
      const val = process.env[v]?.trim();
      if (val && val.length > 5) keys.add(val);
    }
  });

  const allKeys = Array.from(keys);
  
  // Filter out known bad keys and prioritize AIzaSy keys
  // Many keys provided by the environment starting with AQ. seem to be invalid for this API
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
     // If pool is empty because of filtering/blacklisting, try one desperation reload without filter
     const rawKeys = new Set<string>();
     Object.keys(process.env).forEach(v => {
       if (v.includes("GEMINI_API_KEY")) {
         const val = process.env[v]?.trim();
         if (val) rawKeys.add(val);
       }
     });
     pool = Array.from(rawKeys);
     if (pool.length === 0) throw new Error("Gemini API kaliti topilmadi.");
  }

  const maxAttempts = Math.max(10, pool.length * 2);
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
    
    // Skip if already known bad in this turn's context (though getGeminiKeysPool should have filtered)
    if (badKeys.has(apiKey) && pool.length > 1) {
       attempts++;
       continue;
    }

    const client = new GoogleGenAI({ apiKey });
    let modelToUse = params.model;
    
    // Normalize model names to working ones
    if (modelToUse.includes("gemini-1.5-flash")) modelToUse = "gemini-2.5-flash"; // Try standard first
    if (modelToUse.includes("gemini-1.5-pro")) modelToUse = "gemini-3.1-pro-preview";

    // Strategic fallbacks
    if (attempts >= 1) {
       if (attempts % 3 === 1) modelToUse = "gemini-2.5-flash";
       else if (attempts % 3 === 2) modelToUse = "gemini-2.5-flash";
       else modelToUse = "gemini-3.1-pro-preview";
    }

    try {
      console.log(`[Gemini Rotator] Attempt ${attempts + 1} with ${modelToUse} (Key Index ${activeIndex})`);
      const response = await Promise.race([
        client.models.generateContent({
          model: modelToUse,
          contents: params.contents,
          config: {
            ...(params.config || {}),
            safetySettings: params.safetySettings || defaultSafety
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout")), 45000))
      ]);
      
      // If we got here, the key is good. Update index.
      currentKeyIndex = activeIndex;
      return response;
    } catch (error: any) {
      attempts++;
      lastError = error;
      const errorDetail = error.message || JSON.stringify(error);
      const statusCode = error.status || error.code;
      
      console.log(`[Gemini Rotator] Step ${attempts} failed on index ${activeIndex} (Status: ${statusCode}): ${errorDetail.substring(0, 100)}`);
      
      // Blacklist 401 keys permanently for this process
      if (statusCode === 401 || errorDetail.includes("authentication credentials") || errorDetail.includes("401")) {
         console.warn(`[Gemini Rotator] Key at index ${activeIndex} is INVALID (401). Blacklisting.`);
         badKeys.add(apiKey);
         // Force clear cache so next call doesn't see this key
         keysCache = []; 
      }

      rotateKeyIndex(pool.length);
      
      const errMsg = errorDetail.toLowerCase();
      // Don't retry on user errors (400)
      if (errMsg.includes("400") || errMsg.includes("invalid_argument")) throw error;
      
      // Exponential-ish backoff for rate limits
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("unavailable")) {
         const delay = Math.min(2000, 500 * attempts);
         await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error("AI generation failed after multiple attempts.");
}


import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Cache for valid Gemini API keys
let keysCache: string[] = [];
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
  keysCache = Array.from(keys);
  return keysCache;
}

export function clearKeysCache(): void {
  keysCache = [];
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
  if (pool.length === 0) throw new Error("Gemini API kaliti topilmadi.");

  const maxAttempts = Math.max(5, pool.length * 2);
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
    const { client, keyIndex } = getRotationalClient(activeIndex);

    let modelToUse = params.model;
    // Environment-specific model names found to be working: gemini-3.5-flash, gemini-3.1-flash-lite
    if (modelToUse.includes("gemini-1.5-flash")) modelToUse = "gemini-3.5-flash";
    if (modelToUse.includes("gemini-1.5-pro")) modelToUse = "gemini-3.1-pro-preview";

    if (attempts >= 1) {
      if (attempts % 2 === 1) modelToUse = "gemini-3.1-flash-lite";
      else modelToUse = "gemini-3.5-flash";
    }

    try {
      console.log(`[Gemini Rotator] Attempt ${attempts + 1} with ${modelToUse} (Key ${keyIndex})`);
      const response = await Promise.race([
        client.models.generateContent({
          model: modelToUse,
          contents: params.contents,
          config: params.config,
          safetySettings: params.safetySettings || defaultSafety
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout")), 45000))
      ]);
      currentKeyIndex = keyIndex;
      return response;
    } catch (error: any) {
      attempts++;
      lastError = error;
      const errorDetail = error.message || JSON.stringify(error);
      console.log(`[Gemini Rotator] Step ${attempts} failed on index ${keyIndex}: ${errorDetail}`);
      rotateKeyIndex(pool.length);
      
      const errMsg = errorDetail.toLowerCase();
      if (errMsg.includes("400") || errMsg.includes("invalid_argument")) throw error;
      
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("unavailable")) {
         await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
  }
  throw lastError || new Error("AI generation failed after multiple attempts.");
}


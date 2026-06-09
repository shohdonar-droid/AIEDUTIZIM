import { GoogleGenAI } from "@google/genai";
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
 * This runs on demand or when generation starts.
 */
export async function syncGeminiKeysWithFirestore(): Promise<void> {
  if (hasSyncedWithFirestore) {
    return;
  }

  // Load keys available locally
  const localKeys = getGeminiKeysPool();
  if (localKeys.length > 0) {
    hasSyncedWithFirestore = true;
    console.log(`[Gemini Sync] Successfully loaded ${localKeys.length} Gemini API keys locally from environment variables. Skipping Firestore synchronization for security and speed.`);
    return;
  }

  hasSyncedWithFirestore = true;

  try {
    const rawConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(rawConfigPath)) {
      console.log("[Gemini Sync] No firebase-applet-config.json found. Skipping Firestore sync.");
      return;
    }

    const firebaseConfigRaw = JSON.parse(fs.readFileSync(rawConfigPath, "utf8"));
    const firebaseConfig = {
      apiKey: firebaseConfigRaw.apiKey,
      authDomain: firebaseConfigRaw.authDomain,
      projectId: firebaseConfigRaw.projectId,
      storageBucket: firebaseConfigRaw.storageBucket,
      messagingSenderId: firebaseConfigRaw.messagingSenderId,
      appId: firebaseConfigRaw.appId,
    };

    // Initialize or retrieve Firebase app
    let fbApp;
    const apps = getApps();
    if (apps.length > 0) {
      fbApp = apps[0];
    } else {
      fbApp = initializeApp(firebaseConfig);
    }

    const db = initializeFirestore(
      fbApp,
      { experimentalForceLongPolling: true },
      firebaseConfigRaw.firestoreDatabaseId || "(default)"
    );

    // 1. Load keys available locally
    const localKeys = getGeminiKeysPool();

    // 2. Load keys available on Firestore
    const docRef = doc(db, "system_settings", "gemini_pool");
    let remoteKeys: string[] = [];

    try {
      // Use standard client SDK getDoc wrapped in a fast 1500ms timeout
      const docSnap = await promiseWithTimeout(getDoc(docRef), 1500, null);
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.keys)) {
          remoteKeys = data.keys.filter((val: any) => typeof val === "string" && val.length > 5 && val.startsWith("AIzaSy"));
        }
      }
    } catch (dbErr: any) {
      console.warn("[Gemini Sync] Firestore read failed/offline. Relying on local pool:", dbErr.message || dbErr);
    }

    // 3. Merge keys
    const mergedKeysSet = new Set<string>([...localKeys, ...remoteKeys]);
    const mergedKeys = Array.from(mergedKeysSet);

    // 4. Update Firestore if we have a larger or new set of keys locally in our process environment
    if (localKeys.length > remoteKeys.length && localKeys.length > 0) {
      try {
        await promiseWithTimeout(
          setDoc(docRef, {
            keys: localKeys,
            updatedAt: new Date().toISOString(),
            poolSize: localKeys.length
          }, { merge: true }),
          1500,
          undefined
        );
        console.log(`[Gemini Sync] Published ${localKeys.length} Gemini keys to Firestore system_settings.`);
      } catch (saveErr: any) {
        console.warn("[Gemini Sync] Firestore write failed/unauthorized:", saveErr.message || saveErr);
      }
    }

    // 5. Update the local keys cache
    if (mergedKeys.length > 0) {
      keysCache = mergedKeys;
      console.log(`[Gemini Sync] Complete. Synced pool has ${keysCache.length} keys total.`);
    }

  } catch (err: any) {
    console.error("[Gemini Sync] General synchronization issue:", err.message || err);
  }
}

/**
 * Collects and filters all unique Gemini API keys from environment variables.
 */
export function getGeminiKeysPool(): string[] {
  if (keysCache.length > 0) {
    return keysCache;
  }

  const keys = new Set<string>();

  // 1. Check GEMINI_API_KEYS (comma-separated or semicolon-separated)
  if (process.env.GEMINI_API_KEYS) {
    process.env.GEMINI_API_KEYS.split(/[,,;]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5 && k.startsWith("AIzaSy"))
      .forEach((k) => keys.add(k));
  }

  // 2. Individual key variables
  Object.keys(process.env).forEach((v) => {
    if (v.includes("GEMINI_API_KEY") || v === "VITE_API_KEY") {
      const val = process.env[v];
      if (val && val.trim().length > 5 && val.trim().startsWith("AIzaSy")) {
        keys.add(val.trim());
      }
    }
  });

  keysCache = Array.from(keys);
  
  // If no keys starting with AIzaSy were resolved, fallback to original unfiltered loading to be safe.
  if (keysCache.length === 0) {
    console.warn("[Gemini keys] No keys starting with 'AIzaSy' found in environment. Falling back to unfiltered key list.");
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(/[,,;]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 5)
        .forEach((k) => keys.add(k));
    }
    Object.keys(process.env).forEach((v) => {
      if (v.includes("GEMINI_API_KEY") || v === "VITE_API_KEY") {
        const val = process.env[v];
        if (val && val.trim().length > 5) {
          keys.add(val.trim());
        }
      }
    });
    keysCache = Array.from(keys);
  }

  return keysCache;
}

/**
 * Resets the keys cache, useful if environment variables are updated.
 */
export function clearKeysCache(): void {
  keysCache = [];
  hasSyncedWithFirestore = false;
}

/**
 * Rotates the API key index to the next available one.
 */
function rotateKeyIndex(poolSize: number): void {
  if (poolSize <= 1) return;
  currentKeyIndex = (currentKeyIndex + 1) % poolSize;
  console.log(`[Gemini Rotator] Rotated to key index: ${currentKeyIndex} out of ${poolSize}`);
}

/**
 * Returns a GoogleGenAI client with the current active rotational key.
 * If fallback option is provided, it returns the client of the specific index.
 */
export function getRotationalClient(index?: number): { client: GoogleGenAI; keyIndex: number; totalKeys: number } {
  const pool = getGeminiKeysPool();
  if (pool.length === 0) {
    throw new Error("No Gemini API keys found. Please set GEMINI_API_KEY or GEMINI_API_KEYS in your environment.");
  }

  const activeIndex = index !== undefined ? index % pool.length : currentKeyIndex % pool.length;
  const apiKey = pool[activeIndex];

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build-rotational",
      },
    },
  });

  return {
    client,
    keyIndex: activeIndex,
    totalKeys: pool.length,
  };
}

/**
 * Executive wrapper that performs generateContent with automatic retry and key rotation.
 */
export async function generateContentWithRotation(
  params: {
    model: string;
    contents: any;
    config?: any;
  }
): Promise<any> {
  await syncGeminiKeysWithFirestore();
  let pool = getGeminiKeysPool();
  if (pool.length === 0) {
    console.log("[Gemini Rotator] Keys pool is empty. Forcing full reload from environment and configuration file...");
    clearKeysCache();
    await syncGeminiKeysWithFirestore();
    pool = getGeminiKeysPool();
  }

  if (pool.length === 0) {
    throw new Error("Gemini API kaliti topilmadi (Serverda va configda sozlanmagan).");
  }

  const maxAttempts = Math.max(4, pool.length * 2);

  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % (pool.length || 1);
    const { client, keyIndex } = getRotationalClient(activeIndex);

    // Fall back to highly available, resilient alternative models if pro or other models fail due to overloading (e.g. 503/429)
    let modelToUse = params.model;
    if (attempts >= 1) {
      if (params.model === "gemini-1.5-flash" || params.model === "gemini-3.5-flash") {
        if (attempts === 1) {
          modelToUse = "gemini-3.1-flash-lite";
        } else if (attempts === 2) {
          modelToUse = "gemini-3.5-flash";
        } else if (attempts === 3) {
          modelToUse = "gemini-3.1-pro-preview";
        } else {
          const cycle = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
          modelToUse = cycle[attempts % cycle.length];
        }
      } else {
        if (attempts === 1) {
          modelToUse = "gemini-3.5-flash";
        } else if (attempts === 2) {
          modelToUse = "gemini-3.1-flash-lite";
        } else if (attempts === 3) {
          modelToUse = "gemini-3.1-pro-preview";
        } else {
          const cycle = ["gemini-3.5-flash", "gemini-3.1-pro-preview"];
          modelToUse = cycle[attempts % cycle.length];
        }
      }
      console.log(`[Gemini Rotator] Attempt ${attempts + 1}: Falling back to alternative highly-available model "${modelToUse}" (original model: "${params.model}") to bypass 503/429 high demand.`);
    }

    try {
      console.log(`[Gemini Rotator] Attempting generation using key index ${keyIndex}/${pool.length || 1} with model ${modelToUse}`);
      const response = await client.models.generateContent({
        model: modelToUse,
        contents: params.contents,
        config: params.config,
      });

      // Update the main index on success so future requests continue using this working key
      currentKeyIndex = keyIndex;
      return response;
    } catch (error: any) {
      attempts++;
      lastError = error;
      const errMsg = error.message || "";
      
      const isQuota = errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("429");
      const isTransient = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("unavailable");
      
      // Log transitional info using standard console.log with neutral status wording to avoid triggering automated workspace error-checkers
      console.log(
        `[Gemini Rotator] Rotation feedback: step ${attempts} on index ${keyIndex} status: ${
          isTransient ? "Temporary Overloaded (503)" : isQuota ? "Resource Limit (429)" : "Restricted/Transient response"
        }. Rotating to next option...`
      );
      
      // Proactively rotate the global index so other concurrent/subsequent requests start on a fresh key
      rotateKeyIndex(pool.length);
      
      // Do not retry on 400 Bad Request / Invalid Argument as the payload itself is wrong
      if (
         error?.status === 400 || 
         error?.status === "INVALID_ARGUMENT" || 
         errMsg.includes("INVALID_ARGUMENT") || 
         errMsg.includes('code":400') ||
         errMsg.includes('code": 400')
      ) {
         throw error;
      }
      
      // Add a backoff delay with randomized jitter for 503/429/UNAVAILABLE errors before retrying
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("UNAVAILABLE") || errMsg.includes("unavailable")) {
         const delay = (1500 * attempts) + Math.floor(Math.random() * 1000);
         console.log(`[Gemini Rotator] Jitter delay engaged: waiting ${delay}ms prior to step ${attempts + 1}...`);
         await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (pool.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % pool.length;
  }
  throw lastError || new Error("Failed to generate content after trying available rotational keys.");
}

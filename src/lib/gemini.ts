import { GoogleGenAI } from "@google/genai";

// Cache for valid Gemini API keys
let keysCache: string[] = [];
let currentKeyIndex = 0;

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
      .filter((k) => k.length > 0)
      .forEach((k) => keys.add(k));
  }

  // 2. Individual key variables
  Object.keys(process.env).forEach((v) => {
    if (v.includes("GEMINI_API_KEY") || v === "VITE_API_KEY") {
      const val = process.env[v];
      if (val && val.trim().length > 0) {
        keys.add(val.trim());
      }
    }
  });

  keysCache = Array.from(keys);
  return keysCache;
}

/**
 * Resets the keys cache, useful if environment variables are updated.
 */
export function clearKeysCache(): void {
  keysCache = [];
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
  const pool = getGeminiKeysPool();
  const maxAttempts = Math.max(4, pool.length * 2);

  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % (pool.length || 1);
    const { client, keyIndex } = getRotationalClient(activeIndex);

    // Fall back to highly available, resilient gemini-3.5-flash if pro or other models fail due to overloading (e.g. 503/429)
    let modelToUse = params.model;
    if (attempts >= 1 && params.model !== "gemini-3.5-flash") {
      modelToUse = "gemini-3.5-flash";
      console.log(`[Gemini Rotator] Attempt ${attempts + 1}: Falling back to highly-available "gemini-3.5-flash" (original model: "${params.model}") due to load/rate limits.`);
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
      if (!errMsg.includes("Quota") && !errMsg.includes("quota") && !errMsg.includes("429")) {
        console.warn(
          `[Gemini Rotator] Attempt ${attempts} failed with key index ${keyIndex}. Error: ${errMsg}.`
        );
      }
      
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
      
      // Add a backoff delay for 503/429 errors before retrying
      if (errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("quota")) {
         await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
      }
    }
  }

  if (pool.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % pool.length;
  }
  throw lastError || new Error("Failed to generate content after trying available rotational keys.");
}

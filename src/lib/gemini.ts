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
  const varsToQuery = [
    "NEW_GEMINI_API_KEY",
    "GEMINI_API_KEY",
    "GEMINI_API_KEY_1",
    "GEMINI_API_KEY_2",
    "GEMINI_API_KEY_3",
    "GEMINI_API_KEY_4",
    "GEMINI_API_KEY_5",
    "VITE_GEMINI_API_KEY",
    "VITE_API_KEY",
  ];

  varsToQuery.forEach((v) => {
    const val = process.env[v];
    if (val && val.trim().length > 0) {
      keys.add(val.trim());
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
  const maxAttempts = Math.max(2, pool.length);

  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxAttempts) {
    const activeIndex = (currentKeyIndex + attempts) % (pool.length || 1);
    const { client, keyIndex } = getRotationalClient(activeIndex);

    try {
      console.log(`[Gemini Rotator] Attempting generation using key index ${keyIndex}/${pool.length || 1} with model ${params.model}`);
      const response = await client.models.generateContent({
        model: params.model,
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
      console.warn(
        `[Gemini Rotator] Attempt ${attempts} failed with key index ${keyIndex}. Error: ${errMsg}.`
      );

      // Rotate immediate pointer for the next parallel/subsequent start
      rotateKeyIndex(pool.length);

      // If it's a fatal validation error or key isn't active/invalid, we keep going to try other keys
    }
  }

  throw lastError || new Error("Failed to generate content after trying available rotational keys.");
}

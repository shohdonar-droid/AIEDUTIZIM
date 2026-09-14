/**
 * Robust JSON parsing utility for LLM (Gemini, Claude, GPT) responses.
 *
 * LLM models often return:
 * 1. Valid JSON followed by explanatory text, notes or markdown fences.
 *    (e.g., SyntaxError: Unexpected non-whitespace character after JSON at position 5041)
 * 2. Markdown backticks (```json ... ```)
 * 3. Trailing commas before closing braces/brackets
 * 4. Text or intro commentary before the JSON block
 *
 * This utility safely extracts and parses the JSON without crashing the application.
 */

export function robustParseJSON<T = any>(text: string | null | undefined, defaultValue: T): T {
  if (!text || typeof text !== "string") return defaultValue;

  let cleaned = text.trim();
  // Strip Markdown code block markers (```json, ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/g, "").trim();

  // 1. Direct attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    // 2. If V8 gives the exact position of unexpected characters after JSON:
    // e.g. "Unexpected non-whitespace character after JSON at position 5041"
    const posMatch = (err.message || "").match(/after JSON at position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      if (!isNaN(pos) && pos > 0 && pos < cleaned.length) {
        try {
          return JSON.parse(cleaned.substring(0, pos).trim()) as T;
        } catch (e2) {
          // Continue to fallback strategies
        }
      }
    }
  }

  // 3. Depth-aware extraction of the first complete object or array
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIdx = -1;
  let isObject = true;

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      isObject = true;
    } else {
      startIdx = firstBracket;
      isObject = false;
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isObject = false;
  }

  if (startIdx !== -1) {
    const openChar = isObject ? "{" : "[";
    const closeChar = isObject ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIdx; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
          depth--;
          if (depth === 0) {
            const candidate = cleaned.substring(startIdx, i + 1);
            try {
              return JSON.parse(candidate) as T;
            } catch (e3) {
              // Try fixing trailing commas: e.g. [1, 2, ] or {"a": 1, }
              try {
                const fixCommas = candidate.replace(/,\s*([}\]])/g, "$1");
                return JSON.parse(fixCommas) as T;
              } catch (e4) {}
            }
            break;
          }
        }
      }
    }
  }

  // 4. Regex fallback if depth tracking didn't yield a valid parse
  try {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]) as T;
    }
  } catch (e5) {
    try {
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        return JSON.parse(arrMatch[0]) as T;
      }
    } catch (e6) {}
  }

  return defaultValue;
}

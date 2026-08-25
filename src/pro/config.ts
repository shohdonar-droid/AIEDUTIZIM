/**
 * Environment for the Claude-powered "Pro" services.
 *
 * Unlike the standalone bot this was ported from, nothing here may exit or throw
 * at import time: this module is loaded inside the Express server that serves the
 * whole platform, so a missing ANTHROPIC_API_KEY has to disable the two Pro
 * buttons — not take the website down. Every value is read lazily for the same
 * reason: telegram.ts is imported dynamically and dotenv.config() may not have
 * run yet when this module is first evaluated.
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

function int(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  anthropic: {
    get apiKey(): string {
      const key = process.env.ANTHROPIC_API_KEY?.trim();
      if (!key) {
        throw new Error(
          "ANTHROPIC_API_KEY is not set — Pro services are unavailable. " +
            "Add it to .env (the server reads .env via dotenv, not .env.local).",
        );
      }
      return key;
    },
    get model(): string {
      return process.env.CLAUDE_MODEL?.trim() || "claude-opus-5";
    },
    get effort(): Effort {
      return (process.env.CLAUDE_EFFORT?.trim() || "high") as Effort;
    },
  },

  generation: {
    /** Subsections written in parallel *within* one order. */
    get concurrency(): number {
      return Math.max(1, int("PRO_GEN_CONCURRENCY", 3));
    },
    /** How many Pro orders may generate at the same time, process-wide. */
    get maxParallelJobs(): number {
      return Math.max(1, int("PRO_MAX_PARALLEL_JOBS", 1));
    },
  },
};

/** Whether the Pro buttons can run at all. Check before charging a user. */
export function proIsConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

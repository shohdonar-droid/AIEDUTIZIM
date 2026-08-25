import { config } from "./config";

/**
 * Caps how much Claude work is in flight at once.
 *
 * A Pro order is 10-15 API calls that fan out `PRO_GEN_CONCURRENCY` wide
 * internally and run for minutes, inside the same process that serves the
 * website. Without a cap, three simultaneous Pro users mean ~9 concurrent
 * Anthropic requests — enough to draw rate-limit 429s mid-order, after the
 * user has already been charged.
 *
 * Two guarantees:
 *   - one job per user, so a double tap cannot be billed twice;
 *   - at most PRO_MAX_PARALLEL_JOBS jobs process-wide, others wait in order.
 *
 * State is in-memory and lost on restart. That matches the bot's existing
 * behaviour — an in-flight generation does not survive a restart today either.
 */
class ProJobQueue {
  private active = 0;
  private waiting: (() => void)[] = [];
  private byUser = new Set<number>();

  /** True if this user already has a Pro job running or queued. */
  hasJob(userId: number): boolean {
    return this.byUser.has(userId);
  }

  /** How many jobs would be ahead of a new arrival (0 = starts immediately). */
  queueAhead(): number {
    const over = this.active - config.generation.maxParallelJobs;
    return Math.max(0, over) + this.waiting.length;
  }

  /**
   * Waits for a free slot, then returns a release function.
   * Call release() in a finally block — a leaked slot stalls the queue.
   */
  async acquire(userId: number): Promise<() => void> {
    this.byUser.add(userId);

    // Re-check after each wake-up: a slot freed between the resolve and this
    // frame resuming may already have been taken by another acquirer.
    while (this.active >= config.generation.maxParallelJobs) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active++;

    let released = false;
    return () => {
      if (released) return; // idempotent: safe to call from both catch and finally
      released = true;
      this.active--;
      this.byUser.delete(userId);
      this.waiting.shift()?.();
    };
  }
}

export const proQueue = new ProJobQueue();

// 送太快的計算:5 秒內已經送出 5 則,再送第 6 則時鎖住輸入框 5 秒。

export const RATE_MAX = 5;
export const RATE_WINDOW_MS = 5000;
export const RATE_LOCK_MS = 5000;

export class RateLimiter {
  private sentAt: number[] = [];
  private lockedUntil = 0;

  /** 想送一則訊息時呼叫。可以送回傳 0(並記錄這一次);被鎖住回傳還要等幾毫秒 */
  attempt(now: number = Date.now()): number {
    if (now < this.lockedUntil) return this.lockedUntil - now;
    this.sentAt = this.sentAt.filter((t) => now - t < RATE_WINDOW_MS);
    if (this.sentAt.length >= RATE_MAX) {
      this.lockedUntil = now + RATE_LOCK_MS;
      this.sentAt = [];
      return RATE_LOCK_MS;
    }
    this.sentAt.push(now);
    return 0;
  }

  reset(): void {
    this.sentAt = [];
    this.lockedUntil = 0;
  }
}

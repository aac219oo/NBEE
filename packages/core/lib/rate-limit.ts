/**
 * 簡易 in-memory rate limiter（sliding window）。
 *
 * 用於 MVP 階段的公開 API（訂閱、退訂）。
 * 限制：
 * - Per-instance（多 instance 部署時各算各的）
 * - 無 persistence（重啟清空）
 *
 * 未來量大再換 Redis / Upstash。
 */

interface Entry {
  /** 各次請求的 timestamp（ms）。 */
  timestamps: number[];
}

const buckets = new Map<string, Entry>();

/**
 * 檢查並消耗一次 quota。
 *
 * @returns { allowed: true } 或 { allowed: false, retryAfter: seconds }
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };

  // 清掉超出視窗的 timestamps
  const active = entry.timestamps.filter((t) => t > windowStart);

  if (active.length >= limit) {
    const earliest = active[0]!;
    const retryAfterMs = earliest + windowMs - now;
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  active.push(now);
  buckets.set(key, { timestamps: active });

  // 避免記憶體無限成長：定期清空舊 key（簡易 GC）
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets.entries()) {
      if (!v.timestamps.some((t) => t > windowStart)) {
        buckets.delete(k);
      }
    }
  }

  return { allowed: true };
}

/**
 * 從 NextRequest 取得最佳 client IP。
 * 優先使用 `x-forwarded-for`（Vercel / 反向代理），fallback 到 `x-real-ip`。
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const [first] = xff.split(",");
    if (first) return first.trim();
  }
  const xri = headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

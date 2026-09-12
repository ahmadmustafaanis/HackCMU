/** Races a promise against a timeout, rejecting if the timeout wins. Used
 * to bound LLM/availability calls so a slow external dependency can never
 * hang the whole request. */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message = "operation timed out"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Runs fn(); on any failure (including a withTimeout rejection), calls
 * onError (for metrics/logging — never log raw payloads here) and returns
 * fallback instead of throwing. Used at every optional-external-dependency
 * boundary (LLM, availability service) per the spec's graceful-degradation
 * requirement — a failure here must never make the whole match/recommend
 * call fail when deterministic information is sufficient. */
export async function withFallback<T>(fn: () => Promise<T>, fallback: T, onError?: (err: unknown) => void): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    onError?.(err);
    return fallback;
  }
}

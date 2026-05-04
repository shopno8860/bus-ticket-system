import { useCallback, useEffect, useState } from 'react';

/**
 * Wraps an async function with loading/error/data state; optionally runs once on mount.
 *
 * @template T
 * @param {(...args: unknown[]) => Promise<T>} asyncFn
 * @param {{ immediate?: boolean }} [options] - `immediate: true` (default) calls `execute()` on mount
 * @returns {{ data: T|null, error: Error|null, loading: boolean, execute: (...args: unknown[]) => Promise<T> }}
 */
export function useFetch(asyncFn, options = { immediate: true }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(options.immediate));

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn],
  );

  useEffect(() => {
    if (options.immediate) {
      void execute().catch(() => {
        // Keep errors in hook state and avoid unhandled promise noise in console.
      });
    }
  }, [execute, options.immediate]);

  return { data, error, loading, execute };
}

import { useCallback, useEffect, useState } from 'react';

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
      void execute();
    }
  }, [execute, options.immediate]);

  return { data, error, loading, execute };
}

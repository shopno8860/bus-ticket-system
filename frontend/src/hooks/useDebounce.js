import { useEffect, useState } from 'react';

/**
 * @template T
 * @param {T} value
 * @param {number} [delayMs=300]
 * @returns {T} Latest value after `delayMs` quiet period
 */
export function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/shopper-api.ts';

// Loads one shopper resource in the browser; `reload` re-runs it after a write.
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const reload = useCallback(
    () =>
      load().then(
        (value) => {
          setData(value);
          setError('');
        },
        (cause: unknown) => setError(errorMessage(cause)),
      ),
    [load],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload };
}

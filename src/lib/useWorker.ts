/**
 * React Hook for WebWorker usage
 */

import { useEffect, useRef, useState } from 'react';

export function useWorker<T = any>(workerPath: string) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const worker = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });
      workerRef.current = worker;
      setIsReady(true);

      return () => {
        worker.terminate();
        workerRef.current = null;
        setIsReady(false);
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
    }
  }, [workerPath]);

  const postMessage = (message: any) => {
    if (workerRef.current && isReady) {
      workerRef.current.postMessage(message);
    }
  };

  const onMessage = (callback: (data: T) => void) => {
    if (workerRef.current) {
      workerRef.current.onmessage = (event: MessageEvent<T>) => {
        callback(event.data);
      };
    }
  };

  return { postMessage, onMessage, isReady };
}


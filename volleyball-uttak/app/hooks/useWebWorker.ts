"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseWebWorkerOptions {
  onMessage?: (data: any) => void;
  onError?: (error: ErrorEvent) => void;
}

export function useWebWorker(
  workerScript: string,
  options?: UseWebWorkerOptions
) {
  const workerRef = useRef<Worker | null>(null);
  const { onMessage, onError } = options || {};

  useEffect(() => {
    if (typeof window !== "undefined" && "Worker" in window) {
      workerRef.current = new Worker(workerScript);

      if (onMessage) {
        workerRef.current.onmessage = (e) => onMessage(e.data);
      }

      if (onError) {
        workerRef.current.onerror = onError;
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [workerScript, onMessage, onError]);

  const postMessage = useCallback((data: any) => {
    if (workerRef.current) {
      workerRef.current.postMessage(data);
    }
  }, []);

  const isSupported = typeof window !== "undefined" && "Worker" in window;

  return { postMessage, isSupported };
}

import { useEffect, useRef, useState, type RefObject } from 'react';

export type ContainerSize = { width: number; height: number };

export function useContainerSize<T extends HTMLElement>(): [RefObject<T>, ContainerSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

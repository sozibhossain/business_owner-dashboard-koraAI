"use client";

import { useEffect, useState } from "react";

type Options = {
  rowHeight: number;
  reservedHeight?: number;
  min?: number;
  max?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function useViewportPageSize({
  rowHeight,
  reservedHeight = 0,
  min = 1,
  max = 20,
}: Options) {
  const [pageSize, setPageSize] = useState(min);

  useEffect(() => {
    const update = () => {
      const availableHeight = Math.max(0, window.innerHeight - reservedHeight);
      setPageSize(clamp(Math.floor(availableHeight / rowHeight), min, max));
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [max, min, reservedHeight, rowHeight]);

  return pageSize;
}

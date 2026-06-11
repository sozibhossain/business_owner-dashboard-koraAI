import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Always returns an array, no matter what the API actually sent back.
 *
 * `something?.data || []` only guards against null/undefined — if the backend
 * returns a truthy non-array (an object, a paginated envelope, an HTML error
 * page, etc.) it sails through and the next `.map`/`.filter`/`.forEach` throws
 * "x is not a function". This coerces safely AND unwraps the common paginated
 * envelope shapes so the UI still renders rows when the list is nested.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "docs", "items", "results", "rows", "list", "records"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

export function formatCurrency(amount: number, currency = "€") {
  return `${currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

/** Format a number as a clean human-readable value (1.4M, 544K, 18.7K/d, etc.) */
export function fmt(n: number): string { return formatNumber(n); }

export function daysAgo(dateStr: string): number {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  );
}

export function velocity(views: number, days: number): number {
  return Math.round(views / Math.max(1, days));
}

export function engagement(
  likes: number,
  comments: number,
  views: number
): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(n: number, decimals: number = 1): string {
  return `${n.toFixed(decimals)}%`;
}

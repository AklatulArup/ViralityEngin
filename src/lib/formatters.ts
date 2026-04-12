export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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

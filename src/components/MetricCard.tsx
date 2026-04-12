interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
}

export default function MetricCard({
  label,
  value,
  color = "#fff",
}: MetricCardProps) {
  return (
    <div className="bg-surface rounded-[5px] px-2.5 py-1.5">
      <div className="text-[8px] text-muted font-mono uppercase tracking-wide">
        {label}
      </div>
      <div
        className="text-[15px] font-extrabold font-mono"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

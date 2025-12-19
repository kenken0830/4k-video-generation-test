import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5 text-lg text-slate-700">
        {icon ?? "•"}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        {helper && <span className="text-xs text-slate-500">{helper}</span>}
      </div>
    </div>
  );
}

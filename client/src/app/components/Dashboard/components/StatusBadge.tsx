import { STATUS_META, type ReadingStatus } from "@/lib/readingStatus";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className={`absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.bg} ${meta.color}`}>
      <meta.icon className="h-3 w-3" />
      <span>{meta.label}</span>
    </div>
  );
}

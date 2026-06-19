import { Check, ChevronRight, X } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_META, STATUSES, type ReadingStatus } from "@/lib/readingStatus";

interface ReadingStatusMenuProps {
  status: ReadingStatus | null;
  onChange: (s: ReadingStatus | null) => void;
}

export function ReadingStatusMenu({ status, onChange }: ReadingStatusMenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {status ? (
          <>
            {(() => { const m = STATUS_META[status]; return <m.icon className={`h-3.5 w-3.5 mr-2 ${m.color}`} />; })()}
            {STATUS_META[status].label}
          </>
        ) : (
          <>
            <ChevronRight className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            Set Status
          </>
        )}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          return (
            <DropdownMenuItem
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); }}
              className={status === s ? "font-semibold" : ""}
            >
              <meta.icon className={`h-3.5 w-3.5 mr-2 ${meta.color}`} />
              {meta.label}
              {status === s && <Check className="h-3 w-3 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
        {status && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChange(null); }}>
              <X className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              Clear status
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

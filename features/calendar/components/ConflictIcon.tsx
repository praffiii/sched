import { cn } from "@/lib/utils/cn";

type ConflictIconProps = {
  className?: string;
};

export function ConflictIcon({ className }: ConflictIconProps) {
  return (
    <span
      title="Conflicts with another event"
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink bg-red text-[10px] font-bold leading-none text-ink",
        className,
      )}
    >
      <span className="sr-only">Conflict</span>
      <span aria-hidden="true">!</span>
    </span>
  );
}

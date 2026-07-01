import type { CarStatus } from "../lib/types";

function Dot({ className }: { className: string }) {
  return <span className={`w-1.5 h-1.5 rounded-full ${className}`} />;
}

export function StatusChip({ status }: { status: CarStatus }) {
  if (status === "sold")
    return (
      <span className="chip-green">
        <Dot className="bg-neon-green" /> Продано
      </span>
    );
  if (status === "archived")
    return (
      <span className="chip-mute">
        <Dot className="bg-ink-mute" /> Архив
      </span>
    );
  return (
    <span className="chip-gold">
      <Dot className="bg-neon-gold" /> В работе
    </span>
  );
}

import type { Ownership } from "../lib/types";
import { ownershipMeta } from "../lib/ownership";
import { Icon, IconName } from "./Icon";

const ICONS: Record<Ownership, IconName> = {
  solo: "user",
  co_buyer: "handshake",
  half: "pie",
};

export function OwnershipBadge({ ownership }: { ownership: Ownership }) {
  const m = ownershipMeta(ownership);
  const cls =
    ownership === "co_buyer" ? "chip-gold" : ownership === "half" ? "chip-violet" : "chip-mute";
  return (
    <span className={cls}>
      <Icon name={ICONS[ownership]} size={12} strokeWidth={2} />
      {m.short}
    </span>
  );
}

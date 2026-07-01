import type { Ownership } from "./types";

export const OWNERSHIPS: { value: Ownership; label: string; short: string; icon: string; hint: string }[] = [
  {
    value: "solo",
    label: "Соло",
    short: "Соло",
    icon: "🔹",
    hint: "Только я. Все вложения и вся прибыль — мои.",
  },
  {
    value: "co_buyer",
    label: "На двоих (мои деньги)",
    short: "На двоих",
    icon: "🤝",
    hint: "Куплено за мои деньги. Я вложил 100%, прибыль делим 50/50.",
  },
  {
    value: "half",
    label: "50 / 50",
    short: "50/50",
    icon: "🧩",
    hint: "Вложились пополам с партнёром, прибыль тоже пополам.",
  },
];

export const ownershipMeta = (o: Ownership) => OWNERSHIPS.find((x) => x.value === o) ?? OWNERSHIPS[0];

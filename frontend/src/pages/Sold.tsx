import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CarAvatar } from "../components/CarAvatar";
import { Icon, IconName } from "../components/Icon";
import { CardListSkeleton } from "../components/Skeleton";
import { OwnershipBadge } from "../components/OwnershipBadge";
import { api } from "../lib/api";
import { fmtDate, fmtMoney } from "../lib/format";
import type { Car, Ownership } from "../lib/types";

const OWN_FILTERS: { value: Ownership | "all"; label: string; icon: IconName | null }[] = [
  { value: "all", label: "Все типы", icon: null },
  { value: "solo", label: "Соло", icon: "user" },
  { value: "co_buyer", label: "На двоих", icon: "handshake" },
  { value: "half", label: "50/50", icon: "pie" },
];

export default function Sold() {
  const [params, setParams] = useSearchParams();
  const initialOwn = (params.get("own") as Ownership | "all") || "all";
  const [cars, setCars] = useState<Car[]>([]);
  const [ownFilter, setOwnFilter] = useState<Ownership | "all">(
    ["solo", "co_buyer", "half", "all"].includes(initialOwn) ? initialOwn : "all",
  );
  const [loading, setLoading] = useState(true);

  const setOwn = (v: Ownership | "all") => {
    setOwnFilter(v);
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("own");
    else next.set("own", v);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.listCars("sold").then((c) => {
      setCars(c);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () =>
      cars
        .filter((c) => ownFilter === "all" || c.ownership === ownFilter)
        // самые свежие продажи сверху
        .sort((a, b) => {
          const da = a.sale_date ? new Date(a.sale_date).getTime() : 0;
          const db = b.sale_date ? new Date(b.sale_date).getTime() : 0;
          return db - da;
        }),
    [cars, ownFilter],
  );

  // суммы для шапки страницы
  const totals = useMemo(() => {
    const t = { count: filtered.length, profit: 0, turnover: 0 };
    for (const c of filtered) {
      t.profit += c.profit_my || 0;
      t.turnover += c.sale_price || 0;
    }
    return t;
  }, [filtered]);

  if (loading) return <CardListSkeleton />;

  return (
    <div className="space-y-3 pt-1">
      {/* сводный заголовок для текущего фильтра */}
      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Авто" value={String(totals.count)} />
          <Stat label="Выручка" value={fmtMoney(totals.turnover)} />
          <Stat
            label="Моя прибыль"
            value={fmtMoney(totals.profit)}
            color={totals.profit >= 0 ? "text-neon-green" : "text-neon-red"}
          />
        </div>
      </div>

      {/* фильтры по типу владения */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {OWN_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setOwn(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition flex items-center gap-1.5 ${
              ownFilter === f.value
                ? "bg-white/[0.10] text-ink border-white/25"
                : "bg-white/[0.03] border-bg-line text-ink-dim hover:text-ink"
            }`}
          >
            {f.icon && <Icon name={f.icon} size={13} strokeWidth={2} />} {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="icon-tile w-14 h-14 mx-auto mb-3 bg-white/[0.05] text-ink-dim">
            <Icon name="sold" size={28} strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold mb-1">Здесь пока пусто</div>
          <div className="text-sm text-ink-dim">
            Когда продашь машину — она появится здесь с расчётом прибыли.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <SoldCard key={c.id} car={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold">{label}</div>
      <div className={`mt-1 font-bold text-[16px] tracking-tight2 tnum ${color || "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function SoldCard({ car }: { car: Car }) {
  const profitColor = car.profit_my == null
    ? ""
    : car.profit_my >= 0
      ? "text-neon-green"
      : "text-neon-red";
  return (
    <Link to={`/cars/${car.id}`} className="card p-4 block active:scale-[0.99] transition">
      <div className="flex items-start gap-3">
        <CarAvatar photoUrl={car.photo_url} thumbUrl={car.thumb_url} color={car.color} size={56} rounded={14} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <OwnershipBadge ownership={car.ownership} />
            {car.year && <span className="chip-mute">{car.year}</span>}
            <span className="chip-mute">{fmtDate(car.sale_date)}</span>
          </div>
          <div className="text-[16px] font-semibold truncate">
            {car.brand} <span className="text-ink-dim font-normal">{car.model}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <Metric label="Купил" value={fmtMoney(car.purchase_price)} />
            <Metric label="Продал" value={fmtMoney(car.sale_price)} accent="gold" />
            <Metric
              label="Моя прибыль"
              value={fmtMoney(car.profit_my, { sign: true })}
              className={profitColor}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  className,
  accent,
}: {
  label: string;
  value: string;
  className?: string;
  accent?: "gold";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-mute">{label}</div>
      <div
        className={`font-semibold text-[13.5px] tnum ${accent === "gold" ? "text-neon-gold" : ""} ${className ?? ""}`}
      >
        {value}
      </div>
    </div>
  );
}

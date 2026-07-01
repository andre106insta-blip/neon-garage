import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Car, OwnershipBreakdown, Stats } from "../lib/types";
import { fmtMoney } from "../lib/format";
import { CarAvatar } from "../components/CarAvatar";
import { Icon, IconName } from "../components/Icon";
import InstallHint from "../components/InstallHint";
import { DashboardSkeleton } from "../components/Skeleton";
import { OwnershipBadge } from "../components/OwnershipBadge";
import { StatusChip } from "../components/StatusChip";

function monthLabel(): string {
  const months = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];
  return months[new Date().getMonth()];
}

function StatTile({
  icon,
  label,
  value,
  hint,
  emphasize,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  emphasize?: "gold" | "green";
}) {
  const valColor =
    emphasize === "gold" ? "text-neon-gold" : emphasize === "green" ? "text-neon-green" : "text-ink";
  const iconColor =
    emphasize === "gold" ? "text-neon-gold" : emphasize === "green" ? "text-neon-green" : "text-ink-dim";
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold">
          {label}
        </span>
        <span className={iconColor}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className={`mt-2.5 text-[23px] font-bold tracking-tight2 tnum ${valColor}`}>{value}</div>
      {hint && <div className="text-[12px] text-ink-mute mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.listCars()])
      .then(([s, c]) => {
        setStats(s);
        setCars(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <DashboardSkeleton />;

  const lastInWork = cars.filter((c) => c.status === "in_work").slice(0, 3);
  const recentSold = cars.filter((c) => c.status === "sold").slice(0, 3);
  const bestCar = stats.best_car_id ? cars.find((c) => c.id === stats.best_car_id) : null;
  const bestCarLabel = bestCar
    ? [bestCar.brand, bestCar.model, bestCar.year].filter(Boolean).join(" ")
    : undefined;

  return (
    <div className="space-y-4 pt-1">
      <InstallHint />

      {/* Hero — прибыль за месяц + за всё время */}
      <div className="card p-5 relative overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(circle, #e5c07b 0%, transparent 70%)", filter: "blur(24px)" }}
        />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold flex items-center gap-1.5">
            <span className="text-neon-gold"><Icon name="flame" size={14} strokeWidth={2} /></span>
            <span>Прибыль за {monthLabel()}</span>
          </div>
          <div className="mt-2 text-[40px] font-bold tracking-tight2 text-neon-gold leading-none tnum glow-gold">
            {fmtMoney(stats.profit_month)}
          </div>

          <div className="mt-4 pt-3.5 border-t border-bg-line flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold">
                За всё время
              </div>
              <div className="mt-1 text-[22px] font-bold tracking-tight2 text-ink leading-none tnum">
                {fmtMoney(stats.profit_total)}
              </div>
            </div>
            <span className="text-ink-mute"><Icon name="wallet" size={26} strokeWidth={1.5} /></span>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap text-[12px]">
            <span className="chip-mute" title="Сумма всех покупок авто">
              Оборот · <span className="tnum">{fmtMoney(stats.turnover)}</span>
            </span>
            <span className="chip-mute" title="Деньги, сейчас вложенные в авто в работе">
              Вложено · <span className="tnum">{fmtMoney(stats.invested_total)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon="car" label="Машин" value={String(stats.cars_total)} hint={`${stats.cars_in_work} в работе`} />
        <StatTile icon="sold" label="Продано" value={String(stats.cars_sold)} emphasize="green" />
        <StatTile icon="trending-up" label="Средняя прибыль" value={fmtMoney(stats.profit_avg)} />
        <StatTile icon="trophy" label="Максимум" value={fmtMoney(stats.profit_max)} emphasize="gold" hint={bestCarLabel} />
      </div>

      {/* Разбивка по типам владения */}
      <section>
        <SectionHeader title="По типам" link="/cars" />
        <div className="grid grid-cols-3 gap-2">
          <BreakdownTile icon="user" label="Соло" data={stats.by_solo} link="/cars?own=solo" />
          <BreakdownTile icon="handshake" label="На двоих" data={stats.by_co_buyer} link="/cars?own=co_buyer" />
          <BreakdownTile icon="pie" label="50 / 50" data={stats.by_half} link="/cars?own=half" />
        </div>
      </section>

      {lastInWork.length > 0 && (
        <section>
          <SectionHeader title="В работе" link="/cars" />
          <div className="space-y-2">
            {lastInWork.map((c) => (
              <CarRow key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}

      {recentSold.length > 0 && (
        <section>
          <SectionHeader title="Недавно проданные" link="/sold" />
          <div className="space-y-2">
            {recentSold.map((c) => (
              <CarRow key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}

      {cars.length === 0 && (
        <div className="card p-8 text-center">
          <div className="icon-tile w-14 h-14 mx-auto mb-3 bg-white/[0.05] text-ink-dim">
            <Icon name="car" size={28} strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold mb-1">Гараж пуст</div>
          <div className="text-sm text-ink-dim mb-5">Добавь первую машину чтобы начать учёт.</div>
          <Link to="/cars" className="btn-primary inline-flex">
            <Icon name="plus" size={18} strokeWidth={2} /> Добавить авто
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between mt-1 mb-2 px-0.5">
      <h2 className="text-[11px] uppercase tracking-widest2 text-ink-mute font-semibold">{title}</h2>
      <Link to={link} className="text-[12px] text-ink-dim hover:text-ink flex items-center gap-0.5">
        Все <Icon name="chevron-right" size={13} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

function CarRow({ car }: { car: Car }) {
  return (
    <Link to={`/cars/${car.id}`} className="card p-3 flex items-center gap-3 active:scale-[0.99] transition">
      <CarAvatar photoUrl={car.photo_url} thumbUrl={car.thumb_url} color={car.color} size={46} rounded={13} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate text-[15px]">
          {car.brand} <span className="text-ink-dim font-normal">{car.model}</span>
          {car.year ? <span className="text-ink-mute ml-1 text-[13px]">· {car.year}</span> : null}
        </div>
        <div className="text-xs text-ink-mute mt-1 flex items-center gap-1.5 flex-wrap">
          <StatusChip status={car.status} />
          <OwnershipBadge ownership={car.ownership} />
          {car.profit_my != null && (
            <span className={`font-semibold text-[12px] tnum ml-0.5 ${car.profit_my >= 0 ? "text-neon-green" : "text-neon-red"}`}>
              {fmtMoney(car.profit_my, { sign: true })}
            </span>
          )}
        </div>
      </div>
      <span className="text-ink-mute shrink-0"><Icon name="chevron-right" size={18} /></span>
    </Link>
  );
}

function BreakdownTile({
  icon,
  label,
  data,
  link,
}: {
  icon: IconName;
  label: string;
  data: OwnershipBreakdown;
  link: string;
}) {
  const isEmpty = data.count === 0;
  return (
    <Link to={link} className={`card p-3 ${isEmpty ? "opacity-45" : ""} active:scale-[0.98] transition`}>
      <span className="text-ink-dim"><Icon name={icon} size={17} /></span>
      <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold mt-2">{label}</div>
      <div className="font-bold text-[19px] mt-1 tracking-tight2 text-ink tnum">{data.count}</div>
      <div className="text-[11px] text-ink-mute mt-0.5 tnum">{fmtMoney(data.profit_my)}</div>
    </Link>
  );
}

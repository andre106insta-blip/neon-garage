import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import Loader from "../components/Loader";
import { api } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import type { Car, Plan } from "../lib/types";

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cars, setCars] = useState<Record<number, Car>>({});
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = async () => {
    const [p, c] = await Promise.all([api.listPlans(), api.listCars()]);
    setPlans(p);
    setCars(Object.fromEntries(c.map((x) => [x.id, x])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => plans.filter((p) => (showDone ? true : !p.done)),
    [plans, showDone],
  );

  const groups = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; items: Plan[] }[] = [
      { key: "overdue", label: "Просрочено", items: [] },
      { key: "today", label: "Сегодня", items: [] },
      { key: "tomorrow", label: "Завтра", items: [] },
      { key: "week", label: "На неделе", items: [] },
      { key: "later", label: "Позже", items: [] },
      { key: "done", label: "Готово", items: [] },
    ];
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startTomorrow = startToday + 24 * 3600 * 1000;
    const endTomorrow = startTomorrow + 24 * 3600 * 1000;
    const endWeek = startToday + 7 * 24 * 3600 * 1000;

    for (const p of visible) {
      if (p.done) {
        buckets.find((b) => b.key === "done")!.items.push(p);
        continue;
      }
      const t = new Date(p.scheduled_at).getTime();
      if (t < now.getTime()) buckets[0].items.push(p);
      else if (t < startTomorrow) buckets[1].items.push(p);
      else if (t < endTomorrow) buckets[2].items.push(p);
      else if (t < endWeek) buckets[3].items.push(p);
      else buckets[4].items.push(p);
    }
    return buckets.filter((b) => b.items.length);
  }, [visible]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-ink-mute">{plans.filter((p) => !p.done).length} активных</div>
        <button
          onClick={() => setShowDone((s) => !s)}
          className={`chip cursor-pointer ${showDone ? "chip-green" : "chip-mute"}`}
        >
          {showDone ? "Готовые показаны" : "Показать готовые"}
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="icon-tile w-14 h-14 mx-auto mb-3 bg-white/[0.05] text-ink-dim">
            <Icon name="calendar" size={28} strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold mb-1">Планов нет</div>
          <div className="text-sm text-ink-dim">
            Открой карточку авто и добавь план — бот напомнит вовремя.
          </div>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            <h3
              className="text-[11px] uppercase tracking-widest2 font-semibold mb-2 px-0.5 text-ink-mute"
              style={
                g.key === "overdue"
                  ? { color: "#f6465d" }
                  : g.key === "today"
                    ? { color: "#f0b73d" }
                    : undefined
              }
            >
              {g.label}
            </h3>
            <div className="space-y-2">
              {g.items.map((p) => {
                const car = cars[p.car_id];
                return (
                  <Link
                    to={car ? `/cars/${car.id}` : "/plans"}
                    key={p.id}
                    className={`card p-3.5 flex items-start gap-3 active:scale-[0.99] transition ${
                      p.done ? "opacity-60" : ""
                    }`}
                  >
                    <div className="icon-tile w-10 h-10 bg-white/[0.05] border border-bg-line text-ink-dim shrink-0">
                      <Icon name="calendar" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-[14px] ${p.done ? "line-through text-ink-dim" : "text-ink"}`}>
                        {p.title}
                      </div>
                      <div className="text-[12px] text-ink-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {car && (
                          <span className="text-ink-dim">
                            {car.brand} {car.model}
                          </span>
                        )}
                        <span className="text-ink-mute">·</span>
                        <span>{fmtDateTime(p.scheduled_at)}</span>
                        {p.location && (
                          <>
                            <span className="text-ink-mute">·</span>
                            <span>{p.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CarAvatar } from "../components/CarAvatar";
import { Icon, IconName } from "../components/Icon";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import { OwnershipBadge } from "../components/OwnershipBadge";
import { PhotoPicker } from "../components/PhotoPicker";
import { StatusChip } from "../components/StatusChip";
import { api } from "../lib/api";
import { fmtDate, fmtDateTime, fmtMoney, fromDateInput, toDateInput, toISOLocal, todayDateInput } from "../lib/format";
import { OWNERSHIPS, ownershipMeta } from "../lib/ownership";
import { tgAlert, tgConfirm, tgHaptic } from "../lib/tg";
import type { Car, CarStatus, Expense, Ownership, Plan, Settlement } from "../lib/types";

const EXPENSE_CATEGORIES = ["запчасти", "работа", "доставка", "оформление", "мойка", "топливо", "прочее"];

export default function CarDetail() {
  const { id } = useParams();
  const carId = Number(id);
  const nav = useNavigate();

  const [car, setCar] = useState<Car | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const load = async () => {
    const [c, ex, pl] = await Promise.all([
      api.getCar(carId),
      api.listExpenses(carId),
      api.listCarPlans(carId),
    ]);
    setCar(c);
    setExpenses(ex);
    setPlans(pl);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  if (loading || !car) return <Loader />;

  const setStatus = async (status: CarStatus) => {
    await api.updateCar(car.id, { status });
    load();
  };

  const remove = async () => {
    const ok = await tgConfirm(
      `Удалить ${car.brand} ${car.model}?\n\nВсе расходы и планы по этой машине тоже удалятся. Суммы пересчитаются в статистике.`,
    );
    if (!ok) return;
    try {
      await api.deleteCar(car.id);
      tgHaptic("success");
      nav("/cars", { replace: true });
    } catch (e: any) {
      tgHaptic("error");
      await tgAlert("Не удалось удалить: " + (e?.message || "неизвестная ошибка"));
    }
  };

  const profitColor =
    car.profit_my == null ? "" : car.profit_my >= 0 ? "text-neon-green" : "text-neon-red";
  const isShared = car.ownership !== "solo";
  const ownMeta = ownershipMeta(car.ownership);

  return (
    <div className="space-y-4 pt-1">
      <button
        onClick={() => nav(-1)}
        className="text-sm text-ink-dim hover:text-ink flex items-center gap-1"
      >
        <Icon name="arrow-left" size={16} strokeWidth={2} /> Назад
      </button>

      {/* Шапка авто */}
      <div className="card p-5 relative">
        <button
          onClick={remove}
          aria-label="Удалить машину"
          className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-bg-line text-ink-dim active:bg-neon-red/15 active:text-neon-red active:border-neon-red/40 transition"
        >
          <Icon name="trash" size={17} />
        </button>

        <div className="flex items-start gap-3.5 pr-10">
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="Изменить фото"
            className="shrink-0 active:scale-95 transition"
          >
            <CarAvatar photoUrl={car.photo_url} thumbUrl={car.thumb_url} color={car.color} size={76} rounded={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <StatusChip status={car.status} />
              <button onClick={() => setOwnOpen(true)} className="cursor-pointer">
                <OwnershipBadge ownership={car.ownership} />
              </button>
              {car.year && <span className="chip-mute">{car.year}</span>}
              {car.color && <span className="chip-mute">{car.color}</span>}
            </div>
            <div className="text-[22px] font-semibold tracking-tightish leading-tight">
              {car.brand} <span className="text-ink-dim font-normal">{car.model}</span>
            </div>
          </div>
        </div>
        {isShared && car.partner_name && (
          <div className="text-[12px] text-ink-mute mt-1">с {car.partner_name}</div>
        )}
        {car.vin && <div className="text-[11px] text-ink-mute tnum mt-1.5">VIN · {car.vin}</div>}
        {car.mileage != null && (
          <div className="text-[12px] text-ink-mute mt-1">{car.mileage.toLocaleString("ru-RU")} км</div>
        )}
        {car.notes && (
          <div className="mt-3 text-[13px] text-ink-dim whitespace-pre-wrap">{car.notes}</div>
        )}
      </div>

      {/* Подсказка по типу владения */}
      {isShared && (
        <div className="card p-3 text-xs text-ink-dim flex items-start gap-2.5">
          <span className={`icon-tile w-8 h-8 shrink-0 ${car.ownership === "half" ? "bg-neon-violet/12 text-neon-violet" : "bg-neon-gold/12 text-neon-gold"}`}>
            <Icon name={car.ownership === "half" ? "pie" : "handshake"} size={16} />
          </span>
          <div>
            <div className="text-ink font-semibold">{ownMeta.label}</div>
            <div>{ownMeta.hint}</div>
          </div>
        </div>
      )}

      {/* Расчёт между совладельцами после продажи */}
      {car.settlement && car.status === "sold" && (
        <SettlementCard settlement={car.settlement} />
      )}

      {/* Финансы */}
      <div className="grid grid-cols-2 gap-2.5">
        <FinTile icon="bag" label="Куплено" value={fmtMoney(car.purchase_price)} sub={fmtDate(car.purchase_date)} />
        <FinTile icon="wrench" label="Расходы" value={fmtMoney(car.expenses_total)} sub={`${expenses.length} записей`} />
        <FinTile
          icon="wallet"
          label={isShared ? "Моя доля вложений" : "Всего вложено"}
          value={fmtMoney(car.invested_my)}
          sub={isShared ? `из ${fmtMoney(car.invested_full)} · ${Math.round(car.share_invest * 100)}%` : undefined}
        />
        {car.status === "sold" ? (
          <FinTile
            icon="trending-up"
            label={isShared ? "Моя прибыль" : "Прибыль"}
            value={fmtMoney(car.profit_my, { sign: true })}
            sub={
              isShared
                ? `${fmtMoney(car.profit_full, { sign: true })} · ${Math.round(car.share_profit * 100)}%`
                : fmtDate(car.sale_date)
            }
            accent="green"
            className={profitColor}
          />
        ) : (
          <FinTile icon="target" label="Цель продажи" value={fmtMoney(car.sale_price)} accent="gold" />
        )}
      </div>

      {/* Действия со статусом */}
      <div className="flex gap-2">
        {car.status !== "sold" && (
          <button className="btn-primary flex-1" onClick={() => setSellOpen(true)}>
            <Icon name="coins" size={18} /> Продать
          </button>
        )}
        {car.status === "sold" && (
          <>
            <button className="btn-primary flex-1" onClick={() => setSellOpen(true)}>
              <Icon name="pencil" size={17} /> Изменить продажу
            </button>
            <button className="btn-ghost px-3.5" onClick={() => setStatus("in_work")} title="Вернуть в работу">
              <Icon name="rotate" size={18} />
            </button>
          </>
        )}
        {car.status !== "archived" ? (
          <button className="btn-ghost px-3.5" onClick={() => setStatus("archived")} title="В архив">
            <Icon name="archive" size={18} />
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => setStatus("in_work")}>Из архива</button>
        )}
      </div>

      {/* Расходы */}
      <section>
        <SectionHead title="Расходы" action={<AddBtn onClick={() => setExpenseOpen(true)} />} />
        {expenses.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-dim">Расходов пока нет</div>
        ) : (
          <div className="card divide-y divide-white/[0.06]">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{e.description || e.category}</div>
                  <div className="text-xs text-ink-mute mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="chip-mute">{e.category}</span>
                    {isShared && car.ownership === "half" && (
                      <span className={e.paid_by === "partner" ? "chip-violet" : "chip-gold"}>
                        {e.paid_by === "partner" ? car.partner_name || "Партнёр" : "Я"}
                      </span>
                    )}
                    <span>{fmtDate(e.date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-ink tnum">{fmtMoney(e.amount)}</div>
                  <button
                    className="text-ink-mute hover:text-neon-red p-1.5"
                    onClick={async () => {
                      if (await tgConfirm(`Удалить расход ${fmtMoney(e.amount)}?`)) {
                        await api.deleteExpense(car.id, e.id);
                        tgHaptic("success");
                        load();
                      }
                    }}
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Планы */}
      <section>
        <SectionHead title="Планы" action={<AddBtn onClick={() => setPlanOpen(true)} />} />
        {plans.length === 0 ? (
          <div className="card p-5 text-center text-sm text-ink-dim">Планов нет</div>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <button onClick={remove} className="btn-danger w-full mt-6">
        <Icon name="trash" size={18} /> Удалить машину навсегда
      </button>
      <div className="text-[11px] text-ink-mute text-center mt-2">
        Расходы и планы тоже удалятся, суммы уйдут из статистики
      </div>

      <ExpenseModal
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onCreated={() => {
          setExpenseOpen(false);
          load();
        }}
        car={car}
      />
      <PlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onCreated={() => {
          setPlanOpen(false);
          load();
        }}
        carId={car.id}
      />
      <SellModal
        open={sellOpen}
        car={car}
        onClose={() => setSellOpen(false)}
        onDone={() => {
          setSellOpen(false);
          load();
        }}
      />

      <OwnershipModal
        open={ownOpen}
        car={car}
        onClose={() => setOwnOpen(false)}
        onDone={() => {
          setOwnOpen(false);
          load();
        }}
      />

      <PhotoModal
        open={photoOpen}
        car={car}
        onClose={() => setPhotoOpen(false)}
        onDone={() => {
          setPhotoOpen(false);
          load();
        }}
      />
    </div>
  );
}

function PhotoModal({
  open,
  car,
  onClose,
  onDone,
}: {
  open: boolean;
  car: Car;
  onClose: () => void;
  onDone: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(car.photo_url ?? null);
  const [busy, setBusy] = useState(false);

  // подхватываем актуальное фото каждый раз при открытии
  useEffect(() => {
    if (open) setPhoto(car.photo_url ?? null);
  }, [open, car.photo_url]);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateCar(car.id, { photo_url: photo });
      tgHaptic("success");
      onDone();
    } catch (e: any) {
      tgHaptic("error");
      await tgAlert("Не удалось сохранить: " + (e?.message || "ошибка"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Фото машины">
      <div className="space-y-4">
        <PhotoPicker value={photo} onChange={setPhoto} size={120} />
        <div className="text-[12px] text-ink-mute leading-snug">
          Без фото показываю силуэт авто, окрашенный в указанный цвет. Открой
          снимок из галереи или сделай фото — оно будет иконкой в гараже.
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="btn-primary flex-1" onClick={save} disabled={busy}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SettlementCard({ settlement }: { settlement: Settlement }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold flex items-center gap-1.5">
          <span className="text-neon-gold"><Icon name="handshake" size={14} /></span>
          <span>Расчёт после продажи</span>
        </div>
        <div className="text-[11px] text-ink-mute">
          Продано · <span className="tnum text-ink">{fmtMoney(settlement.sale_price)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <PartyBlock party={settlement.me} accent="gold" />
        <PartyBlock party={settlement.partner} accent="violet" />
      </div>
      <div className="mt-3 pt-3 border-t border-bg-line text-[11px] text-ink-mute flex items-center justify-between">
        <span>Чистая прибыль</span>
        <span className={`font-semibold tnum ${settlement.net_profit >= 0 ? "text-neon-green" : "text-neon-red"}`}>
          {fmtMoney(settlement.net_profit, { sign: true })}
        </span>
      </div>
    </div>
  );
}

function PartyBlock({
  party,
  accent,
}: {
  party: Settlement["me"];
  accent: "gold" | "violet";
}) {
  const accentColor = accent === "gold" ? "text-neon-gold" : "text-neon-violet";
  const borderColor = accent === "gold" ? "border-neon-gold/30" : "border-neon-violet/25";
  return (
    <div className={`rounded-xl border ${borderColor} bg-white/[0.02] p-3`}>
      <div className={`text-[11px] uppercase tracking-wider font-semibold ${accentColor}`}>
        {party.name}
      </div>
      <div className={`mt-1.5 text-[18px] font-bold tracking-tight2 tnum ${accentColor} leading-none`}>
        {fmtMoney(party.take)}
      </div>
      <div className="mt-2.5 space-y-0.5 text-[11px] text-ink-mute">
        {party.purchase > 0 && (
          <PartyRow label="Покупка" value={fmtMoney(party.purchase)} />
        )}
        {party.expenses > 0 && (
          <PartyRow label="Расходы" value={fmtMoney(party.expenses)} />
        )}
        <PartyRow
          label="Прибыль"
          value={fmtMoney(party.profit, { sign: true })}
          valueClass={party.profit >= 0 ? "text-neon-green" : "text-neon-red"}
        />
      </div>
    </div>
  );
}

function PartyRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className={`tnum ${valueClass ?? "text-ink-dim"}`}>{value}</span>
    </div>
  );
}

function FinTile({
  icon,
  label,
  value,
  sub,
  accent,
  className,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "gold";
  className?: string;
}) {
  const color =
    accent === "green" ? "text-neon-green" : accent === "gold" ? "text-neon-gold" : "text-ink";
  const iconColor =
    accent === "green" ? "text-neon-green" : accent === "gold" ? "text-neon-gold" : "text-ink-dim";
  return (
    <div className="card p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest2 text-ink-mute font-semibold">
          {label}
        </span>
        <span className={iconColor}>
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className={`mt-2 font-bold text-[17px] tracking-tight2 tnum ${color} ${className ?? ""}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-mute mt-1">{sub}</div>}
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <h2 className="text-[11px] uppercase tracking-widest2 text-ink-mute font-semibold">{title}</h2>
      {action}
    </div>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="btn-ghost btn-sm flex items-center gap-1"
      onClick={onClick}
    >
      <Icon name="plus" size={15} strokeWidth={2.2} /> добавить
    </button>
  );
}

function PlanCard({ plan, onChanged }: { plan: Plan; onChanged: () => void }) {
  const done = !!plan.done;
  return (
    <div className={`card p-3.5 ${done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={async () => {
            await api.updatePlan(plan.id, { done: !done });
            tgHaptic("light");
            onChanged();
          }}
          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
            done
              ? "bg-neon-green/15 border-neon-green/60 text-neon-green"
              : "border-white/15 hover:border-white/30"
          }`}
        >
          {done && <Icon name="check" size={13} strokeWidth={2.5} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${done ? "line-through text-ink-dim" : ""}`}>{plan.title}</div>
          <div className="text-xs text-ink-mute mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="chip-mute"><Icon name="clock" size={11} /> {fmtDateTime(plan.scheduled_at)}</span>
            {plan.location && <span className="chip-mute"><Icon name="pin" size={11} /> {plan.location}</span>}
          </div>
          {plan.description && <div className="text-sm text-ink-dim mt-2 whitespace-pre-wrap">{plan.description}</div>}
        </div>
        <button
          className="text-ink-mute hover:text-neon-red p-1 shrink-0"
          onClick={async () => {
            if (await tgConfirm(`Удалить план «${plan.title}»?`)) {
              await api.deletePlan(plan.id);
              tgHaptic("success");
              onChanged();
            }
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}

function ExpenseModal({
  open,
  onClose,
  onCreated,
  car,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  car: Car;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("запчасти");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "partner">("me");
  const [busy, setBusy] = useState(false);
  const isHalf = car.ownership === "half";
  const partnerName = car.partner_name || "партнёр";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createExpense(car.id, {
        amount: Number(amount),
        category,
        description: description || undefined,
        paid_by: isHalf ? paidBy : "me",
      });
      setAmount("");
      setDescription("");
      setPaidBy("me");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый расход">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <div className="label">Сумма</div>
          <input
            className="input text-lg tnum"
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </label>

        {isHalf && (
          <div>
            <div className="label">Кто заплатил</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidBy("me")}
                className={`rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition ${
                  paidBy === "me"
                    ? "bg-neon-gold/15 text-neon-gold border-neon-gold/40"
                    : "bg-white/[0.02] border-white/[0.08] text-ink-mute"
                }`}
              >
                Я
              </button>
              <button
                type="button"
                onClick={() => setPaidBy("partner")}
                className={`rounded-xl border px-2 py-2.5 text-[13px] font-semibold transition ${
                  paidBy === "partner"
                    ? "bg-neon-violet/15 text-neon-violet border-neon-violet/40"
                    : "bg-white/[0.02] border-white/[0.08] text-ink-mute"
                }`}
              >
                {partnerName}
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="label">Категория</div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`chip cursor-pointer ${
                  category === c
                    ? "bg-neon-gold/15 text-neon-gold border border-neon-gold/40"
                    : "bg-white/[0.04] text-ink-mute border border-white/[0.08]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <div className="label">Описание</div>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Тормозные колодки + диски"
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? "…" : "Добавить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlanModal({
  open,
  onClose,
  onCreated,
  carId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  carId: number;
}) {
  const defaultDt = toISOLocal(new Date(Date.now() + 60 * 60 * 1000));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [scheduled, setScheduled] = useState(defaultDt);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createPlan(carId, {
        title,
        description: description || undefined,
        location: location || undefined,
        scheduled_at: new Date(scheduled).toISOString(),
      });
      setTitle("");
      setDescription("");
      setLocation("");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый план">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <div className="label">Что нужно сделать</div>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Встреча с покупателем"
          />
        </label>
        <label className="block">
          <div className="label">Когда</div>
          <input
            className="input tnum"
            required
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
          />
          <div className="text-[11px] text-ink-mute mt-1">
            Бот напомнит за 24 ч, 12 ч и за 2 ч до начала.
          </div>
        </label>
        <label className="block">
          <div className="label">Где</div>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Москва, авторынок Северный"
          />
        </label>
        <label className="block">
          <div className="label">Описание</div>
          <textarea
            className="input min-h-[70px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? "…" : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SellModal({
  open,
  car,
  onClose,
  onDone,
}: {
  open: boolean;
  car: Car;
  onClose: () => void;
  onDone: () => void;
}) {
  const [price, setPrice] = useState(car.sale_price ? String(car.sale_price) : "");
  const [date, setDate] = useState(toDateInput(car.sale_date) || todayDateInput());
  const [busy, setBusy] = useState(false);

  const wasSold = car.status === "sold";

  useEffect(() => {
    if (open) {
      setPrice(car.sale_price ? String(car.sale_price) : "");
      setDate(toDateInput(car.sale_date) || todayDateInput());
    }
  }, [open, car.sale_price, car.sale_date]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateCar(car.id, {
        status: "sold",
        sale_price: Number(price),
        sale_date: fromDateInput(date) || new Date().toISOString(),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const projectedFull = price ? Number(price) - car.invested_full : null;
  const projectedMy = projectedFull != null ? projectedFull * car.share_profit : null;
  const isShared = car.ownership !== "solo";

  // Live-расчёт settlement для совместных машин (предпросмотр до подтверждения)
  const previewSettlement = (() => {
    if (!price || !isShared) return null;
    const salePrice = Number(price);
    const expensesFull = car.expenses_total;
    const net = salePrice - car.invested_full;

    if (car.ownership === "co_buyer") {
      const halfProfit = net / 2;
      return {
        sale_price: salePrice,
        invested_full: car.invested_full,
        net_profit: net,
        me: {
          name: "Я",
          purchase: car.purchase_price,
          expenses: expensesFull,
          invested: car.invested_full,
          profit: halfProfit,
          take: car.invested_full + halfProfit,
        },
        partner: {
          name: car.partner_name || "Партнёр",
          purchase: 0,
          expenses: 0,
          invested: 0,
          profit: halfProfit,
          take: halfProfit,
        },
      } as Settlement;
    }

    // half
    const partnerPurchase = car.purchase_paid_by_partner || 0;
    const myPurchase = Math.max(0, car.purchase_price - partnerPurchase);
    // Точных paid_by по расходам у нас нет в этом модуле — берём то, что уже считал бэк
    const myExpenses = car.invested_my - myPurchase;
    const partnerExpenses = expensesFull - myExpenses;
    const myInvested = myPurchase + myExpenses;
    const partnerInvested = partnerPurchase + partnerExpenses;
    const halfProfit = net / 2;
    return {
      sale_price: salePrice,
      invested_full: car.invested_full,
      net_profit: net,
      me: {
        name: "Я",
        purchase: myPurchase,
        expenses: myExpenses,
        invested: myInvested,
        profit: halfProfit,
        take: myInvested + halfProfit,
      },
      partner: {
        name: car.partner_name || "Партнёр",
        purchase: partnerPurchase,
        expenses: partnerExpenses,
        invested: partnerInvested,
        profit: halfProfit,
        take: partnerInvested + halfProfit,
      },
    } as Settlement;
  })();

  return (
    <Modal open={open} onClose={onClose} title={wasSold ? "Изменить продажу" : "Продажа авто"}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <div className="label">Цена продажи</div>
          <input
            className="input text-xl tnum"
            type="number"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            autoFocus={!wasSold}
          />
        </label>
        <label className="block">
          <div className="label">Дата продажи</div>
          <input
            className="input tnum"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {previewSettlement ? (
          <SettlementCard settlement={previewSettlement} />
        ) : (
          <div className="card p-3 text-sm space-y-1.5">
            <Row label="Вложено всего" value={fmtMoney(car.invested_full)} />
            {projectedFull != null && (
              <>
                <div className="h-px bg-white/5 my-1" />
                <Row
                  label="Прибыль"
                  value={fmtMoney(projectedFull, { sign: true })}
                  valueClass={`font-bold ${
                    projectedFull >= 0 ? "text-neon-green" : "text-neon-red"
                  }`}
                />
              </>
            )}
          </div>
        )}
        {/* временно глушим неиспользуемое */}
        <div className="hidden">{fmtMoney(projectedMy)}</div>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? "…" : wasSold ? "Сохранить" : "Подтвердить продажу"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Row({
  label,
  value,
  valueClass,
  dim,
}: {
  label: string;
  value: string;
  valueClass?: string;
  dim?: boolean;
}) {
  return (
    <div className={`flex justify-between ${dim ? "text-ink-dim text-xs" : ""}`}>
      <span>{label}</span>
      <span className={`tnum ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function OwnershipModal({
  open,
  car,
  onClose,
  onDone,
}: {
  open: boolean;
  car: Car;
  onClose: () => void;
  onDone: () => void;
}) {
  const [own, setOwn] = useState<Ownership>(car.ownership);
  const [partner, setPartner] = useState(car.partner_name ?? "");
  const [partnerPurchase, setPartnerPurchase] = useState(
    car.purchase_paid_by_partner ? String(car.purchase_paid_by_partner) : "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setOwn(car.ownership);
      setPartner(car.partner_name ?? "");
      setPartnerPurchase(
        car.purchase_paid_by_partner ? String(car.purchase_paid_by_partner) : "",
      );
    }
  }, [open, car.ownership, car.partner_name, car.purchase_paid_by_partner]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.updateCar(car.id, {
        ownership: own,
        partner_name: own === "solo" ? null : partner || null,
        purchase_paid_by_partner:
          own === "half"
            ? partnerPurchase
              ? Number(partnerPurchase)
              : car.purchase_price / 2
            : 0,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Тип владения">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {OWNERSHIPS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOwn(o.value)}
              className={`rounded-xl border px-2 py-2.5 text-[12px] font-semibold transition ${
                own === o.value
                  ? "bg-neon-gold/[0.10] text-neon-gold border-neon-gold/40"
                  : "bg-white/[0.02] border-white/[0.08] text-ink-mute hover:text-ink-dim"
              }`}
            >
              <div className="text-lg">{o.icon}</div>
              <div className="mt-0.5">{o.short}</div>
            </button>
          ))}
        </div>
        <div className="text-[12px] text-ink-dim">
          {ownershipMeta(own).hint}
        </div>
        {own !== "solo" && (
          <label className="block">
            <div className="label">Имя партнёра</div>
            <input
              className="input"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="Миша"
              required={own === "half"}
            />
          </label>
        )}
        {own === "half" && (
          <label className="block">
            <div className="label">
              Сколько вложил {partner || "партнёр"} в покупку
            </div>
            <input
              className="input"
              type="number"
              value={partnerPurchase}
              onChange={(e) => setPartnerPurchase(e.target.value)}
              placeholder={String(Math.round((car.purchase_price || 0) / 2))}
            />
            <div className="text-[11px] text-ink-mute mt-1">
              Остаток — твой вклад. По умолчанию пополам.
            </div>
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
          <button type="button" className="btn-primary flex-1" onClick={submit} disabled={busy}>
            {busy ? "…" : "Сохранить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

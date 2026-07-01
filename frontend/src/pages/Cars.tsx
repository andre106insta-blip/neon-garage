import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CarAvatar } from "../components/CarAvatar";
import { Icon, IconName } from "../components/Icon";
import { CardListSkeleton } from "../components/Skeleton";
import Modal from "../components/Modal";
import { PhotoPicker } from "../components/PhotoPicker";
import { OwnershipBadge } from "../components/OwnershipBadge";
import { api } from "../lib/api";
import { fmtMoney, fromDateInput, todayDateInput } from "../lib/format";
import { OWNERSHIPS } from "../lib/ownership";
import type { Car, Ownership } from "../lib/types";

const OWN_FILTERS: { value: Ownership | "all"; label: string; icon: IconName | null }[] = [
  { value: "all", label: "Все типы", icon: null },
  { value: "solo", label: "Соло", icon: "user" },
  { value: "co_buyer", label: "На двоих", icon: "handshake" },
  { value: "half", label: "50/50", icon: "pie" },
];

export default function Cars() {
  const [params, setParams] = useSearchParams();
  const initialOwn = (params.get("own") as Ownership | "all") || "all";
  const [cars, setCars] = useState<Car[]>([]);
  const [ownFilter, setOwnFilter] = useState<Ownership | "all">(
    ["solo", "co_buyer", "half", "all"].includes(initialOwn) ? initialOwn : "all",
  );
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const setOwn = (v: Ownership | "all") => {
    setOwnFilter(v);
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("own");
    else next.set("own", v);
    setParams(next, { replace: true });
  };

  const load = () => {
    setLoading(true);
    api.listCars("in_work").then((c) => {
      setCars(c);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const filtered = useMemo(
    () => cars.filter((c) => ownFilter === "all" || c.ownership === ownFilter),
    [cars, ownFilter],
  );

  return (
    <div className="space-y-3 pt-1">
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

      <button onClick={() => setAddOpen(true)} className="btn-primary w-full">
        <Icon name="plus" size={18} strokeWidth={2} /> Добавить машину
      </button>

      {loading ? (
        <CardListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center text-ink-dim">Ничего не найдено</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <CarCard key={c.id} car={c} />
          ))}
        </div>
      )}

      <AddCarModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

function CarCard({ car }: { car: Car }) {
  const isShared = car.ownership !== "solo";
  return (
    <Link to={`/cars/${car.id}`} className="card p-4 block active:scale-[0.99] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <OwnershipBadge ownership={car.ownership} />
            {car.year && <span className="chip-mute">{car.year}</span>}
          </div>
          <div className="text-lg font-bold truncate">
            {car.brand} <span className="text-ink-dim">{car.model}</span>
          </div>
          {car.partner_name && isShared && (
            <div className="text-[11px] text-ink-mute mt-0.5">с {car.partner_name}</div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <Metric label="Куплено" value={fmtMoney(car.purchase_price)} />
            <Metric label="Расходы" value={fmtMoney(car.expenses_total)} />
            <Metric
              label={isShared ? "Моя доля" : "Вложено"}
              value={fmtMoney(car.invested_my)}
              accent="violet"
              sub={isShared ? fmtMoney(car.invested_full) + " всего" : undefined}
            />
            <Metric label="Цель" value={fmtMoney(car.sale_price)} />
          </div>
        </div>
        <CarAvatar photoUrl={car.photo_url} thumbUrl={car.thumb_url} color={car.color} size={56} rounded={14} />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  className,
  accent,
  sub,
}: {
  label: string;
  value: string;
  className?: string;
  accent?: "violet";
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-mute">{label}</div>
      <div className={`font-semibold text-[13.5px] tnum ${accent === "violet" ? "text-ink" : ""} ${className ?? ""}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink-mute tnum mt-0.5">{sub}</div>}
    </div>
  );
}

function AddCarModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
    purchase_price: "",
    purchase_date: "",
    vin: "",
    color: "",
    mileage: "",
    notes: "",
    ownership: "solo" as Ownership,
    partner_name: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [soldNow, setSoldNow] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState(todayDateInput());
  // Только для 50/50: сколько внёс партнёр в покупку (по умолчанию пусто → backend выставит дефолт половины)
  const [partnerPurchase, setPartnerPurchase] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createCar({
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : 0,
        purchase_date: fromDateInput(form.purchase_date) || undefined,
        vin: form.vin || undefined,
        color: form.color || undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        notes: form.notes || undefined,
        ownership: form.ownership,
        partner_name: form.ownership === "solo" ? undefined : form.partner_name || undefined,
        // если 50/50 — сохраняем вклад партнёра; иначе всегда 0
        purchase_paid_by_partner:
          form.ownership === "half"
            ? partnerPurchase
              ? Number(partnerPurchase)
              : form.purchase_price
                ? Number(form.purchase_price) / 2
                : 0
            : 0,
        photo_url: photo || undefined,
        // если уже продана — создаём сразу с продажей
        status: soldNow ? "sold" : undefined,
        sale_price: soldNow && salePrice ? Number(salePrice) : undefined,
        sale_date: soldNow ? fromDateInput(saleDate) || undefined : undefined,
      });
      setForm({
        brand: "",
        model: "",
        year: "",
        purchase_price: "",
        purchase_date: "",
        vin: "",
        color: "",
        mileage: "",
        notes: "",
        ownership: "solo",
        partner_name: "",
      });
      setPhoto(null);
      setSoldNow(false);
      setSalePrice("");
      setSaleDate(todayDateInput());
      setPartnerPurchase("");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  const ownMeta = OWNERSHIPS.find((o) => o.value === form.ownership)!;

  return (
    <Modal open={open} onClose={onClose} title="Новая машина">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="label">Фото</div>
          <PhotoPicker value={photo} onChange={setPhoto} />
          <div className="text-[11px] text-ink-mute mt-1.5">
            Без фото — нарисую силуэт цветом из поля «Цвет».
          </div>
        </div>

        <div>
          <div className="label">Тип владения</div>
          <div className="grid grid-cols-3 gap-2">
            {OWNERSHIPS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm({ ...form, ownership: o.value })}
                className={`rounded-xl border px-2 py-2.5 text-[12px] font-semibold transition ${
                  form.ownership === o.value
                    ? "bg-neon-gold/[0.10] text-neon-gold border-neon-gold/40"
                    : "bg-white/[0.02] border-white/[0.08] text-ink-mute hover:text-ink-dim"
                }`}
              >
                <div className="text-lg">{o.icon}</div>
                <div className="mt-0.5">{o.short}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-ink-mute mt-1.5">{ownMeta.hint}</div>
        </div>

        {form.ownership !== "solo" && (
          <Field label={form.ownership === "half" ? "Имя партнёра (с кем 50/50)" : "Имя партнёра"}>
            <input
              className="input"
              value={form.partner_name}
              onChange={onChange("partner_name")}
              placeholder="Например: Миша"
              required={form.ownership === "half"}
            />
          </Field>
        )}

        {form.ownership === "half" && (
          <Field
            label={`Сколько вложил ${form.partner_name || "партнёр"} в покупку`}
          >
            <input
              className="input"
              type="number"
              value={partnerPurchase}
              onChange={(e) => setPartnerPurchase(e.target.value)}
              placeholder={
                form.purchase_price
                  ? String(Math.round(Number(form.purchase_price) / 2))
                  : "Если оставить пустым — поделим пополам"
              }
            />
            <div className="text-[11px] text-ink-mute mt-1">
              Остаток из «Цены покупки» — твой вклад. Расходы потом тоже можно
              помечать «Я платил» / «партнёр платил».
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Марка">
            <input className="input" required value={form.brand} onChange={onChange("brand")} placeholder="BMW" />
          </Field>
          <Field label="Модель">
            <input className="input" required value={form.model} onChange={onChange("model")} placeholder="X5" />
          </Field>
          <Field label="Год">
            <input className="input" type="number" value={form.year} onChange={onChange("year")} placeholder="2020" />
          </Field>
          <Field label="Цена покупки">
            <input
              className="input"
              type="number"
              required
              value={form.purchase_price}
              onChange={onChange("purchase_price")}
              placeholder="1500000"
            />
          </Field>
          <Field label="Дата покупки">
            <input
              className="input"
              type="date"
              value={form.purchase_date}
              onChange={onChange("purchase_date")}
            />
          </Field>
          <Field label="Цвет">
            <input className="input" value={form.color} onChange={onChange("color")} placeholder="Чёрный" />
          </Field>
          <Field label="Пробег">
            <input className="input" type="number" value={form.mileage} onChange={onChange("mileage")} placeholder="120000" />
          </Field>
        </div>
        <Field label="VIN">
          <input className="input" value={form.vin} onChange={onChange("vin")} placeholder="WBA…" />
        </Field>

        {/* Блок «уже продано» — для исторических машин */}
        <div className="rounded-[14px] border border-bg-line bg-white/[0.02] p-3">
          <button
            type="button"
            onClick={() => setSoldNow((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <div className="text-[14px] font-semibold text-ink">Машина уже продана</div>
              <div className="text-[11px] text-ink-mute mt-0.5">
                Добавить задним числом — для учёта старых сделок
              </div>
            </div>
            <span
              className={`relative w-[44px] h-[26px] rounded-full transition-colors shrink-0 ${
                soldNow ? "bg-neon-gold" : "bg-white/[0.12]"
              }`}
            >
              <span
                className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${
                  soldNow ? "left-[21px]" : "left-[3px]"
                }`}
              />
            </span>
          </button>
          {soldNow && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Цена продажи">
                <input
                  className="input"
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="1700000"
                />
              </Field>
              <Field label="Дата продажи">
                <input
                  className="input"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="Заметки">
          <textarea
            className="input min-h-[80px]"
            value={form.notes}
            onChange={onChange("notes")}
            placeholder="Где взял, состояние, договорённости…"
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy}>
            {busy ? "Сохраняю…" : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label">{label}</div>
      {children}
    </label>
  );
}

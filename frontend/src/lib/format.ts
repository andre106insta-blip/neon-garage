export const fmtMoney = (n: number | null | undefined, opts?: { sign?: boolean }): string => {
  if (n == null || isNaN(n as number)) return "—";
  const v = Math.round(n);
  const sign = opts?.sign && v > 0 ? "+" : "";
  return sign + v.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
};

export const fmtDate = (s?: string | null): string => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
};

export const fmtDateTime = (s?: string | null): string => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toISOLocal = (date: Date): string => {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
};

/** ISO → YYYY-MM-DD для input[type=date] */
export const toDateInput = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Используем локальное представление, чтобы день не «переезжал» из-за TZ
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** YYYY-MM-DD из input → ISO. Полдень местного времени, чтобы день не «съезжал» через UTC. */
export const fromDateInput = (s: string): string | null => {
  if (!s) return null;
  const d = new Date(s + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

/** YYYY-MM-DD на сегодня. */
export const todayDateInput = (): string => toDateInput(new Date().toISOString());

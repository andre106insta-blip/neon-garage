// Утилиты для работы с Telegram WebApp API. Всё с fallback'ами — будут работать и в обычном браузере.

const tg = () => (window as any).Telegram?.WebApp;

/** Подтверждение действия. На iOS Telegram нативный диалог надёжнее window.confirm. */
export function tgConfirm(message: string): Promise<boolean> {
  const t = tg();
  if (t?.showConfirm) {
    return new Promise((resolve) => {
      try {
        t.showConfirm(message, (ok: boolean) => resolve(!!ok));
      } catch {
        resolve(window.confirm(message));
      }
    });
  }
  return Promise.resolve(window.confirm(message));
}

/** Информационный алерт. */
export function tgAlert(message: string): Promise<void> {
  const t = tg();
  if (t?.showAlert) {
    return new Promise((resolve) => {
      try {
        t.showAlert(message, () => resolve());
      } catch {
        window.alert(message);
        resolve();
      }
    });
  }
  window.alert(message);
  return Promise.resolve();
}

/** Тактильный отклик при критических действиях. */
export function tgHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light",
): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  try {
    if (type === "success" || type === "warning" || type === "error") {
      h.notificationOccurred?.(type);
    } else {
      h.impactOccurred?.(type);
    }
  } catch {
    /* noop */
  }
}

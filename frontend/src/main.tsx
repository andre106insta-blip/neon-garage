import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

const tg = (window as any).Telegram?.WebApp;
const BG_HEX = "#1e2942";

// Запущено ли внутри Telegram (initData есть только в TG-вебвью)
const inTelegram =
  !!tg &&
  (typeof tg.initData === "string" ? tg.initData.length > 0 : false) ||
  (tg && tg.platform && tg.platform !== "unknown");

// PWA в standalone (с иконки на домашнем экране iOS)
const isStandalone =
  (window.matchMedia?.("(display-mode: standalone)").matches ?? false) ||
  (navigator as any).standalone === true;

document.documentElement.dataset.mode = inTelegram
  ? "telegram"
  : isStandalone
    ? "standalone"
    : "browser";

function applyHeight() {
  if (inTelegram) {
    const h =
      (tg.viewportStableHeight as number | undefined) ||
      (tg.viewportHeight as number | undefined) ||
      window.innerHeight;
    document.documentElement.style.setProperty("--tg-height", `${h}px`);
  } else {
    // В PWA / Safari полагаемся на 100dvh — он сам адаптируется под устройство
    // (учитывает чёлку, Dynamic Island, появление клавиатуры и т.п.)
    document.documentElement.style.setProperty("--tg-height", "100dvh");
  }
}

if (inTelegram) {
  try { tg.ready(); } catch { /* noop */ }
  try { tg.expand(); } catch { /* noop */ }
  try { tg.setHeaderColor(BG_HEX); } catch { /* noop */ }
  try { tg.setBackgroundColor(BG_HEX); } catch { /* noop */ }
  try { tg.setBottomBarColor?.(BG_HEX); } catch { /* noop */ }
  try { tg.disableVerticalSwipes?.(); } catch { /* noop */ }
  try { tg.enableClosingConfirmation?.(); } catch { /* noop */ }
  applyHeight();
  try { tg.onEvent?.("viewportChanged", applyHeight); } catch { /* noop */ }
} else {
  applyHeight();
  window.addEventListener("resize", applyHeight);
  // на iOS Safari при повороте/появлении адресной строки тоже пересчитать
  window.addEventListener("orientationchange", () => setTimeout(applyHeight, 100));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

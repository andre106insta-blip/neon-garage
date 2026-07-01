import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "matvey:install-hint-dismissed";

function shouldShow(): boolean {
  if (localStorage.getItem(KEY)) return false;
  const mode = document.documentElement.dataset.mode;
  if (mode !== "browser") return false;
  const ua = navigator.userAgent;
  // iPhone Safari (не Chrome iOS — там «На экран Домой» работает по-другому)
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(shouldShow());
  }, []);

  if (!show) return null;

  return (
    <div className="card p-3.5 flex items-start gap-3" style={{ borderColor: "rgba(229,192,123,0.3)" }}>
      <div className="icon-tile w-9 h-9 bg-neon-gold/12 text-neon-gold shrink-0">
        <Icon name="share" size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">Добавь на экран «Домой»</div>
        <div className="text-[12px] text-ink-dim mt-0.5 leading-snug">
          Поделиться <span className="text-ink-mute">›</span> На экран «Домой» — будет
          открываться как обычное приложение в полный экран.
        </div>
      </div>
      <button
        className="text-ink-mute hover:text-ink shrink-0 -mt-0.5"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setShow(false);
        }}
        aria-label="Скрыть"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

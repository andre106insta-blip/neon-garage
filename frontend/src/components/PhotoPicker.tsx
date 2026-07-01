import { useRef, useState } from "react";
import { compressImage } from "../lib/image";
import { tgAlert, tgHaptic } from "../lib/tg";
import { Icon } from "./Icon";

/**
 * Выбор фото с устройства (камера/галерея на iPhone), сжатие и превью.
 * Возвращает data-URL (`data:image/jpeg;base64,...`) или null если фото убрали.
 */
export function PhotoPicker({
  value,
  onChange,
  size = 96,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // чтобы можно было выбрать тот же файл снова
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      await tgAlert("Это не картинка");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, 900, 0.82);
      onChange(dataUrl);
      tgHaptic("success");
    } catch (err: any) {
      tgHaptic("error");
      await tgAlert("Не получилось обработать фото: " + (err?.message || "ошибка"));
    } finally {
      setBusy(false);
    }
  };

  const open = () => inputRef.current?.click();
  const clear = () => {
    onChange(null);
    tgHaptic("light");
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={open}
        className="relative overflow-hidden bg-white/[0.04] border border-bg-line rounded-2xl active:scale-95 transition flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-label="Выбрать фото"
      >
        {value ? (
          <img
            src={value}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-ink-dim">
            <Icon name="camera" size={26} strokeWidth={1.6} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Фото</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full animate-spin"
              style={{ border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#e0bd7a" }}
            />
          </div>
        )}
      </button>
      <div className="flex flex-col gap-1.5">
        <button type="button" className="btn-ghost text-[13px] py-2 px-3" onClick={open}>
          {value ? "Заменить" : "Выбрать фото"}
        </button>
        {value && (
          <button type="button" className="btn-danger text-[13px] py-2 px-3" onClick={clear}>
            Убрать
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

import { colorToHex } from "../lib/colors";

/**
 * SVG-силуэт автомобиля сбоку. Кузов окрашивается в цвет из поля «цвет».
 * Если цвет не распознан — нейтральный серебристый.
 */
export function CarSilhouette({
  color,
  className,
}: {
  color?: string | null;
  className?: string;
}) {
  const fill = colorToHex(color);
  const dark = darken(fill, 0.20);
  const light = lighten(fill, 0.14);
  const isLight = relLuminance(fill) > 0.55;
  const windowFill = isLight ? "rgba(20, 25, 35, 0.55)" : "rgba(230, 235, 245, 0.35)";
  // Уникальный id градиента — на случай нескольких машин на странице с одинаковым цветом
  const gid = `body-${fill.replace("#", "")}`;

  return (
    <svg viewBox="2 8 96 36" className={className} aria-hidden width="100%" height="100%">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="60%" stopColor={fill} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {/* тень */}
      <ellipse cx="50" cy="41" rx="38" ry="2" fill="rgba(0,0,0,0.45)" />

      {/* кузов */}
      <path
        d="
          M 8 35
          L 8 30
          Q 8 27.5 12 26
          L 28 23
          Q 32 15 40 12
          L 62 12
          Q 70 14 74 23
          L 90 26
          Q 94 27.5 94 30
          L 94 35
          Q 90 39 86 39
          L 72 39
          A 5.5 5.5 0 0 0 60 39
          L 40 39
          A 5.5 5.5 0 0 0 28 39
          L 14 39
          Q 10 39 8 35
          Z"
        fill={`url(#${gid})`}
      />

      {/* стёкла */}
      <path d="M 30 22 Q 32 15 40 13 L 50 13 L 50 22 Z" fill={windowFill} />
      <path d="M 50 13 L 60 13 Q 68 15 70 22 L 50 22 Z" fill={windowFill} />

      {/* блик на крыше */}
      <path d="M 36 13 Q 44 11.8 64 12.2 L 64 13.2 L 36 13.6 Z" fill="rgba(255,255,255,0.25)" />

      {/* колёса */}
      <circle cx="22" cy="39" r="6" fill="#161618" />
      <circle cx="22" cy="39" r="2.5" fill="#3a3a3f" />
      <circle cx="66" cy="39" r="6" fill="#161618" />
      <circle cx="66" cy="39" r="2.5" fill="#3a3a3f" />

      {/* фара */}
      <circle cx="91" cy="29" r="1.4" fill="#fff4c6" />
    </svg>
  );
}

// helpers
function clamp(n: number, a = 0, b = 1) { return Math.max(a, Math.min(b, n)); }
function parseHex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0").slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function toHex([r, g, b]: [number, number, number]) {
  return "#" + [r, g, b].map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0")).join("");
}
function lighten(h: string, k: number) {
  const [r, g, b] = parseHex(h);
  return toHex([r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k]);
}
function darken(h: string, k: number) {
  const [r, g, b] = parseHex(h);
  return toHex([r * (1 - k), g * (1 - k), b * (1 - k)]);
}
function relLuminance(h: string) {
  const [r, g, b] = parseHex(h).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

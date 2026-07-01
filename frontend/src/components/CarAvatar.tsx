import { CarSilhouette } from "./CarSilhouette";

/**
 * Визуальное представление машины:
 * 1) превью (thumb_url) или фото (photo_url)
 * 2) иначе — SVG-силуэт, окрашенный в цвет авто
 */
export function CarAvatar({
  photoUrl,
  thumbUrl,
  color,
  size = 56,
  rounded = 14,
}: {
  photoUrl?: string | null;
  thumbUrl?: string | null;
  color?: string | null;
  size?: number;
  rounded?: number;
}) {
  const src = thumbUrl || photoUrl;
  if (src) {
    return (
      <div
        className="overflow-hidden border border-bg-line shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  return (
    <div
      className="flex items-center justify-center bg-white/[0.04] border border-bg-line shrink-0"
      style={{ width: size, height: size, borderRadius: rounded }}
    >
      <CarSilhouette color={color} className="block" />
    </div>
  );
}

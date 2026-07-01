"""Лого: фото GLS (gls.webp) как фон + крупная золотая монограмма «М» по центру,
органично интегрированная (виньетка, градиент, тень, блик). PWA-иконки в public/."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "gls.webp"
OUT = ROOT / "public"
OUT.mkdir(exist_ok=True)

# Кастомная буква М (100-грид, по часовой), гранёные верхние углы, острый центр.
M_PTS = [
    (0, 100), (0, 8), (8, 0), (24, 0), (50, 54), (76, 0), (92, 0),
    (100, 8), (100, 100), (79, 100), (79, 36), (57, 84), (43, 84),
    (21, 36), (21, 100),
]


def base_square() -> Image.Image:
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = max(0, (h - side) // 2)
    im = im.crop((left, top, left + side, top + side))
    # премиальная тон-коррекция: контраст ↑, насыщенность ↓ чуть, темнее
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Color(im).enhance(0.92)
    im = ImageEnhance.Brightness(im).enhance(0.9)
    return im


def gold_gradient(size: int) -> Image.Image:
    top, bot = (247, 222, 162), (200, 156, 76)
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        px_row = (
            int(top[0] + (bot[0] - top[0]) * t),
            int(top[1] + (bot[1] - top[1]) * t),
            int(top[2] + (bot[2] - top[2]) * t),
        )
        for x in range(size):
            px[x, y] = px_row
    return img


def m_polygon(S: int, cx: float, cy: float, w: float, h: float):
    """Точки М в пикселях: центр (cx,cy), габариты w×h."""
    return [(cx - w / 2 + mx / 100 * w, cy - h / 2 + my / 100 * h) for mx, my in M_PTS]


def make_icon(size: int) -> Image.Image:
    S = size
    base = base_square().resize((S, S), Image.LANCZOS).convert("RGB")

    # --- виньетка: затемняем края ---
    dark = ImageEnhance.Brightness(base).enhance(0.5)
    vig = Image.new("L", (S, S), 0)
    dv = ImageDraw.Draw(vig)
    dv.ellipse([-S * 0.12, -S * 0.12, S * 1.12, S * 1.12], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(S * 0.12))
    base = Image.composite(base, dark, vig).convert("RGBA")

    # --- нижний градиент-скрим (для глубины и баланса) ---
    scrim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ps = scrim.load()
    for y in range(S):
        t = y / (S - 1)
        a = 0 if t < 0.5 else int(150 * ((t - 0.5) / 0.5) ** 1.6)
        for x in range(S):
            ps[x, y] = (8, 11, 18, a)
    base = Image.alpha_composite(base, scrim)

    # --- мягкая тёмная подложка под М (чтобы «села» в фон) ---
    seat = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dse = ImageDraw.Draw(seat)
    dse.ellipse([S * 0.20, S * 0.18, S * 0.80, S * 0.86], fill=(6, 9, 15, 120))
    seat = seat.filter(ImageFilter.GaussianBlur(S * 0.09))
    base = Image.alpha_composite(base, seat)

    # --- буква М (супер-сэмплинг 3x) ---
    SS = S * 3
    cx, cy = SS * 0.5, SS * 0.49
    w = h = SS * 0.46
    pts = m_polygon(SS, cx, cy, w, h)

    # мягкая тень для объёма
    shadow = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon(
        [(x, y + SS * 0.018) for x, y in pts], fill=(0, 0, 0, 160)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(SS * 0.016))

    # М золотым градиентом + тонкий тёмно-золотой контур
    mmask = Image.new("L", (SS, SS), 0)
    ImageDraw.Draw(mmask).polygon(pts, fill=255)
    gold = gold_gradient(SS).convert("RGBA")
    mlayer = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    mlayer.paste(gold, (0, 0), mmask)
    ImageDraw.Draw(mlayer).line(
        pts + [pts[0]], fill=(120, 88, 30, 230), width=max(2, int(SS * 0.004)), joint="curve"
    )

    overlay = Image.alpha_composite(shadow, mlayer).resize((S, S), Image.LANCZOS)
    out = Image.alpha_composite(base, overlay).convert("RGB")
    return out


def main() -> None:
    for size, name in [
        (1024, "icon-1024.png"),
        (512, "icon-512.png"),
        (192, "icon-192.png"),
        (180, "apple-touch-icon.png"),
        (32, "favicon-32.png"),
    ]:
        make_icon(size).save(OUT / name, optimize=True)
        print(f"  {name}  {size}x{size}")
    print("done →", OUT)


if __name__ == "__main__":
    main()

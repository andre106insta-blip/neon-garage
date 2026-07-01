"""Обработка фото: пережатие полного снимка и генерация лёгкого превью.

Фото хранятся как data-URL (data:image/...;base64,...). Полное фото может быть
тяжёлым (сотни КБ), поэтому:
- recompress() — ужимает полный снимок до разумного размера;
- make_thumb() — делает маленькое квадратное превью ~5 КБ для списков/аватарок.
"""
import base64
import io
import logging

from PIL import Image

log = logging.getLogger(__name__)


def _decode(data_url: str | None) -> Image.Image | None:
    if not data_url or not data_url.startswith("data:") or "," not in data_url:
        return None
    try:
        b64 = data_url.split(",", 1)[1]
        raw = base64.b64decode(b64)
        img = Image.open(io.BytesIO(raw))
        return img.convert("RGB")
    except Exception:
        log.warning("failed to decode photo data-url")
        return None


def _encode(img: Image.Image, quality: int) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def recompress(data_url: str | None, max_side: int = 1100, quality: int = 80) -> str | None:
    """Ужать полный снимок. Не data-URL (внешняя ссылка) возвращаем как есть."""
    if not data_url:
        return data_url
    img = _decode(data_url)
    if img is None:
        return data_url
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return _encode(img, quality)


def make_thumb(data_url: str | None, size: int = 160, quality: int = 62) -> str | None:
    """Квадратное превью (cover-crop) ~5 КБ для списков и аватарок."""
    img = _decode(data_url)
    if img is None:
        return None
    w, h = img.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    img = img.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)
    return _encode(img, quality)

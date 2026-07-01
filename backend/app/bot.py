import logging

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from .config import settings

log = logging.getLogger(__name__)


def make_bot() -> Bot:
    return Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


def _is_allowed(user_id: int | None) -> bool:
    ids = settings.admin_ids
    if not ids:
        return True  # если список пуст — открытый доступ (только для локалки)
    return user_id in ids


def make_dispatcher() -> Dispatcher:
    dp = Dispatcher()

    @dp.message(CommandStart())
    async def on_start(message: Message) -> None:
        if not message.from_user or not _is_allowed(message.from_user.id):
            await message.answer("⛔ Доступ ограничен.")
            return

        name = message.from_user.first_name or "босс"
        webapp = WebAppInfo(url=settings.WEBAPP_URL)
        kb_reply = ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text="💼 Открыть личный кабинет", web_app=webapp)]],
            resize_keyboard=True,
        )
        kb_inline = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="🚀 Открыть личный кабинет", web_app=webapp)]
            ]
        )
        await message.answer(
            f"<b>{name}, привет 👋</b>\n\n"
            "Я твой личный <b>бухгалтер по машинам</b> ⚡️\n"
            "— веду учёт каждой авто: покупка, расходы, продажа\n"
            "— считаю прибыль (включая режимы «на двоих» и «50/50»)\n"
            "— показываю оборот, среднюю и максимальную прибыль\n"
            "— напомню о любой встрече за 24 ч / 12 ч / 2 ч\n\n"
            "Жми кнопку ниже — открою твой личный кабинет 👇",
            reply_markup=kb_reply,
        )
        await message.answer("Или открой здесь:", reply_markup=kb_inline)

    @dp.message(F.text == "/stats")
    async def on_stats(message: Message) -> None:
        if not message.from_user or not _is_allowed(message.from_user.id):
            return

        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from .db import SessionLocal
        from .finance import compute_car_finance
        from .models import Car, CarStatus, Ownership

        async with SessionLocal() as s:
            cars = (
                (await s.execute(select(Car).options(selectinload(Car.expenses))))
                .scalars()
                .all()
            )
        if not cars:
            await message.answer("Машин пока нет. Добавь первую в приложении!")
            return
        sold = [c for c in cars if c.status == CarStatus.sold.value and c.sale_price is not None]
        profits_my = [compute_car_finance(c)["profit_my"] or 0.0 for c in sold]
        turnover = sum(c.sale_price or 0.0 for c in sold)
        profit_total = sum(profits_my)
        profit_avg = profit_total / len(profits_my) if profits_my else 0.0
        profit_max = max(profits_my) if profits_my else 0.0

        def fmt(n: float) -> str:
            return f"{int(round(n)):,}".replace(",", " ")

        labels = {
            Ownership.solo.value: "🔹 Соло",
            Ownership.co_buyer.value: "🤝 На двоих (его деньги)",
            Ownership.half.value: "🧩 50/50",
        }
        per_type = []
        for own_value, lbl in labels.items():
            mine = [c for c in cars if (c.ownership or Ownership.solo.value) == own_value]
            mine_sold = [c for c in mine if c in sold]
            if not mine:
                continue
            p = sum(compute_car_finance(c)["profit_my"] or 0.0 for c in mine_sold)
            per_type.append(
                f"{lbl}: <b>{len(mine)}</b> · продано <b>{len(mine_sold)}</b> · прибыль <b>{fmt(p)}</b>"
            )

        text = (
            "<b>📊 Сводка</b>\n\n"
            f"Всего авто: <b>{len(cars)}</b>\n"
            f"В работе: <b>{sum(1 for c in cars if c.status == CarStatus.in_work.value)}</b>\n"
            f"Продано: <b>{len(sold)}</b>\n\n"
            f"Оборот: <b>{fmt(turnover)}</b>\n"
            f"Моя прибыль: <b>{fmt(profit_total)}</b>\n"
            f"Средняя: <b>{fmt(profit_avg)}</b> · Макс: <b>{fmt(profit_max)}</b>"
        )
        if per_type:
            text += "\n\n<b>По типам:</b>\n" + "\n".join(per_type)
        await message.answer(text)

    return dp


async def broadcast(bot: Bot, text: str) -> None:
    """Шлём уведомление всем admin-ам."""
    for uid in settings.admin_ids:
        try:
            await bot.send_message(uid, text)
        except Exception:
            log.exception("failed to send notification to %s", uid)

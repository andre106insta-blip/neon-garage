import logging
from datetime import datetime, timedelta

from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .bot import broadcast
from .db import SessionLocal
from .models import Plan

log = logging.getLogger(__name__)


def _fmt_dt(dt: datetime) -> str:
    return dt.strftime("%d.%m.%Y %H:%M")


def _fmt_plan(plan: Plan, label: str) -> str:
    car = plan.car
    car_name = f"{car.brand} {car.model}"
    if car.year:
        car_name += f" ({car.year})"
    parts = [
        f"⏰ <b>{label}</b>",
        "",
        f"🏎 {car_name}",
        f"📌 <b>{plan.title}</b>",
        f"🕒 {_fmt_dt(plan.scheduled_at)}",
    ]
    if plan.location:
        parts.append(f"📍 {plan.location}")
    if plan.description:
        parts.append(f"\n{plan.description}")
    return "\n".join(parts)


async def _scan_and_notify(bot: Bot) -> None:
    now = datetime.utcnow()
    windows = (
        (24 * 60, "notified_24h", "За 24 часа до плана"),
        (12 * 60, "notified_12h", "За 12 часов до плана"),
        (2 * 60, "notified_2h", "Через 2 часа"),
    )

    async with SessionLocal() as session:
        stmt = (
            select(Plan)
            .options(selectinload(Plan.car))
            .where(Plan.done == 0, Plan.scheduled_at > now)
        )
        plans = (await session.execute(stmt)).scalars().all()

        for plan in plans:
            delta = plan.scheduled_at - now
            for minutes, flag, label in windows:
                if getattr(plan, flag):
                    continue
                # уведомить, если до события <= окна И > следующего меньшего окна
                if delta <= timedelta(minutes=minutes):
                    try:
                        await broadcast(bot, _fmt_plan(plan, label))
                        setattr(plan, flag, 1)
                    except Exception:
                        log.exception("notify failed for plan %s", plan.id)
        await session.commit()


def start_scheduler(bot: Bot) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_scan_and_notify, "interval", minutes=1, args=[bot], next_run_time=datetime.utcnow())
    scheduler.start()
    return scheduler

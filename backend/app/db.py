from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

DATABASE_URL = f"sqlite+aiosqlite:///{settings.DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    from sqlalchemy import text

    from . import models  # noqa: F401  (register tables)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # лёгкие миграции для уже существующих БД
        cols = await conn.execute(text("PRAGMA table_info(cars)"))
        existing_car = {row[1] for row in cols.fetchall()}
        if "ownership" not in existing_car:
            await conn.execute(text("ALTER TABLE cars ADD COLUMN ownership VARCHAR(16) DEFAULT 'solo'"))
        if "partner_name" not in existing_car:
            await conn.execute(text("ALTER TABLE cars ADD COLUMN partner_name VARCHAR(128)"))
        if "purchase_paid_by_partner" not in existing_car:
            await conn.execute(text("ALTER TABLE cars ADD COLUMN purchase_paid_by_partner FLOAT DEFAULT 0"))
            # для уже существующих 50/50-машин дефолт = половина (старая логика)
            await conn.execute(
                text(
                    "UPDATE cars SET purchase_paid_by_partner = purchase_price / 2.0 "
                    "WHERE ownership = 'half' AND (purchase_paid_by_partner IS NULL OR purchase_paid_by_partner = 0)"
                )
            )

        if "thumb_url" not in existing_car:
            await conn.execute(text("ALTER TABLE cars ADD COLUMN thumb_url TEXT"))

        cols_exp = await conn.execute(text("PRAGMA table_info(expenses)"))
        existing_exp = {row[1] for row in cols_exp.fetchall()}
        if "paid_by" not in existing_exp:
            await conn.execute(text("ALTER TABLE expenses ADD COLUMN paid_by VARCHAR(16) DEFAULT 'me'"))


async def backfill_photos() -> None:
    """Один раз: пережать тяжёлые фото и сгенерировать превью для старых записей."""
    from sqlalchemy import select

    from .models import Car
    from .photos import make_thumb, recompress

    async with SessionLocal() as session:
        cars = (await session.execute(select(Car))).scalars().all()
        changed = 0
        for car in cars:
            if car.photo_url and not car.thumb_url:
                car.thumb_url = make_thumb(car.photo_url)
                car.photo_url = recompress(car.photo_url)
                changed += 1
        if changed:
            await session.commit()

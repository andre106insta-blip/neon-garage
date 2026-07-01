from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class CarStatus(str, Enum):
    in_work = "in_work"
    sold = "sold"
    archived = "archived"


class Ownership(str, Enum):
    solo = "solo"            # один владелец — 100% вложено / 100% прибыли
    co_buyer = "co_buyer"    # на двоих, но куплено за его деньги: 100% вложено / 50% прибыли
    half = "half"            # 50/50: 50% вложено / 50% прибыли


class Car(Base):
    __tablename__ = "cars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brand: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(64))
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vin: Mapped[str | None] = mapped_column(String(32), nullable=True)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Хранит data-URL фото или внешний URL — поэтому длина не ограничена
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Лёгкое квадратное превью (~5 КБ) для списков/аватарок
    thumb_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    purchase_price: Mapped[float] = mapped_column(Float, default=0.0)
    purchase_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Только для 50/50: сколько из цены покупки внёс партнёр (остальное — мои деньги)
    purchase_paid_by_partner: Mapped[float] = mapped_column(Float, default=0.0)

    sale_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    sale_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[str] = mapped_column(String(16), default=CarStatus.in_work.value)
    ownership: Mapped[str] = mapped_column(String(16), default=Ownership.solo.value)
    partner_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    expenses: Mapped[list["Expense"]] = relationship(
        back_populates="car", cascade="all, delete-orphan"
    )
    plans: Mapped[list["Plan"]] = relationship(
        back_populates="car", cascade="all, delete-orphan"
    )


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id", ondelete="CASCADE"))
    amount: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(64))  # запчасти, работа, доставка, оформление, прочее
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Только актуально для 50/50: кто оплатил этот расход — "me" или "partner"
    paid_by: Mapped[str] = mapped_column(String(16), default="me")
    date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    car: Mapped[Car] = relationship(back_populates="expenses")


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)

    notified_24h: Mapped[int] = mapped_column(Integer, default=0)
    notified_12h: Mapped[int] = mapped_column(Integer, default=0)
    notified_2h: Mapped[int] = mapped_column(Integer, default=0)

    done: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    car: Mapped[Car] = relationship(back_populates="plans")

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseBase(BaseModel):
    amount: float
    category: str = Field(default="прочее")
    description: str | None = None
    date: datetime | None = None
    paid_by: Literal["me", "partner"] = "me"


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseOut(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    car_id: int
    date: datetime


class PlanBase(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    scheduled_at: datetime


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    scheduled_at: datetime | None = None
    done: bool | None = None


class PlanOut(PlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    car_id: int
    done: int


class CarBase(BaseModel):
    brand: str
    model: str
    year: int | None = None
    vin: str | None = None
    color: str | None = None
    mileage: int | None = None
    photo_url: str | None = None
    purchase_price: float = 0.0
    purchase_date: datetime | None = None
    ownership: Literal["solo", "co_buyer", "half"] = "solo"
    partner_name: str | None = None
    purchase_paid_by_partner: float = 0.0
    notes: str | None = None


class CarCreate(CarBase):
    # Можно сразу создать «исторически» проданную машину одним запросом —
    # удобно при импорте задним числом для статистики.
    status: Literal["in_work", "sold", "archived"] | None = None
    sale_price: float | None = None
    sale_date: datetime | None = None


class CarUpdate(BaseModel):
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    vin: str | None = None
    color: str | None = None
    mileage: int | None = None
    photo_url: str | None = None
    purchase_price: float | None = None
    purchase_date: datetime | None = None
    sale_price: float | None = None
    sale_date: datetime | None = None
    status: Literal["in_work", "sold", "archived"] | None = None
    ownership: Literal["solo", "co_buyer", "half"] | None = None
    partner_name: str | None = None
    purchase_paid_by_partner: float | None = None
    notes: str | None = None


class PartySettlement(BaseModel):
    name: str
    purchase: float = 0.0
    expenses: float = 0.0
    invested: float = 0.0
    profit: float = 0.0
    take: float = 0.0  # сколько забирает из суммы продажи


class SettlementOut(BaseModel):
    sale_price: float
    invested_full: float
    net_profit: float
    me: PartySettlement
    partner: PartySettlement


class CarOut(CarBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    thumb_url: str | None = None
    status: str
    sale_price: float | None
    sale_date: datetime | None
    expenses_total: float = 0.0      # полная сумма расходов по машине
    invested_full: float = 0.0       # purchase + expenses (полная сумма в машине)
    invested_my: float = 0.0         # доля заказчика во вложениях
    profit_full: float | None = None # полная прибыль (sale - invested_full)
    profit_my: float | None = None   # доля прибыли заказчика
    share_invest: float = 1.0        # 1.0 / 1.0 / 0.5
    share_profit: float = 1.0        # 1.0 / 0.5 / 0.5
    settlement: SettlementOut | None = None  # расчёт между владельцами (если продано и не solo)
    created_at: datetime


class OwnershipBreakdown(BaseModel):
    count: int = 0
    sold: int = 0
    invested_my: float = 0.0
    profit_my: float = 0.0


class StatsOut(BaseModel):
    cars_total: int
    cars_in_work: int
    cars_sold: int
    turnover: float           # сумма purchase_price ВСЕХ авто (сколько всего денег прошло)
    invested_total: float     # моя доля инвестиций в авто статуса in_work (сколько сейчас «в работе»)
    profit_total: float       # моя прибыль с проданных за всё время
    profit_month: float       # моя прибыль с проданных в этом календарном месяце (UTC)
    profit_avg: float
    profit_max: float
    profit_min: float
    best_car_id: int | None
    by_solo: OwnershipBreakdown
    by_co_buyer: OwnershipBreakdown
    by_half: OwnershipBreakdown

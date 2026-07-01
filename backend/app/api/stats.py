from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..finance import compute_car_finance
from ..models import Car, CarStatus, Ownership
from ..schemas import OwnershipBreakdown, StatsOut

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _same_month(a: datetime, b: datetime) -> bool:
    return a.year == b.year and a.month == b.month


@router.get("", response_model=StatsOut)
async def get_stats(session: AsyncSession = Depends(get_session)):
    cars = (
        (await session.execute(select(Car).options(selectinload(Car.expenses))))
        .scalars()
        .all()
    )

    sold = [c for c in cars if c.status == CarStatus.sold.value and c.sale_price is not None]
    in_work_cars = [c for c in cars if c.status == CarStatus.in_work.value]
    in_work = len(in_work_cars)

    # ОБОРОТ — сколько всего денег прошло через покупки авто (все авто, все статусы)
    turnover = sum(c.purchase_price or 0.0 for c in cars)

    # ВЛОЖЕНО — моя доля инвестиций в авто, которые сейчас в работе
    invested_in_work = sum(compute_car_finance(c)["invested_my"] for c in in_work_cars)

    # Прибыль
    profits_my: list[tuple[int, float]] = []
    now = datetime.utcnow()
    profit_month_total = 0.0

    breakdown: dict[str, OwnershipBreakdown] = {
        Ownership.solo.value: OwnershipBreakdown(),
        Ownership.co_buyer.value: OwnershipBreakdown(),
        Ownership.half.value: OwnershipBreakdown(),
    }

    for c in cars:
        own = c.ownership or Ownership.solo.value
        b = breakdown.get(own) or breakdown[Ownership.solo.value]
        fin = compute_car_finance(c)

        b.count += 1
        b.invested_my += fin["invested_my"]

        if c in sold:
            profit_my = fin["profit_my"] or 0.0
            profits_my.append((c.id, profit_my))
            b.sold += 1
            b.profit_my += profit_my
            if c.sale_date and _same_month(c.sale_date, now):
                profit_month_total += profit_my

    profit_total = sum(p for _, p in profits_my)
    profit_avg = profit_total / len(profits_my) if profits_my else 0.0
    if profits_my:
        best_id, profit_max = max(profits_my, key=lambda x: x[1])
        _, profit_min = min(profits_my, key=lambda x: x[1])
    else:
        best_id, profit_max, profit_min = None, 0.0, 0.0

    return StatsOut(
        cars_total=len(cars),
        cars_in_work=in_work,
        cars_sold=len(sold),
        turnover=turnover,
        invested_total=invested_in_work,
        profit_total=profit_total,
        profit_month=profit_month_total,
        profit_avg=profit_avg,
        profit_max=profit_max,
        profit_min=profit_min,
        best_car_id=best_id,
        by_solo=breakdown[Ownership.solo.value],
        by_co_buyer=breakdown[Ownership.co_buyer.value],
        by_half=breakdown[Ownership.half.value],
    )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Car, Plan
from ..schemas import PlanCreate, PlanOut, PlanUpdate

router = APIRouter(tags=["plans"])


@router.get("/api/cars/{car_id}/plans", response_model=list[PlanOut])
async def list_plans_for_car(car_id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(Plan).where(Plan.car_id == car_id).order_by(Plan.scheduled_at.asc())
    rows = (await session.execute(stmt)).scalars().all()
    return [PlanOut.model_validate(r) for r in rows]


@router.post("/api/cars/{car_id}/plans", response_model=PlanOut)
async def create_plan(
    car_id: int, payload: PlanCreate, session: AsyncSession = Depends(get_session)
):
    car = await session.get(Car, car_id)
    if not car:
        raise HTTPException(404, "Car not found")
    plan = Plan(car_id=car_id, **payload.model_dump())
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return PlanOut.model_validate(plan)


@router.get("/api/plans", response_model=list[PlanOut])
async def list_plans(session: AsyncSession = Depends(get_session)):
    stmt = select(Plan).order_by(Plan.scheduled_at.asc())
    rows = (await session.execute(stmt)).scalars().all()
    return [PlanOut.model_validate(r) for r in rows]


@router.patch("/api/plans/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: int, payload: PlanUpdate, session: AsyncSession = Depends(get_session)):
    plan = await session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    data = payload.model_dump(exclude_unset=True)
    if "done" in data:
        data["done"] = 1 if data["done"] else 0
    if "scheduled_at" in data:
        # сбросить флаги уведомлений если время изменилось
        plan.notified_24h = 0
        plan.notified_12h = 0
        plan.notified_2h = 0
    for k, v in data.items():
        setattr(plan, k, v)
    await session.commit()
    await session.refresh(plan)
    return PlanOut.model_validate(plan)


@router.delete("/api/plans/{plan_id}")
async def delete_plan(plan_id: int, session: AsyncSession = Depends(get_session)):
    plan = await session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    await session.delete(plan)
    await session.commit()
    return {"ok": True}

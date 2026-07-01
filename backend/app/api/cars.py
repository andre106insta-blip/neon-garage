from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db import get_session
from ..finance import compute_car_finance, compute_settlement
from ..models import Car, CarStatus
from ..photos import make_thumb, recompress
from ..schemas import CarCreate, CarOut, CarUpdate

router = APIRouter(prefix="/api/cars", tags=["cars"])


def _serialize(car: Car, light: bool = False) -> CarOut:
    data = CarOut.model_validate(car).model_dump()
    data.update(compute_car_finance(car))
    data["settlement"] = compute_settlement(car)
    if light:
        # в списках не отдаём тяжёлое полное фото — только лёгкое превью
        data["photo_url"] = None
        data["settlement"] = None
    return CarOut(**data)


@router.get("", response_model=list[CarOut])
async def list_cars(
    status: str | None = None,
    ownership: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Car).options(selectinload(Car.expenses)).order_by(Car.created_at.desc())
    if status:
        stmt = stmt.where(Car.status == status)
    if ownership:
        stmt = stmt.where(Car.ownership == ownership)
    cars = (await session.execute(stmt)).scalars().all()
    return [_serialize(c, light=True) for c in cars]


@router.post("", response_model=CarOut)
async def create_car(payload: CarCreate, session: AsyncSession = Depends(get_session)):
    data = payload.model_dump(exclude_none=False)
    # status может прийти как None — нормализуем
    if not data.get("status"):
        data["status"] = CarStatus.in_work.value
    # пережать фото и сделать превью
    if data.get("photo_url"):
        data["thumb_url"] = make_thumb(data["photo_url"])
        data["photo_url"] = recompress(data["photo_url"])
    car = Car(**data)
    session.add(car)
    await session.commit()
    await session.refresh(car, attribute_names=["expenses"])
    return _serialize(car)


@router.get("/{car_id}", response_model=CarOut)
async def get_car(car_id: int, session: AsyncSession = Depends(get_session)):
    car = await session.get(
        Car, car_id, options=[selectinload(Car.expenses), selectinload(Car.plans)]
    )
    if not car:
        raise HTTPException(404, "Car not found")
    return _serialize(car)


@router.patch("/{car_id}", response_model=CarOut)
async def update_car(car_id: int, payload: CarUpdate, session: AsyncSession = Depends(get_session)):
    car = await session.get(Car, car_id, options=[selectinload(Car.expenses)])
    if not car:
        raise HTTPException(404, "Car not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == CarStatus.sold.value and not data.get("sale_date") and not car.sale_date:
        data["sale_date"] = datetime.utcnow()
    # если меняют фото — пережать и пересчитать превью
    if "photo_url" in data:
        if data["photo_url"]:
            data["thumb_url"] = make_thumb(data["photo_url"])
            data["photo_url"] = recompress(data["photo_url"])
        else:
            data["thumb_url"] = None
    for k, v in data.items():
        setattr(car, k, v)
    await session.commit()
    await session.refresh(car, attribute_names=["expenses"])
    return _serialize(car)


@router.delete("/{car_id}")
async def delete_car(car_id: int, session: AsyncSession = Depends(get_session)):
    car = await session.get(Car, car_id)
    if not car:
        raise HTTPException(404, "Car not found")
    await session.delete(car)
    await session.commit()
    return {"ok": True}

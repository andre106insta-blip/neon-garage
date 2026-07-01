from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models import Car, Expense
from ..schemas import ExpenseCreate, ExpenseOut

router = APIRouter(prefix="/api/cars/{car_id}/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
async def list_expenses(car_id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(Expense).where(Expense.car_id == car_id).order_by(Expense.date.desc())
    rows = (await session.execute(stmt)).scalars().all()
    return [ExpenseOut.model_validate(r) for r in rows]


@router.post("", response_model=ExpenseOut)
async def create_expense(
    car_id: int, payload: ExpenseCreate, session: AsyncSession = Depends(get_session)
):
    car = await session.get(Car, car_id)
    if not car:
        raise HTTPException(404, "Car not found")
    data = payload.model_dump()
    if not data.get("date"):
        data["date"] = datetime.utcnow()
    expense = Expense(car_id=car_id, **data)
    session.add(expense)
    await session.commit()
    await session.refresh(expense)
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}")
async def delete_expense(car_id: int, expense_id: int, session: AsyncSession = Depends(get_session)):
    expense = await session.get(Expense, expense_id)
    if not expense or expense.car_id != car_id:
        raise HTTPException(404, "Expense not found")
    await session.delete(expense)
    await session.commit()
    return {"ok": True}

"""Финансовая логика: доли пользователя и расчёт между совладельцами."""
from .models import Car, Ownership


def shares(ownership: str) -> tuple[float, float]:
    """Вернуть (share_invest, share_profit) — формальные доли пользователя.

    - solo:     100% / 100%
    - co_buyer: 100% вложено / 50% прибыли (партнёр без денег, но забирает половину прибыли)
    - half:     50% / 50% (детальный учёт «кто что вложил» поверх — см. ниже)
    """
    if ownership == Ownership.co_buyer.value:
        return 1.0, 0.5
    if ownership == Ownership.half.value:
        return 0.5, 0.5
    return 1.0, 1.0


def _split_half(car: Car) -> dict:
    """Раздельный учёт для 50/50. Возвращает суммы каждого участника."""
    purchase = car.purchase_price or 0.0
    partner_purchase = car.purchase_paid_by_partner or 0.0
    my_purchase = max(0.0, purchase - partner_purchase)

    expenses = list(car.expenses or [])
    my_expenses = sum(e.amount for e in expenses if (e.paid_by or "me") != "partner")
    partner_expenses = sum(e.amount for e in expenses if (e.paid_by or "me") == "partner")

    return {
        "my_purchase": my_purchase,
        "partner_purchase": partner_purchase,
        "my_expenses": my_expenses,
        "partner_expenses": partner_expenses,
        "my_invested": my_purchase + my_expenses,
        "partner_invested": partner_purchase + partner_expenses,
    }


def compute_car_finance(car: Car) -> dict:
    """Сводные финансы машины с точки зрения заказчика."""
    own = car.ownership or Ownership.solo.value
    expenses_total = sum(e.amount for e in (car.expenses or []))
    invested_full = (car.purchase_price or 0.0) + expenses_total

    if own == Ownership.half.value:
        sp = _split_half(car)
        invested_my = sp["my_invested"]
        share_inv = invested_my / invested_full if invested_full else 0.5
        share_pf = 0.5
    else:
        share_inv, share_pf = shares(own)
        invested_my = invested_full * share_inv

    profit_full: float | None = None
    profit_my: float | None = None
    if car.sale_price is not None:
        profit_full = car.sale_price - invested_full
        profit_my = profit_full * share_pf

    return {
        "expenses_total": expenses_total,
        "invested_full": invested_full,
        "invested_my": invested_my,
        "profit_full": profit_full,
        "profit_my": profit_my,
        "share_invest": share_inv,
        "share_profit": share_pf,
    }


def compute_settlement(car: Car) -> dict | None:
    """Расчёт между владельцами при продаже. None для solo и непроданных машин."""
    if car.sale_price is None:
        return None
    own = car.ownership or Ownership.solo.value
    if own == Ownership.solo.value:
        return None

    partner_name = car.partner_name or "Партнёр"
    expenses_total = sum(e.amount for e in (car.expenses or []))
    invested_full = (car.purchase_price or 0.0) + expenses_total
    net_profit = (car.sale_price or 0.0) - invested_full

    if own == Ownership.co_buyer.value:
        # Я платил всё → возвращаю свои вложения + 50% прибыли. Партнёр — только 50% прибыли.
        my_share = net_profit * 0.5
        partner_share = net_profit * 0.5
        return {
            "sale_price": car.sale_price,
            "invested_full": invested_full,
            "net_profit": net_profit,
            "me": {
                "name": "Я",
                "purchase": car.purchase_price or 0.0,
                "expenses": expenses_total,
                "invested": invested_full,
                "profit": my_share,
                "take": invested_full + my_share,
            },
            "partner": {
                "name": partner_name,
                "purchase": 0.0,
                "expenses": 0.0,
                "invested": 0.0,
                "profit": partner_share,
                "take": partner_share,
            },
        }

    # half (50/50): прибыль пополам, каждый забирает свои вложения + половину прибыли
    sp = _split_half(car)
    my_share = net_profit * 0.5
    partner_share = net_profit * 0.5
    return {
        "sale_price": car.sale_price,
        "invested_full": invested_full,
        "net_profit": net_profit,
        "me": {
            "name": "Я",
            "purchase": sp["my_purchase"],
            "expenses": sp["my_expenses"],
            "invested": sp["my_invested"],
            "profit": my_share,
            "take": sp["my_invested"] + my_share,
        },
        "partner": {
            "name": partner_name,
            "purchase": sp["partner_purchase"],
            "expenses": sp["partner_expenses"],
            "invested": sp["partner_invested"],
            "profit": partner_share,
            "take": sp["partner_invested"] + partner_share,
        },
    }

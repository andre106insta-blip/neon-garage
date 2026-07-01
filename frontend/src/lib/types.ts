export type CarStatus = "in_work" | "sold" | "archived";
export type Ownership = "solo" | "co_buyer" | "half";

export interface Car {
  id: number;
  brand: string;
  model: string;
  year?: number | null;
  vin?: string | null;
  color?: string | null;
  mileage?: number | null;
  photo_url?: string | null;
  thumb_url?: string | null;
  purchase_price: number;
  purchase_date?: string | null;
  sale_price?: number | null;
  sale_date?: string | null;
  status: CarStatus;
  ownership: Ownership;
  partner_name?: string | null;
  purchase_paid_by_partner: number;  // только для 50/50
  notes?: string | null;
  expenses_total: number;
  invested_full: number;
  invested_my: number;
  profit_full: number | null;
  profit_my: number | null;
  share_invest: number;
  share_profit: number;
  settlement?: Settlement | null;
  created_at: string;
}

export interface PartySettlement {
  name: string;
  purchase: number;
  expenses: number;
  invested: number;
  profit: number;
  take: number;
}

export interface Settlement {
  sale_price: number;
  invested_full: number;
  net_profit: number;
  me: PartySettlement;
  partner: PartySettlement;
}

export interface Expense {
  id: number;
  car_id: number;
  amount: number;
  category: string;
  description?: string | null;
  paid_by: "me" | "partner";
  date: string;
}

export interface Plan {
  id: number;
  car_id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  scheduled_at: string;
  done: number;
}

export interface OwnershipBreakdown {
  count: number;
  sold: number;
  invested_my: number;
  profit_my: number;
}

export interface Stats {
  cars_total: number;
  cars_in_work: number;
  cars_sold: number;
  turnover: number;          // сумма purchase_price всех авто
  invested_total: number;    // моя доля в авто статуса in_work
  profit_total: number;      // прибыль за всё время
  profit_month: number;      // прибыль с проданных в текущем месяце
  profit_avg: number;
  profit_max: number;
  profit_min: number;
  best_car_id: number | null;
  by_solo: OwnershipBreakdown;
  by_co_buyer: OwnershipBreakdown;
  by_half: OwnershipBreakdown;
}

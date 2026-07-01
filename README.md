# Neon Garage 🏎

Тёмная неоновая Mini App + Telegram-бот для учёта авто перекупа.

- 📊 Сводная статистика: оборот, прибыль (общая / средняя / макс), сколько в работе / продано.
- 🏎 Карточка каждой машины: цена покупки, расходы по категориям, ожидаемая / фактическая цена продажи, прибыль.
- 🗓 Планы по авто (встречи, диагностика, документы) с автоматическими напоминаниями в Telegram **за 24 ч / 12 ч / 2 ч**.
- 🌌 Тёмная неоновая тема, заточенная под Telegram Mini Apps.

Стек: **FastAPI + aiogram 3 + SQLite + APScheduler** на бэке, **React + Vite + TS + Tailwind** на фронте.

---

## Структура

```
MAT/
├── backend/        # FastAPI + бот + шедулер (один процесс)
│   ├── app/
│   │   ├── api/    # эндпойнты cars/expenses/plans/stats
│   │   ├── bot.py
│   │   ├── scheduler.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── db.py
│   │   ├── config.py
│   │   └── main.py
│   ├── run.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/       # React + Vite + Tailwind
    ├── src/
    │   ├── pages/      # Dashboard, Cars, CarDetail, Plans
    │   ├── components/
    │   ├── lib/
    │   └── styles/
    └── package.json
```

---

## Запуск (dev)

### 1. Создать бота

1. Открой [@BotFather](https://t.me/BotFather) → `/newbot` → получи **BOT_TOKEN**.
2. Свой Telegram ID можно узнать у [@userinfobot](https://t.me/userinfobot) → это **OWNER_TG_ID**.

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# отредактируй .env: BOT_TOKEN, OWNER_TG_ID, WEBAPP_URL
python run.py
```

Бэкенд поднимет:
- REST API на `http://localhost:8000`
- Бота (long-polling)
- Шедулер напоминаний (каждую минуту сканирует планы)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Vite проксирует `/api/*` → `http://localhost:8000`, так что фронт сразу работает с бэком.

### 4. Открыть Mini App в Telegram

Для разработки локальный фронт нужно выставить наружу через HTTPS-туннель — Telegram требует HTTPS для Web App.

Варианты:
- `ngrok http 5173` → возьми HTTPS URL и подставь в `.env` → `WEBAPP_URL=`
- `cloudflared tunnel --url http://localhost:5173`

Затем напиши боту `/start` — он покажет кнопку, которая откроет приложение.

---

## Команды бота

- `/start` — открыть приложение
- `/stats` — краткая сводка прямо в чате

---

## Прод

Минимально:
- `npm run build` во фронте → `frontend/dist` залить на любой статик-хостинг (Cloudflare Pages / Vercel / Netlify) и указать его URL в `WEBAPP_URL`.
- Бэкенд (`python run.py`) держать на VPS под `systemd` или в Docker, прокинуть `:8000` через nginx с HTTPS.
- Сменить в `frontend/.env`: `VITE_API_BASE=https://api.your-domain` (либо проксировать через тот же домен).

База — один файл `backend/data.db`. Бэкап = `cp data.db data.db.bak`.

"""Entry point: запускает FastAPI + бота + шедулер в одном процессе."""
import asyncio
import logging

import uvicorn

from app.bot import make_bot, make_dispatcher
from app.config import settings
from app.db import init_db
from app.main import app
from app.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("run")


async def main() -> None:
    await init_db()

    bot = make_bot() if settings.BOT_TOKEN else None
    dp = make_dispatcher() if bot else None
    scheduler = start_scheduler(bot) if bot else None

    config = uvicorn.Config(
        app, host=settings.API_HOST, port=settings.API_PORT, log_level="info"
    )
    server = uvicorn.Server(config)

    tasks: list[asyncio.Task] = [asyncio.create_task(server.serve(), name="api")]
    if bot and dp:
        log.info("Starting bot polling…")
        tasks.append(asyncio.create_task(dp.start_polling(bot), name="bot"))
    else:
        log.warning("BOT_TOKEN не задан — бот не запущен, только API.")

    try:
        await asyncio.gather(*tasks)
    finally:
        if scheduler:
            scheduler.shutdown(wait=False)
        if bot:
            await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

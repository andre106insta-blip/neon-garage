FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# По умолчанию данные кладём на смонтированный том /data, чтобы переживали редеплой.
ENV DB_PATH=/data/data.db
ENV API_HOST=0.0.0.0
# Railway / Fly / Render передают PORT — uvicorn в run.py использует settings.API_PORT,
# поэтому пробрасываем PORT → API_PORT через shell.
EXPOSE 8000

CMD ["sh", "-c", "mkdir -p /data && API_PORT=${PORT:-8000} python run.py"]

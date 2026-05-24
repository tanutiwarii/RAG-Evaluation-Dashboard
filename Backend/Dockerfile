FROM python:3.11-slim

WORKDIR /app

# Install system deps for psycopg2 and sentence-transformers
RUN apt-get update && apt-get install -y \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_DEFAULT_TIMEOUT=100
RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir --retries 10 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
dev:
	uvicorn app.main:app --reload --port 8000 --app-dir backend

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v

test:
	pytest backend/tests/ -v

migrate:
	cd backend && alembic upgrade head

eval:
	python eval/run_eval.py

install:
	pip install -r backend/requirements.txt

lint:
	ruff check backend/

format:
	ruff format backend/

Frontend-install:
	cd Frontend && npm install

Frontend-dev:
	cd Frontend && npm run dev
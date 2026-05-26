dev:
	uvicorn app.main:app --reload --port 8000 --app-dir Backend

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v

test:
	pytest Backend/tests/ -v

migrate:
	cd Backend && alembic upgrade head

eval:
	python Eval/run_eval.py

install:
	pip install -r Backend/requirements.txt

lint:
	ruff check Backend/

format:
	ruff format Backend/

Frontend-install:
	cd Frontend && npm install

Frontend-dev:
	cd Frontend && npm run dev